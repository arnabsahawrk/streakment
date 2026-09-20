import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { currentStreakDays } from "@/lib/streak";
import { getTier, TIERS, LEGEND_MIN } from "@/lib/tiers";
import { dayWord } from "@/lib/format";
import { sendEmail, emailShell } from "@/lib/email";

export const maxDuration = 60;

/** Every milestone email goes to this one address. Personal app, one
 *  person, no accounts to look an email up on. */
const NOTIFY_EMAIL = "arnabsahawrk@gmail.com";

/**
 * Runs once a day (vercel.json). Streaks are computed on read and nothing
 * happens at midnight on its own, so this is what turns "you crossed a
 * milestone" into an email.
 *
 * Every send is recorded in email_log, which has a unique index on
 * (streak, kind, marker). A retry, an overlapping run, or a manual
 * trigger therefore cannot send the same congratulation twice - the
 * insert simply conflicts and is skipped.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [settings] = await sql`select email_milestones from user_settings where singleton = true`;
  if (!settings?.email_milestones) {
    return NextResponse.json({ ok: true, considered: 0, sent: 0, skipped: 0, note: "milestone emails are off" });
  }

  const rows = await sql`
    select id, name, kind, goal_days, start_date from streaks
    where archived = false and start_date is not null and email_enabled = true
  `;

  let sent = 0;
  let skipped = 0;

  for (const r of rows) {
    const days = currentStreakDays(r.start_date);
    if (days < 1) continue;

    const isSprint = r.kind === "sprint" && !!r.goal_days;
    let kind: string | null = null;
    let marker = "";
    let title = "";
    let body = "";

    if (isSprint && days === r.goal_days) {
      kind = "sprint_complete";
      marker = String(days);
      title = `${r.name} — challenge complete`;
      body = `<p style="margin:0 0 12px;color:#F2ECE3;font-size:15px;line-height:1.6">You set ${days} ${dayWord(days)}. You reached it. That's the whole game.</p>
<p style="margin:0;color:#A79C8C;font-size:14px;line-height:1.6">Finish and archive it so it's recorded properly.</p>`;
    } else if (!isSprint && TIERS.some((t) => t.min === days)) {
      const tier = getTier(days);
      kind = "milestone";
      marker = String(days);
      title = `${r.name} — ${tier.name}`;
      body = `<p style="margin:0 0 6px;color:${tier.color};font-size:13px;font-weight:700;letter-spacing:1.5px">${tier.name.toUpperCase()} · DAY ${days}</p>
<p style="margin:0 0 12px;color:#F2ECE3;font-size:17px;font-weight:700">${tier.line}</p>
<p style="margin:0;color:#A79C8C;font-size:14px;line-height:1.6">${
        days >= LEGEND_MIN
          ? "A full year. Finish and archive this one whenever you like — it's earned."
          : "Don't stop now. Keep the streakment alive."
      }</p>`;
    }

    if (!kind) continue;

    // Claim the send first. If this conflicts, another run already did it.
    const claim = await sql`
      insert into email_log (streak_id, kind, marker)
      values (${r.id}, ${kind}, ${marker})
      on conflict do nothing
      returning id
    `;
    if (claim.length === 0) { skipped++; continue; }

    const ok = await sendEmail({
      to: NOTIFY_EMAIL,
      subject: title,
      html: emailShell(title, body),
    });

    if (ok) {
      sent++;
    } else {
      // Release the claim so tomorrow's run can retry a failed send.
      await sql`delete from email_log where id = ${claim[0].id}`;
    }
  }

  return NextResponse.json({ ok: true, considered: rows.length, sent, skipped });
}
