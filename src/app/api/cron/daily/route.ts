import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { currentStreakDays } from "@/lib/streak";
import { TIERS } from "@/lib/tiers";
import { dayWord } from "@/lib/format";
import { sendEmail, emailShell, streakDetailsBlock } from "@/lib/email";

export const maxDuration = 60;

/** Every notification email goes to this one address. Personal app, one
 *  person, no accounts to look an email up on. */
const NOTIFY_EMAIL = "arnabsahawrk@gmail.com";

/** One distinct, specific line per milestone rather than a generic
 *  template - the whole point is that day 3 doesn't feel like day 90. */
const MILESTONE_COPY: Record<string, string> = {
  Begin: "Day one down. Starting was the hard part.",
  Commit: "Three days. This isn't a test anymore.",
  Control: "One week. That's not luck — that's you.",
  Discipline: "Two weeks. No more excuses left to make.",
  Consistent: "Three weeks. This is a habit now.",
  Thrive: "A month. Old habits are losing their grip.",
  Strong: "Two months. You're not who you were.",
  Dedicated: "Three months. You live by this now.",
  Master: "Half a year. This just is you now.",
  Legend: "A full year. Whatever you set out to prove — you proved it.",
};

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

  const [settings] = await sql`select email_milestones from user_settings where singleton = true`;
  if (!settings?.email_milestones) {
    return NextResponse.json({ ok: true, considered: 0, sent: 0, skipped: 0, note: "notifications are off" });
  }

  const rows = await sql`
    select id, name, why_note, reset_count, type, goal_days, start_date from streaks
    where archived = false and start_date is not null and email_enabled = true
  `;

  let sent = 0;
  let skipped = 0;

  for (const r of rows) {
    const days = currentStreakDays(r.start_date);
    if (days < 1) continue;

    const isChallenge = r.type === "challenge" && !!r.goal_days;
    let kind: string | null = null;
    let marker = "";
    let title = "";
    let body = "";

    if (isChallenge && days === r.goal_days) {
      kind = "challenge_complete";
      marker = String(days);
      title = `${r.name} — complete`;
      body = `<p style="margin:0 0 12px;color:#F2ECE3;font-size:15px;line-height:1.6">You set ${days} ${dayWord(days)}. You reached it. That's the whole game.</p>
${streakDetailsBlock({ name: r.name, why_note: r.why_note, reset_count: r.reset_count }, "Goal", `Reached — ${days} of ${days} ${dayWord(days)}`)}
<p style="margin:0;color:#A79C8C;font-size:14px;line-height:1.6">Finish and archive it — it's earned.</p>`;
    } else if (!isChallenge && TIERS.some((t) => t.min === days)) {
      const tier = TIERS.find((t) => t.min === days)!;
      kind = "milestone";
      marker = String(days);
      title = `${r.name} — ${tier.name}`;
      body = `<p style="margin:0 0 6px;color:${tier.color};font-size:13px;font-weight:700;letter-spacing:1.5px">${tier.name.toUpperCase()} · DAY ${days}</p>
<p style="margin:0 0 4px;color:#F2ECE3;font-size:17px;font-weight:700">${MILESTONE_COPY[tier.name] ?? "Still going."}</p>
${streakDetailsBlock({ name: r.name, why_note: r.why_note, reset_count: r.reset_count }, "Level", tier.name)}
<p style="margin:0;color:#A79C8C;font-size:14px;line-height:1.6">${
        tier.name === "Legend"
          ? "Finish and archive whenever you like — it's earned."
          : "Keep the streakment alive."
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

    const ok = await sendEmail({ to: NOTIFY_EMAIL, subject: title, html: emailShell(title, body) });

    if (ok) {
      sent++;
    } else {
      // Release the claim so tomorrow's run can retry a failed send.
      await sql`delete from email_log where id = ${claim[0].id}`;
    }
  }

  return NextResponse.json({ ok: true, considered: rows.length, sent, skipped });
}
