import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isUnlocked } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Everything the Stats screen needs in one read. Only the columns the
 *  maths uses (no notes, no why-text), and nothing is written. */
export async function GET() {
  if (!(await isUnlocked())) return NextResponse.json({ error: "Locked" }, { status: 401 });

  try {
    const streaks = await sql`
      select id, name, type, goal_days, start_date, max_streak, reset_count,
             archived, archived_at, created_at
      from streaks
    `;
    const resets = await sql`
      select streak_id, streak_reached, run_start, reset_at
      from reset_log
      order by reset_at asc
    `;
    return NextResponse.json({ streaks, resets });
  } catch (e) {
    console.error("stats failed:", e);
    return NextResponse.json({ error: "Couldn't load stats." }, { status: 500 });
  }
}
