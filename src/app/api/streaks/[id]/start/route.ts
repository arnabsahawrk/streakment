import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isUnlocked } from "@/lib/session";
import { failure, isId, locked, refusal, serverError } from "@/lib/api";

/** Begin: only a paused Legend starts again. On anything else nothing
 *  matches and the current row comes back unchanged, so a stray Begin on a
 *  running streakment can never restart it. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isUnlocked())) return locked();
  const { id } = await params;
  if (!isId(id)) return failure("Not found.", 404);

  try {
    const [row] = await sql`
      update streaks set start_date = now(), paused_at = null
      where id = ${id} and type = 'legend' and archived = false and start_date is null
      returning *
    `;
    if (row) return NextResponse.json(row);

    const [cur] = await sql`select * from streaks where id = ${id}`;
    if (!cur) return failure("Not found.", 404);
    if (cur.type === "legend" && !cur.archived) return NextResponse.json(cur);
    const { status, message } = refusal("begin", cur);
    return failure(message, status);
  } catch (e) {
    return serverError("begin that", e);
  }
}
