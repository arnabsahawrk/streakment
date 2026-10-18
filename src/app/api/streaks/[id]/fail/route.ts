import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isUnlocked } from "@/lib/session";
import { LIMITS, clamp } from "@/lib/limits";
import { completedSql, elapsedDaysSql } from "@/lib/sqlRules";
import { failure, isId, locked, refusal, serverError } from "@/lib/api";

/** Failed. Three cases, each one atomic SQL statement whose WHERE holds
 *  every guard (and `for update` makes a double tap or a second tab wait,
 *  then find nothing left to do):
 *
 *  - Become Legend, running: goes back to the beginning and waits, paused,
 *    until Begin. If the run lasted at least a day it counts (fail_count + 1)
 *    and is logged; a run under a day is just an accidental start.
 *  - Accept Challenge, running: do or die. Counts, is logged, and goes
 *    straight to the archive with the closing note (required). No restart.
 *  - Completed, paused, archived or Infinite: refused. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isUnlocked())) return locked();
  const { id } = await params;
  if (!isId(id)) return failure("Not found.", 404);

  const body = await req.json().catch(() => ({}));

  try {
    const [cur] = await sql`select * from streaks where id = ${id}`;
    if (!cur) return failure("Not found.", 404);

    let row;
    if (cur.type === "challenge") {
      const note = clamp(body?.note, LIMITS.closingNote);
      if (!note) return failure("A closing note is required.", 400);

      [row] = await sql`
        with cur as (
          select id, start_date, ${elapsedDaysSql()} as days
          from streaks
          where id = ${id} and type = 'challenge' and archived = false
            and start_date is not null and not ${completedSql()}
          for update
        ), upd as (
          update streaks s set
            fail_count = s.fail_count + 1,
            max_streak = greatest(s.max_streak, cur.days),
            archived = true,
            archived_at = now(),
            archive_reason = ${note}::text
          from cur
          where s.id = cur.id
          returning s.*
        ), logged as (
          insert into fail_log (streak_id, streak_reached, note, run_start)
          select cur.id, cur.days, ${note}::text, cur.start_date
          from cur join upd on upd.id = cur.id
        )
        select * from upd
      `;
    } else if (cur.type === "legend") {
      const note = clamp(body?.note, LIMITS.failNote) || null;

      [row] = await sql`
        with cur as (
          select id, start_date, ${elapsedDaysSql()} as days
          from streaks
          where id = ${id} and type = 'legend' and archived = false
            and start_date is not null and not ${completedSql()}
          for update
        ), upd as (
          update streaks s set
            start_date = null,
            paused_at = now(),
            max_streak = greatest(s.max_streak, cur.days),
            fail_count = s.fail_count + (case when cur.days >= 1 then 1 else 0 end)
          from cur
          where s.id = cur.id
          returning s.*
        ), logged as (
          insert into fail_log (streak_id, streak_reached, note, run_start)
          select cur.id, cur.days, ${note}::text, cur.start_date
          from cur join upd on upd.id = cur.id
          where cur.days >= 1
        )
        select * from upd
      `;
    }

    if (row) return NextResponse.json(row);
    const [now] = await sql`select * from streaks where id = ${id}`;
    const { status, message } = refusal("fail", now);
    return failure(message, status);
  } catch (e) {
    return serverError("mark that failed", e);
  }
}
