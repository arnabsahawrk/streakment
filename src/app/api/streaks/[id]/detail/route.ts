import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isUnlocked } from "@/lib/session";

/** One streak plus its reset history (which the heatmap and the history
 *  view both read from) in a single round trip. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isUnlocked())) return NextResponse.json({ error: "Locked" }, { status: 401 });
  const { id } = await params;

  const [streak] = await sql`select * from streaks where id = ${id}`;
  if (!streak) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const resets = await sql`
    select id, streak_reached, note, run_start, reset_at from reset_log
    where streak_id = ${id} order by reset_at desc
  `;

  return NextResponse.json({ streak, resets });
}
