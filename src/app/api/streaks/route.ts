import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isUnlocked } from "@/lib/session";
import { LIMITS, clamp } from "@/lib/limits";
import { MAX_GOAL_DAYS } from "@/lib/progress";
import { sendEmail, emailShell, streakDetailsBlock } from "@/lib/email";
import { dayWord } from "@/lib/format";

const NOTIFY_EMAIL = "arnabsahawrk@gmail.com";

export async function GET(req: Request) {
  if (!(await isUnlocked())) return NextResponse.json({ error: "Locked" }, { status: 401 });

  const archived = new URL(req.url).searchParams.get("archived") === "true";
  const rows = await sql`
    select * from streaks
    where archived = ${archived}
    order by ${archived ? sql`archived_at desc` : sql`created_at asc`}
  `;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  if (!(await isUnlocked())) return NextResponse.json({ error: "Locked" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = clamp(body?.name, LIMITS.name);
  const why = clamp(body?.why_note, LIMITS.why);
  const type = body?.type === "challenge" ? "challenge" : "legend";

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!why) return NextResponse.json({ error: "Why is required" }, { status: 400 });

  let goalDays: number | null = null;
  if (type === "challenge") {
    const n = Number(body?.goal_days);
    if (!Number.isInteger(n) || n < 1 || n > MAX_GOAL_DAYS) {
      return NextResponse.json(
        { error: `A challenge needs a whole number of days between 1 and ${MAX_GOAL_DAYS}` },
        { status: 400 }
      );
    }
    goalDays = n;
  }

  const [row] = await sql`
    insert into streaks (name, why_note, type, goal_days)
    values (${name}, ${why}, ${type}, ${goalDays})
    returning *
  `;

  // Best-effort: the streak exists either way, so an email hiccup here
  // never fails the request. Only the daily cron's sends need the
  // claim-then-send dance (retries) - this fires exactly once, inline.
  try {
    const [settings] = await sql`select email_milestones from user_settings where singleton = true`;
    if (settings?.email_milestones) {
      const title = type === "challenge" ? `${row.name} — accepted` : `${row.name} — begun`;
      const body =
        type === "challenge"
          ? `<p style="margin:0 0 12px;color:#F2ECE3;font-size:15px;line-height:1.6">${goalDays} ${dayWord(goalDays ?? 0)}. Clock starts now.</p>
${streakDetailsBlock({ name: row.name, why_note: row.why_note, reset_count: row.reset_count }, "Goal", `${goalDays} ${dayWord(goalDays ?? 0)}`)}
<p style="margin:0;color:#A79C8C;font-size:14px;line-height:1.6">No shortcuts. Just the count.</p>`
          : `<p style="margin:0 0 12px;color:#F2ECE3;font-size:15px;line-height:1.6">Day zero. The clock starts now.</p>
${streakDetailsBlock({ name: row.name, why_note: row.why_note, reset_count: row.reset_count }, "Level", "Day Zero")}
<p style="margin:0;color:#A79C8C;font-size:14px;line-height:1.6">No finish line on this one. Just don't stop tomorrow.</p>`;
      const ok = await sendEmail({ to: NOTIFY_EMAIL, subject: title, html: emailShell(title, body) });
      if (ok) {
        await sql`insert into email_log (streak_id, kind, marker) values (${row.id}, 'created', '0') on conflict do nothing`;
      }
    }
  } catch {
    // Streak creation itself already succeeded; nothing to roll back.
  }

  return NextResponse.json(row, { status: 201 });
}
