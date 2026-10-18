import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isUnlocked } from "@/lib/session";
import { failure, isId, locked, serverError } from "@/lib/api";

/** One streakment plus its failed history (read by both the Roadmap and the
 *  Journey). A failed Challenge has its single fail here. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isUnlocked())) return locked();
  const { id } = await params;
  if (!isId(id)) return failure("Not found.", 404);

  try {
    const [streak] = await sql`select * from streaks where id = ${id}`;
    if (!streak) return failure("Not found.", 404);

    const fails = await sql`
      select id, streak_reached, note, run_start, failed_at from fail_log
      where streak_id = ${id} order by failed_at desc
    `;
    return NextResponse.json({ streak, fails });
  } catch (e) {
    return serverError("load that", e);
  }
}
