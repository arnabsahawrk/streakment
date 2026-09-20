# STREAKMENT

**Keep the streakment alive.**

*Streakment* = **Streak** + **Commitment**.

Streakment is a personal, installable web app for tracking the promises
you've made to yourself. You start a streakment, and it counts the days.
When you break it, you say so, write down what happened, and begin again
when you're ready — not the same minute, not under pressure.

This is a single-user app, built for one person's own use. There's no
sign-up and no accounts — just an optional passcode standing between
anyone else and your data.

Live at **[streakment.vercel.app](https://streakment.vercel.app)**.

---

## What it does

### Two ways to hold a streakment

**Climb** — open-ended, no finish line. The day count climbs through ten
milestones, each with its own name, colour and line:

| Days | Milestone | What it says |
|---:|---|---|
| 0 | Day Zero | I can do this all day. |
| 1–2 | Begin | I decided to change. |
| 3–6 | Commit | I chose the better path. |
| 7–14 | Control | I am learning to control myself. |
| 15–20 | Discipline | I am building a new me. |
| 21–29 | Consistent | This is becoming who I am. |
| 30–59 | Thrive | My old habits are losing their hold. |
| 60–89 | Strong | I am no longer who I used to be. |
| 90–179 | Dedicated | I live by my streakment. |
| 180–364 | Master | Discipline has become part of me. |
| 365+ | Legend | I became the person I promised to become. |

The colours aren't arbitrary. They follow how metal actually behaves under
heat: the early milestones run through the incandescence sequence a smith
sees as iron warms — dull red, red, orange, yellow, near-white — matching
the struggle in those lines. From Dedicated onward they switch to tempering
colours, the oxides steel takes on as it hardens, matching the shift from
striving to settled identity. Legend leaves steel for gold.

**Challenge** — fixed length, 1 to 365 days. Pick three days to break a
loop, or thirty to prove something. It completes when you reach the
number, turns gold, and offers to finish and archive. A Challenge never
shows a "best streak" — you either got there or you didn't, and a personal
best is noise.

### Resetting doesn't restart you

When you reset, the streak **pauses** instead of immediately counting
again. Nothing runs until you tap **Begin**. That's deliberate: a slip on
Tuesday shouldn't force you back on the clock the same day, and pretending
otherwise is how people quit entirely.

Your best streak is banked before the reset, so breaking never erases what
you already did.

### The roadmap

Its own icon on every running streakment. The full climb (or the
challenge ahead) as a rope of lit and unlit stations: everything you've
passed burns in its colour, where you stand now pulses, and what's ahead
stays readable but cold. The heatmap of every day so far lives here too.
It only ever shows while a streakment is running — once one is archived,
there's no more road ahead to draw, so History takes its place.

### The heatmap

A compact, GitHub-style grid: one small square per day, arranged in
weeks, going back as far as the streakment does. Held days sit in the
milestone colour, broken days sit in red, and paused stretches sit empty.
Month labels along the top give you the date at a glance — there's no
hover needed.

Nothing extra is stored to make this work. Every run is already bounded by
its start and its reset, so the whole record is reconstructed from data
the app keeps anyway.

### History

Its own icon too — on a running streakment, alongside Roadmap; on an
archived one, by itself. The numbers (kind, when it started, current or
best streak, times reset) and every individual break, each with whatever
you wrote about it at the time.

### Milestone emails

When you cross a milestone or finish a Challenge, you get an email. This
is checked once a day — the app calculates streaks when you open it, so
nothing happens at midnight by itself, and the free hosting tier runs
scheduled jobs once daily. You get the email on the day you cross, not the
minute.

There's one switch for all of it in Settings, and a second, smaller one on
each streakment's own card — muting a single streakment doesn't touch the
others. Every send is recorded, and the record has a uniqueness guarantee,
so a retry or an overlapping run can never send you the same
congratulation twice.

### Your archive

Finishing a streakment doesn't delete it. The archive keeps what it was,
why you started, when, how far it got (or whether it met its goal), how
many times it broke, your closing note, and its full history one tap away.

### Everything else

- **An optional passcode.** The only gate in the app — set one in
  Settings and you're asked for it each time the app is opened fresh. It
  can be changed (which checks the old one first) or removed, and there's
  a **Lock now** button for stepping away from an unlocked device.
- **Installable and offline-capable**, in Roboto Mono throughout, with
  scrollbars hidden and body text left-aligned rather than justified.
- **Built for old devices too** — pinned to Next.js 15 and Tailwind 3 and
  compiled for Safari 12, so it works on phones a newer stack drops.

---

## Running it yourself

### 1. Database

Create a free [Neon](https://neon.tech) project and run **`schema.sql`**
once in its SQL Editor. Keep the pooled connection string.

### 2. Email

Create a free [Brevo](https://brevo.com) account, validate your sender
address, and make an API key under *SMTP & API*. Brevo is used rather than
Resend because it sends from a validated address without requiring you to
own and configure a domain, and its free tier (300/day) doesn't expire.
Milestone emails always go to the one address set in `src/app/api/cron/daily/route.ts`.

### 3. Environment

Copy `.env.example` to `.env.local` and fill it in. `CRON_SECRET` can be
any long random string — `openssl rand -hex 32` works well. Set the same
variables in Vercel → Settings → Environment Variables.

### 4. Run

```bash
npm install
npm run dev
```

Open the app once and set a passcode from the menu → Settings, if you
want one.

### 5. Deploy

Push to GitHub, import in Vercel, add the environment variables, deploy.
`vercel.json` registers the daily 03:00 UTC cron automatically.

---

## How it's built

```
src/
  middleware.ts (removed) — the passcode check now lives in page.tsx
                             and in every API route, via isUnlocked()
  lib/
    session.ts          Settings + the passcode gate; the only security
                         boundary in the app
    streak.ts           Day maths and display caps
    tiers.ts            The ten milestones
    progress.ts         One view model shared by the card and the roadmap
    heatmap.ts          Rebuilds every day from run boundaries
    email.ts            Brevo
    limits.ts           Text ceilings, mirrored by database constraints
  components/           Card, roadmap, heatmap, history, dialogs, sheets
  app/api/              streaks/, settings/, passcode/, cron/daily sends
                         milestone emails
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
can't bypass the other. And because this is single-user, there's no
account system anywhere in the stack — `user_settings` is one guaranteed
row, and every streak belongs to whoever has the passcode.

---

A project by [Arnab Saha](https://arnabsaha.vercel.app).
