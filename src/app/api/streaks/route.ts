import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isUnlocked } from "@/lib/session";
import { LIMITS, clamp } from "@/lib/limits";
import { MAX_GOAL_DAYS } from "@/lib/streak";
import { sendEmail } from "@/lib/email";
import { buildStreakEmail, type EmailStreak } from "@/lib/emailTemplate";
import { NOTIFY_EMAIL } from "@/lib/config";
import { failure, locked, serverError } from "@/lib/api";

/** Not archived: every layer (challenge, legend, infinite), oldest first.
 *  `?archived=true`: the archive, newest first, each marked when that Legend
 *  went on as an Infinite streakment. */
export async function GET(req: Request) {
  if (!(await isUnlocked())) return locked();

  const archived = new URL(req.url).searchParams.get("archived") === "true";
  try {
    const rows = archived
      ? await sql`
          select s.*,
                 exists(select 1 from streaks i where i.infinite_from = s.id) as continued_as_infinite
          from streaks s
          where s.archived = true
          order by s.archived_at desc
        `
      : await sql`select * from streaks where archived = false order by created_at asc`;
    return NextResponse.json(rows);
  } catch (e) {
    return serverError("load your streakments", e);
  }
}

/** Starts an Accept Challenge or a Become Legend. An Infinite streakment is
 *  never made here: only "Archive and Infinite" on a completed Legend makes one. */
export async function POST(req: Request) {
  if (!(await isUnlocked())) return locked();

  const body = await req.json().catch(() => null);
  const name = clamp(body?.name, LIMITS.name);
  const why = clamp(body?.why_note, LIMITS.why);
  const type = body?.type;

  if (type === "infinite") {
    return failure("An Infinite streakment can only be made from a completed Legend.", 400);
  }
  if (type !== "challenge" && type !== "legend") {
    return failure("Choose Accept Challenge or Become Legend.", 400);
  }
  if (!name) return failure("Name is required.", 400);
  if (!why) return failure("Why is required.", 400);

  let goalDays: number | null = null;
  if (type === "challenge") {
    const n = Number(body?.goal_days);
    if (!Number.isInteger(n) || n < 1 || n > MAX_GOAL_DAYS) {
      return failure(`A challenge needs a whole number of days from 1 to ${MAX_GOAL_DAYS}.`, 400);
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
    return serverError("save that", e);
  }

  // Best effort: the streakment exists either way, so an email problem here
  // never fails the request. Only the daily cron needs the claim-then-send
  // dance (it retries); this fires exactly once, inline.
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
    console.error("creation email failed:", e instanceof Error ? e.message : "unknown error");
  }

  return NextResponse.json(row, { status: 201 });
}
