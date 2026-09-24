import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isUnlocked } from "@/lib/session";
import { currentStreakDays } from "@/lib/streak";
import { LIMITS, clamp } from "@/lib/limits";

/** Reset pauses rather than restarting: start_date goes to null and
 *  nothing counts again until an explicit Begin. That's deliberate - a
 *  slip shouldn't force you back on the clock the same day. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isUnlocked())) return NextResponse.json({ error: "Locked" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const note = clamp(body?.note, LIMITS.resetNote) || null;

  try {
    const [s] = await sql`select * from streaks where id = ${id}`;
    if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const streak = currentStreakDays(s.start_date);
    const newMax = Math.max(s.max_streak, streak);

    const [updated] = await sql`
      update streaks set start_date = null, max_streak = ${newMax}
      where id = ${id}
      returning *
    `;

    if (streak > 0 && s.start_date) {
      await sql`
        insert into reset_log (streak_id, streak_reached, note, run_start)
        values (${id}, ${streak}, ${note}, ${s.start_date})
      `;
      const [bumped] = await sql`
        update streaks set reset_count = reset_count + 1
        where id = ${id} returning *
      `;
      return NextResponse.json(bumped);
    }
    return NextResponse.json(updated);
  } catch (e) {
    console.error("reset failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? `Couldn't reset: ${e.message}` : "Couldn't reset that." },
      { status: 500 }
    );
  }
}
