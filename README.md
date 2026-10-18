# STREAKMENT

**Keep the streakment alive.**

*Streakment* = **Streak** + **Commitment**. A private app that tracks the
promises I make to myself. One person, no accounts, no sign-up: an optional
passcode (and Touch ID / Face ID on top of it) stands between anyone else and
my data. Live at [streakment.vercel.app](https://streakment.vercel.app). It is
not indexed by search engines.

## The path

**Accept Challenge → Become Legend → Infinite Streakment**

1. **Accept Challenge.** Small and fixed: 1 to 365 days. It counts to its goal
   and stops. *Failed* is do or die: it ends, a closing note is required, and
   it goes to the archive. No restart.
2. **Become Legend.** Exactly 365 days, through ten milestones: Begin (1),
   Commit (3), Control (7), Discipline (15), Consistent (21), Thrive (30),
   Strong (60), Dedicated (90), Master (180), Legend (365). It counts to 365
   and stops. *Failed* sends it back to the beginning, **paused until I tap
   Begin**. A Failed under one day isn't counted. A Legend can still be
   archived early, with a closing note.
3. **Infinite Streakment.** Made only by **Archive and Infinite** on a
   completed Legend, and it keeps counting from the real day (convert on day
   369 and it starts at 369). No milestones, no emails, no Failed. It can only
   be **stopped**, once, and then it is frozen for good.

A completed Challenge or Legend stops counting and offers **Finish and
Archive**. The colours follow the risk of breaking: hot crimson on day 1,
cooling through orange, amber, lime, green, teal and blue to violet, and a
gold foil for Legend. Everything else the app shows (days, completed, best,
stats) is worked out from the start dates, so there are no counters to drift
and nothing has to run at midnight.

## Emails

Three kinds, all to one address (`NOTIFY_EMAIL` in `src/lib/config.ts`), sent
through Brevo, each with a plain-text copy: when a streakment **starts**, at
each Legend **milestone**, and when a Challenge is **complete**. Never for
Infinite, Failed or the archive. A global switch and a per-streakment mute are
in the app. The daily job (`/api/cron/daily`, 03:00 UTC in `vercel.json`)
sends what is due, and a ledger table makes sure the same email can never go
out twice. The quotes live in `src/lib/quotes.ts`.

## Setup

1. **Database.** Create a free [Neon](https://neon.tech) project and copy the
   pooled connection string.
2. **Schema.** In the Neon SQL editor, run `schema.sql` **once, in full**, on
   the new database. It is the whole schema (the app never changes tables
   itself) and is safe to run again.
3. **Environment variables** (Vercel → Settings → Environment Variables, or
   `.env.local` for local use; see `.env.example`):

   | Name | What |
   |---|---|
   | `DATABASE_URL` | Neon connection string |
   | `BREVO_API_KEY` | Brevo → SMTP & API → API keys |
   | `BREVO_SENDER_EMAIL` | a sender address validated in Brevo |
   | `BREVO_SENDER_NAME` | optional, defaults to "Streakment" |
   | `CRON_SECRET` | any long random string (Vercel Cron sends it) |
   | `PASSCODE_KEY` | any long random string. **Set it once and never change it** after a passcode exists, or that passcode can't be read again |

4. **Deploy.** Import the repo on Vercel and deploy (Hobby is enough; the
   daily cron is already in `vercel.json`). Open the app and set a passcode in
   Settings if you want one.

Locally: `npm ci`, then `npm run dev`.

## Checks

`npm test` (unit tests: rules, view model, sorting, stats, quotes, dates,
colours, emails), `npm run typecheck`, `npm run lint`, `npm run build`.

## Notes

- **Installable, not offline.** It has a web manifest, so it can be added to
  a home screen, but it needs a connection. The service worker in
  `public/sw.js` keeps no cache and only unregisters itself (older versions
  cached too eagerly).
- Built to run on an **iPhone 7 (Safari, iOS 15)** as well as Windows, Mac and
  Android, so the stack and CSS stay conservative (see `browserslist`).
- Stack: Next.js 15 (App Router), React 19, TypeScript, Tailwind 3, `motion`,
  Postgres (`postgres`), `@simplewebauthn/server`.
- Icons: edit `public/icons/icon.svg`, then `node scripts/make-icons.mjs`.
