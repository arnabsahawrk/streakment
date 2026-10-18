import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isUnlocked } from "@/lib/session";
import { failure, isId, locked, serverError } from "@/lib/api";

/** Stop: an Infinite streakment freezes for good. The count stops at this
 *  moment, the card locks, and nothing can write to it again. A second Stop
 *  changes nothing and returns the row as it is. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isUnlocked())) return locked();
  const { id } = await params;
  if (!isId(id)) return failure("Not found.", 404);

  try {
    const [row] = await sql`
      update streaks set stopped_at = now()
      where id = ${id} and type = 'infinite' and stopped_at is null
      returning *
    `;
    if (row) return NextResponse.json(row);

    const [cur] = await sql`select * from streaks where id = ${id}`;
    if (!cur) return failure("Not found.", 404);
    if (cur.type !== "infinite") return failure("Only an Infinite streakment can be stopped.", 403);
    return NextResponse.json(cur);
  } catch (e) {
    return serverError("stop that", e);
  }
}
