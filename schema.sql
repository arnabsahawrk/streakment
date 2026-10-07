-- ============================================================
--  STREAKMENT — schema
--  Keep the streakment alive.
--
--  Personal, single-user app. No accounts, no login — the whole
--  database belongs to the one person running it. Run once against
--  a fresh Neon database.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
--  1. Settings. A single row, guarded by the boolean primary key
--     trick below: `singleton` can only ever be `true`, and a
--     primary key can only ever hold one value of it, so there is
--     exactly one row, always.
-- ------------------------------------------------------------

create table if not exists user_settings (
  singleton        boolean primary key default true check (singleton),
  -- Optional app passcode, reversibly encrypted (not hashed) with
  -- PASSCODE_KEY, so a forgotten passcode can be decrypted and
  -- emailed back rather than only ever reset. Null = off.
  passcode_enc     text,
  -- Milestone-email opt-out, global. A streak can also be muted
  -- individually — see streaks.email_enabled below. Both must be
  -- true for that streak's emails to send.
  email_milestones boolean not null default true,
  -- IANA zone, e.g. "Asia/Dhaka". Reserved for deciding which local
  -- day a milestone lands on.
  timezone         text not null default 'UTC',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

insert into user_settings (singleton) values (true) on conflict do nothing;

-- ------------------------------------------------------------
--  2. Streaks.
--
--  type = 'legend'    : open-ended, "Become Legend" in the UI,
--                        goal_days must be null
--  type = 'challenge' : fixed-length, "Accept Challenge" in the UI,
--                        goal_days required (1..365)
--
--  start_date null  = paused (reset, not yet restarted)
--  Current streak is always derived from start_date, never stored,
--  so there is no counter to keep in sync and no cron needed just
--  to make the numbers move.
-- ------------------------------------------------------------

create table if not exists streaks (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  why_note       text not null,
  type           text not null default 'legend',
  goal_days      integer,
  start_date     timestamptz default now(),
  max_streak     integer not null default 0,
  reset_count    integer not null default 0,
  archived       boolean not null default false,
  archived_at    timestamptz,
  archive_reason text,
  -- Per-streak email mute. Global and per-streak both have to be on
  -- for a milestone email to send.
  email_enabled  boolean not null default true,
  created_at     timestamptz not null default now(),

  constraint name_len   check (char_length(name) between 1 and 80),
  constraint why_len    check (char_length(why_note) between 1 and 800),
  constraint reason_len check (archive_reason is null or char_length(archive_reason) <= 300),

  constraint type_valid check (type in ('legend', 'challenge')),
  -- The two shapes are mutually exclusive, enforced here rather
  -- than trusted to the API alone. The explicit `is not null`
  -- matters: without it, a challenge row with a null goal_days makes
  -- the BETWEEN evaluate to unknown, and Postgres passes a CHECK
  -- whose result is unknown rather than failing it - so a goalless
  -- challenge would slip straight through.
  constraint goal_matches_type check (
    (type = 'legend' and goal_days is null) or
    (type = 'challenge' and goal_days is not null and goal_days between 1 and 365)
  )
);
create index if not exists streaks_archived_idx on streaks(archived);

-- ------------------------------------------------------------
--  3. Reset history. run_start + reset_at bound each broken run.
-- ------------------------------------------------------------

create table if not exists reset_log (
  id             uuid primary key default gen_random_uuid(),
  streak_id      uuid not null references streaks(id) on delete cascade,
  streak_reached integer not null,
  note           text,
  run_start      timestamptz not null,
  reset_at       timestamptz not null default now(),

  constraint reset_note_len check (note is null or char_length(note) <= 200)
);
create index if not exists reset_log_streak_idx on reset_log(streak_id, reset_at desc);

-- ------------------------------------------------------------
--  4. Sent-email ledger. The milestone cron is only safe to
--     re-run because of this: one row per (streak, milestone),
--     enforced by a unique index, so a retry or an overlapping
--     run can never send the same congratulation twice.
-- ------------------------------------------------------------

create table if not exists email_log (
  id         uuid primary key default gen_random_uuid(),
  streak_id  uuid references streaks(id) on delete cascade,
  kind       text not null,
  -- The day number crossed (or the challenge length, for challenge_complete).
  marker     text not null,
  sent_at    timestamptz not null default now(),

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
--
--     Already running? Paste just this section into the Neon SQL
--     editor - every statement is safe to run more than once.
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

-- ------------------------------------------------------------
-- 6.  When a streakment was paused
--
--     The card shows how long a paused streakment has been paused,
--     and keeps showing it after the app is closed - a pause can
--     last days or months. This is the one small timestamp that
--     makes that possible (it is cleared again on Begin).
--
--     Run this once in the Neon SQL editor. Until you do, everything
--     still works; a pause just isn't remembered across reloads
--     unless it came with a logged break. Safe to run more than once.
-- ------------------------------------------------------------

alter table streaks add column if not exists paused_at timestamptz;
