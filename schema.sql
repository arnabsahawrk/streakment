-- ============================================================
--  STREAKMENT: schema
--  Keep the streakment alive.
--
--  Personal, single-user app. No accounts, no login: the whole
--  database belongs to the one person running it.
--
--  Run this ONCE, in full, on a brand-new Neon database (SQL
--  editor). Every statement is safe to run again. The app never
--  changes tables by itself: this file is the whole schema.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
--  1. Settings. A single row, guarded by the boolean primary key
--     trick below: `singleton` can only ever be `true`, and a
--     primary key holds one value of it once, so there is exactly
--     one row, always.
-- ------------------------------------------------------------

create table if not exists user_settings (
  singleton        boolean primary key default true check (singleton),
  -- Optional app passcode, encrypted (not hashed) with PASSCODE_KEY so a
  -- forgotten passcode can be emailed back. Null = no passcode.
  passcode_enc     text,
  -- Global email switch. A streakment can also be muted on its own
  -- (streaks.email_enabled). Both must be on for an email to go out.
  email_milestones boolean not null default true,
  -- IANA zone. The app keeps it equal to the device zone so emails
  -- quote the zone the phone is in.
  timezone         text not null default 'UTC',
  -- Passcode throttle: 5 wrong tries lock the passcode screen for 15 minutes.
  failed_unlocks   integer not null default 0,
  locked_until     timestamptz,
  -- "Forgot passcode" email: at most one a minute.
  recover_sent_at  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

insert into user_settings (singleton) values (true) on conflict do nothing;

-- ------------------------------------------------------------
--  2. Streakments. Three layers, one table:
--
--  type = 'challenge' : Accept Challenge. 1 to 365 days (goal_days).
--                       Counts to the goal, then stops. Failed sends it
--                       straight to the archive. Never paused.
--  type = 'legend'    : Become Legend. Exactly 365 days. Counts to 365,
--                       then stops. Failed sends it back to the
--                       beginning, paused until Begin.
--  type = 'infinite'  : Infinite Streakment. Made only by "Archive and
--                       Infinite" on a completed Legend. Counts with no
--                       limit until Stop, then it is frozen for good.
--
--  start_date null = paused (Legend only).
--  Day counts are always worked out from start_date, never stored, so
--  there is no counter to keep in sync and no job needed to make the
--  numbers move. "Completed" is worked out the same way.
-- ------------------------------------------------------------

create table if not exists streaks (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  why_note       text not null,
  type           text not null default 'legend',
  goal_days      integer,
  start_date     timestamptz default now(),
  paused_at      timestamptz,
  max_streak     integer not null default 0,
  fail_count     integer not null default 0,
  renamed        boolean not null default false,
  archived       boolean not null default false,
  archived_at    timestamptz,
  archive_reason text,
  stopped_at     timestamptz,
  infinite_from  uuid references streaks(id) on delete set null,
  email_enabled  boolean not null default true,
  created_at     timestamptz not null default now(),

  constraint name_len   check (char_length(name) between 1 and 80),
  constraint why_len    check (char_length(why_note) between 1 and 800),
  constraint reason_len check (archive_reason is null or char_length(archive_reason) <= 300),

  constraint type_valid check (type in ('legend', 'challenge', 'infinite')),
  -- Keep the explicit "is not null": a challenge with a null goal_days
  -- would make BETWEEN evaluate to unknown, and Postgres lets a CHECK
  -- whose result is unknown pass instead of failing it.
  constraint goal_matches_type check (
    (type = 'challenge' and goal_days is not null and goal_days between 1 and 365) or
    (type in ('legend', 'infinite') and goal_days is null)
  ),
  constraint challenge_never_paused check (type <> 'challenge' or archived or start_date is not null),
  constraint infinite_shape check (
    type <> 'infinite' or
    (archived = false and start_date is not null and paused_at is null and email_enabled = false)
  ),
  constraint stopped_only_infinite check (stopped_at is null or type = 'infinite'),
  constraint infinite_from_only_infinite check (infinite_from is null or type = 'infinite')
);
create index if not exists streaks_archived_idx on streaks(archived);
create index if not exists streaks_infinite_from_idx on streaks(infinite_from) where infinite_from is not null;

-- ------------------------------------------------------------
--  3. Failed history. One row each time a streakment fails after
--     at least a day: run_start and failed_at bound the run that ended.
--     A failed Challenge also gets its one row here.
-- ------------------------------------------------------------

create table if not exists fail_log (
  id             uuid primary key default gen_random_uuid(),
  streak_id      uuid not null references streaks(id) on delete cascade,
  streak_reached integer not null,
  note           text,
  run_start      timestamptz not null,
  failed_at      timestamptz not null default now(),

  constraint fail_note_len check (note is null or char_length(note) <= 300)
);
create index if not exists fail_log_streak_idx on fail_log(streak_id, failed_at desc);

-- ------------------------------------------------------------
--  4. Sent-email ledger. The daily cron is only safe to re-run because
--     of this: one row per (streakment, kind, marker), enforced by a
--     unique index, so a retry or an overlapping run can never send the
--     same email twice.
-- ------------------------------------------------------------

create table if not exists email_log (
  id        uuid primary key default gen_random_uuid(),
  streak_id uuid references streaks(id) on delete cascade,
  kind      text not null,                -- 'created' | 'milestone' | 'challenge_complete'
  -- The day crossed (a Legend's later runs add "-r" and the run number)
  -- or the challenge length.
  marker    text not null,
  sent_at   timestamptz not null default now(),

  constraint email_kind_valid check (kind in ('created', 'milestone', 'challenge_complete'))
);
create unique index if not exists email_log_once_idx
  on email_log(coalesce(streak_id::text, ''), kind, marker);

-- ------------------------------------------------------------
--  5. Biometric unlock (WebAuthn): Touch ID, Face ID, Android
--     fingerprint, Windows Hello. One row per device that has it
--     switched on, so a lost device can be removed on its own.
--     It only ever adds a second way past the passcode; the
--     passcode itself stays and keeps working everywhere.
-- ------------------------------------------------------------

create table if not exists webauthn_credentials (
  id           text primary key,            -- credential ID, base64url
  public_key   bytea not null,              -- COSE-encoded public key
  counter      bigint not null default 0,   -- signature counter (Apple always reports 0)
  label        text not null,               -- e.g. "iPhone (Safari)"
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,

  constraint webauthn_label_len check (char_length(label) between 1 and 60)
);

-- Challenges are single-use and short-lived, so a captured sign-in
-- can never be replayed.
create table if not exists webauthn_challenges (
  challenge  text primary key,              -- base64url
  kind       text not null,
  created_at timestamptz not null default now(),

  constraint webauthn_challenge_kind check (kind in ('register', 'unlock'))
);
create index if not exists webauthn_challenges_age_idx on webauthn_challenges(created_at);
