import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { currentStreakDays } from "@/lib/streak";
import { TIERS } from "@/lib/tiers";
import { sendEmail, buildStreakEmail, type EmailStreak } from "@/lib/email";

export const maxDuration = 60;

/** Every notification email goes to this one address. Personal app, one
 *  person, no accounts to look an email up on. */
const NOTIFY_EMAIL = "arnabsahawrk@gmail.com";

/**
 * Runs once a day (vercel.json). Streaks are computed on read and nothing
 * happens at midnight on its own, so this is what turns "you crossed a
 * milestone" into an email. Two very different rhythms live here:
 *
 * - Become Legend: one email at every one of the ten milestones.
 * - Accept Challenge: silent until the deadline, then exactly one email.
 *   (Its other email - on creation - is sent inline from the streaks
 *   route the moment it's made, not from here.)
 *
 * Every send is recorded in email_log, which has a unique index on
 * (streak, kind, marker). A retry, an overlapping run, or a manual
 * trigger therefore cannot send the same email twice - the insert
 * simply conflicts and is skipped.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [settings] = await sql`select email_milestones, timezone from user_settings where singleton = true`;
  if (!settings?.email_milestones) {
    return NextResponse.json({ ok: true, considered: 0, sent: 0, skipped: 0, note: "notifications are off" });
  }

  const rows = await sql`
    select id, name, why_note, reset_count, type, goal_days, start_date, max_streak from streaks
    where archived = false and start_date is not null and email_enabled = true
  `;

  let sent = 0;
  let skipped = 0;

  for (const r of rows) {
    const days = currentStreakDays(r.start_date);
    if (days < 1) continue;

    const isChallenge = r.type === "challenge" && !!r.goal_days;
    let kind: "milestone" | "challenge_complete" | null = null;
    if (isChallenge && days === r.goal_days) kind = "challenge_complete";
    else if (!isChallenge && TIERS.some((t) => t.min === days)) kind = "milestone";
    if (!kind) continue;
    const marker = String(days);

    // Build the email first: if anything is wrong with it, skip this one
    // rather than claiming a send that never happens.
    let mail;
    try {
      mail = buildStreakEmail(kind, r as unknown as EmailStreak, days, settings.timezone);
    } catch (e) {
      console.error("couldn't build email for", r.id, e);
      continue;
    }

    // Claim the send first. If this conflicts, another run already did it.
    const claim = await sql`
      insert into email_log (streak_id, kind, marker)
      values (${r.id}, ${kind}, ${marker})
      on conflict do nothing
      returning id
    `;
    if (claim.length === 0) { skipped++; continue; }

    const ok = await sendEmail({ to: NOTIFY_EMAIL, subject: mail.subject, html: mail.html, text: mail.text });

    if (ok) {
      sent++;
    } else {
      // Release the claim so tomorrow's run can retry a failed send.
      await sql`delete from email_log where id = ${claim[0].id}`;
    }
  }

  return NextResponse.json({ ok: true, considered: rows.length, sent, skipped });
}
