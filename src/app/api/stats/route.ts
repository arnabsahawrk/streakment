import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isUnlocked } from "@/lib/session";
import { locked, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Everything the Stats screen needs in one read. Only the columns the maths
 *  uses (no notes, no why-text), and nothing is written. */
export async function GET() {
  if (!(await isUnlocked())) return locked();

  try {
    const streaks = await sql`
      select id, name, type, goal_days, start_date, max_streak, fail_count,
             archived, archived_at, stopped_at, created_at
      from streaks
    `;
    const fails = await sql`
      select streak_id, streak_reached, run_start, failed_at
      from fail_log
      order by failed_at asc
    `;
    return NextResponse.json({ streaks, fails });
  } catch (e) {
    return serverError("load stats", e);
  }
}
