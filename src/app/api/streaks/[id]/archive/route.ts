import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isUnlocked } from "@/lib/session";
import { LIMITS, clamp } from "@/lib/limits";
import { completedSql, elapsedDaysSql } from "@/lib/sqlRules";
import { failure, isId, locked, refusal, serverError } from "@/lib/api";

/** Archive, with the closing note (required).
 *
 *  - Finish and Archive: a completed Challenge or Legend.
 *  - Archive early: a Legend that has not completed (the small flag). A
 *    Challenge can't: its only exits are completing and failing.
 *  - `infinite: true` (Archive and Infinite): a COMPLETED Legend only. One
 *    statement archives it and makes the Infinite row, which copies the
 *    Legend's start_date, so an Infinite made on the 369th day starts at 369.
 *
 *  max_streak banks the capped count, never the raw elapsed days.
 *  An Infinite streakment is never archived: it can only be stopped. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isUnlocked())) return locked();
  const { id } = await params;
  if (!isId(id)) return failure("Not found.", 404);

  const body = await req.json().catch(() => ({}));
  const reason = clamp(body?.reason, LIMITS.closingNote);
  if (!reason) return failure("A closing note is required.", 400);
  const toInfinite = body?.infinite === true;

  try {
    if (toInfinite) {
      const [r] = await sql`
        with archived_one as (
          update streaks set
            archived = true,
            archived_at = now(),
            archive_reason = ${reason},
            max_streak = greatest(max_streak, 365)
          where id = ${id} and type = 'legend' and archived = false and ${completedSql()}
          returning *
        ), made as (
          insert into streaks (name, why_note, type, start_date, email_enabled, infinite_from)
          select name, why_note, 'infinite', start_date, false, id from archived_one
          returning *
        )
        select (select row_to_json(a) from archived_one a) as archived_row,
               (select row_to_json(m) from made m) as infinite_row
      `;
      if (r?.archived_row) return NextResponse.json({ archived: r.archived_row, infinite: r.infinite_row });
    } else {
      const [row] = await sql`
        update streaks set
          archived = true,
          archived_at = now(),
          archive_reason = ${reason},
          max_streak = greatest(max_streak,
            case when start_date is null then 0
                 else least(${elapsedDaysSql()}, case when type = 'challenge' then goal_days else 365 end)
            end)
        where id = ${id} and archived = false and type in ('challenge', 'legend')
          and (type = 'legend' or ${completedSql()})
        returning *
      `;
      if (row) return NextResponse.json({ archived: row, infinite: null });
    }

    const [cur] = await sql`select * from streaks where id = ${id}`;
    const { status, message } = refusal(toInfinite ? "archive-infinite" : "archive", cur);
    return failure(message, status);
  } catch (e) {
    return serverError("archive that", e);
  }
}
