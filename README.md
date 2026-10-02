# STREAKMENT

**Keep the streakment alive.**

*Streakment* = **Streak** + **Commitment**.

Streakment tracks the promises I've made to myself. I start a streakment,
and it counts the days. When I break it, I say so, write down what
happened, and begin again when I'm ready — not the same minute, not under
pressure.

Single-user, built for my own use only. No sign-up, no accounts — just an
optional passcode standing between anyone else and my data.

Live at **[streakment.vercel.app](https://streakment.vercel.app)**.

---

## What it does

### Two ways to hold a streakment

**Become Legend** — open-ended, no finish line. The day count climbs
through ten named milestones (Begin, Commit, Control, Discipline,
Consistent, Thrive, Strong, Dedicated, Master, Legend), each its own
colour. The colours follow how metal actually behaves under heat: the
early milestones run through the incandescence sequence a smith sees as
iron warms — dull red, red, orange, yellow, near-white. From Dedicated
onward they switch to tempering colours, the oxides steel takes on as it
hardens. Legend leaves steel for gold.

**Accept Challenge** — fixed length, 1 to 365 days. Pick three days to
break a loop, or thirty to prove something. It completes when I reach the
number and offers to finish and archive. A challenge never shows a "best
streak" — I either got there or I didn't, and a personal best is noise.

### Resetting doesn't restart me

When I reset, the streak **pauses** instead of immediately counting
again. Nothing runs until I tap **Begin**. That's deliberate: a slip on
Tuesday shouldn't force me back on the clock the same day.

My best streak is banked before the reset, so breaking never erases what
I already did.

### The roadmap

Its own icon on every running streakment — the full climb (or the
challenge ahead) as a rope of lit and unlit stations. Everything passed
burns in its colour, where I stand now pulses, and what's ahead stays
readable but cold. It only shows while a streakment is running; an
archived one shows Journey instead, since there's no more road left to
draw.

### Journey

Its own icon too — alongside Roadmap on a running streakment, by itself
on an archived one. The numbers (type, when it started, current or best
streak, resets) and every individual break, each with whatever I wrote
about it at the time.

### Notifications

Crossing a milestone or finishing a challenge sends an email — a
different line for each achievement, not a generic template, checked once
a day (streaks are computed on read, so nothing happens at midnight by
itself). There's one switch for all of it in Settings, and a second,
smaller one on each streakment's own card — muting one doesn't touch the
others. Every send is recorded with a uniqueness guarantee, so a retry or
an overlapping run can never send the same congratulation twice.

### The archive

Finishing a streakment doesn't delete it. The archive keeps what it was,
why it started, when, how far it got (or whether it met its goal), how
often it broke, the closing note, and its full journey one tap away.

### Everything else

- **An optional passcode.** The only gate in the app. It can be changed
  (checking the old one first) or removed, and a tap on the header's lock
  icon locks it again immediately. Forgot it? "Forgot passcode?" on the
  lock screen emails it back — the passcode is encrypted, not hashed, so
  it can be recovered rather than only ever reset.
- **Biometric unlock.** Once a passcode is set, each device can also open
  the app with Touch ID, Face ID, an Android fingerprint or Windows Hello
  (menu → Settings → Biometric unlock). It sits on top of the passcode and
  never replaces it: the server checks a signed answer from the device
  before it unlocks anything, and the passcode keeps working everywhere.
  Each device, browser or installed app is switched on separately and
  listed there, so a lost phone can be removed from any other device.
- **Locks itself per tab.** Closing the tab and reopening the app asks
  for the passcode again, the way a locked chat app does — the browser
  session cookie alone would otherwise leave a reopened tab still
  unlocked.
- **Installable and offline-capable**, in Roboto Mono throughout, with
  scrollbars hidden and safe-area padding for notches and home
  indicators on a phone.

---

## Running it yourself

### 1. Database

Create a free [Neon](https://neon.tech) project and run **`schema.sql`**
once in its SQL Editor. Keep the pooled connection string.

Already running before biometric unlock existed? Run just section 5 of
`schema.sql`; every statement in it is safe to repeat.

### 2. Email

Create a free [Brevo](https://brevo.com) account, validate a sender
address, and make an API key under *SMTP & API*. Notification emails
always go to the one address set in `src/app/api/cron/daily/route.ts`
(and in the passcode-recovery route).

### 3. Environment

Copy `.env.example` to `.env.local` and fill it in. `CRON_SECRET` and
`PASSCODE_KEY` can be any long random string — `openssl rand -hex 32`
works well for both. `PASSCODE_KEY` encrypts the passcode at rest;
changing it after a passcode is set locks it out permanently, so set it
once and leave it. Set the same variables in Vercel → Settings →
Environment Variables.

### 4. Run

```bash
npm install
npm run dev
```

Open the app once and set a passcode from the menu → Settings, if wanted.

### 5. Deploy

Push to GitHub, import in Vercel, add the environment variables, deploy.
`vercel.json` registers the daily 03:00 UTC cron automatically.

---

## How it's built

```
src/
  lib/
    session.ts     Settings, passcode encryption, the passcode gate -
                    the only security boundary in the app
    webauthn.ts     Server side of biometric unlock: challenges and the
                    stored devices
    biometric.ts    Browser side: the Touch ID / Face ID prompt
    streak.ts       Day maths and display caps
    tiers.ts        The ten milestone names and colours
    progress.ts     One view model shared by the card and the roadmap
    email.ts        Brevo
    limits.ts       Text ceilings, mirrored by database constraints
  components/       Card, roadmap, journey, dialogs, sheets
  app/api/          streaks/, settings/, passcode/, webauthn/, cron/daily sends
                     notifications
```

Three ideas hold the whole thing together:

1. **Streaks are never stored as a number.** The count is always
   `now − start_date`, computed on read. There's no counter to drift, and
   nothing needs a background job just to make the numbers move.
2. **`start_date = null` means paused.** That single representation gives
   the pause-after-reset behaviour for free, and it's treated as zero
   everywhere so archiving a paused streak can't write a nonsense record.
3. **One view model.** `progress.ts` turns a row into everything the UI
   draws, so the card and the roadmap can't disagree.

Limits are enforced in the database *and* the API, so a bug in one layer
can't bypass the other. And since this is single-user, there's no account
system anywhere in the stack — `user_settings` is one guaranteed row, and
every streak just belongs to whoever has the passcode.

---

A project by [Arnab Saha](https://arnabsaha.vercel.app).
