import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isUnlocked } from "@/lib/session";
import { hasPausedAt } from "@/lib/pause";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isUnlocked())) return NextResponse.json({ error: "Locked" }, { status: 401 });
  const { id } = await params;

  try {
    // Beginning clears the pause time (if this database keeps one yet).
    const [row] = (await hasPausedAt())
      ? await sql`update streaks set start_date = now(), paused_at = null where id = ${id} and archived = false returning *`
      : await sql`update streaks set start_date = now() where id = ${id} and archived = false returning *`;
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    console.error("start failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? `Couldn't begin: ${e.message}` : "Couldn't begin that." },
      { status: 500 }
    );
  }
}
