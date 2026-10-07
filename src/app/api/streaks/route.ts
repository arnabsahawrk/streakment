import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isUnlocked } from "@/lib/session";
import { LIMITS, clamp } from "@/lib/limits";
import { MAX_GOAL_DAYS } from "@/lib/progress";
import { sendEmail, buildStreakEmail, type EmailStreak } from "@/lib/email";
import { fillPausedAt } from "@/lib/pause";

const NOTIFY_EMAIL = "arnabsahawrk@gmail.com";

export async function GET(req: Request) {
  if (!(await isUnlocked())) return NextResponse.json({ error: "Locked" }, { status: 401 });

  const archived = new URL(req.url).searchParams.get("archived") === "true";
  const rows = await sql`
    select * from streaks
    where archived = ${archived}
    order by ${archived ? sql`archived_at desc` : sql`created_at asc`}
  `;
  if (!archived) await fillPausedAt(rows);
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

  let row;
  try {
    [row] = await sql`
      insert into streaks (name, why_note, type, goal_days)
      values (${name}, ${why}, ${type}, ${goalDays})
      returning *
    `;
  } catch (e) {
    console.error("streak insert failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? `Couldn't save: ${e.message}` : "Couldn't save that." },
      { status: 500 }
    );
  }

  // Best-effort: the streak exists either way, so an email hiccup here
  // never fails the request. Only the daily cron's sends need the
  // claim-then-send dance (retries) - this fires exactly once, inline.
  try {
    const [settings] = await sql`select email_milestones, timezone from user_settings where singleton = true`;
    if (settings?.email_milestones) {
      const mail = buildStreakEmail("created", row as unknown as EmailStreak, 0, settings.timezone);
      const ok = await sendEmail({ to: NOTIFY_EMAIL, subject: mail.subject, html: mail.html, text: mail.text });
      if (ok) {
        await sql`insert into email_log (streak_id, kind, marker) values (${row.id}, 'created', '0') on conflict do nothing`;
      }
    }
  } catch (e) {
    // Streak creation itself already succeeded; nothing to roll back.
    console.error("creation email failed:", e);
  }

  return NextResponse.json(row, { status: 201 });
}
