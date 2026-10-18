import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { pendingEmail } from "@/lib/milestones";
import { sendEmail } from "@/lib/email";
import { buildStreakEmail, type EmailStreak } from "@/lib/emailTemplate";
import { NOTIFY_EMAIL } from "@/lib/config";

export const maxDuration = 60;

/**
 * Runs once a day (vercel.json). Day counts are worked out on read and
 * nothing happens at midnight on its own, so this is what turns "you reached
 * a milestone" into an email. Three layers, three rhythms:
 *
 * - Become Legend: one email at each of the ten milestones, the last being
 *   Legend at 365.
 * - Accept Challenge: silent until its goal, then exactly one email. (Its
 *   other email, on creation, is sent from the streaks route.)
 * - Infinite: never an email. Archived and paused ones are skipped too.
 *
 * What is due comes from `pendingEmail` (pure, unit-tested). It uses "has
 * reached", not "is exactly on", so a day the cron missed can't lose an
 * email. Every send is claimed in email_log first (unique on streak, kind
 * and marker), so a retry, an overlapping run or a manual trigger can never
 * send the same email twice.
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
    select id, name, why_note, type, goal_days, start_date, max_streak, fail_count, email_enabled, archived
    from streaks
    where archived = false and type <> 'infinite' and start_date is not null and email_enabled = true
  `;

  let sent = 0;
  let skipped = 0;

  for (const r of rows) {
    const due = pendingEmail(r);
    if (!due) continue;

    // Build the email first: if anything is wrong with it, skip this one
    // rather than claiming a send that never happens.
    let mail;
    try {
      mail = buildStreakEmail(due.kind, r as unknown as EmailStreak, due.day, settings.timezone);
    } catch (e) {
      console.error("couldn't build email:", e instanceof Error ? e.message : "unknown error");
      continue;
    }

    // Claim the send. If this conflicts, an earlier run already did it.
    const claim = await sql`
      insert into email_log (streak_id, kind, marker)
      values (${r.id}, ${due.kind}, ${due.marker})
      on conflict do nothing
      returning id
    `;
    if (claim.length === 0) {
      skipped++;
      continue;
    }

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
