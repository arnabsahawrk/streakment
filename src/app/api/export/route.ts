import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isUnlocked } from "@/lib/session";

export const dynamic = "force-dynamic";

/** A full copy of the data as one JSON file: every streakment and every
 *  break, notes included. The passcode and biometric data are never part
 *  of it. Read-only, so it's safe to call as often as you like - and a
 *  handy backup when the database is on a free plan. */
export async function GET() {
  if (!(await isUnlocked())) return NextResponse.json({ error: "Locked" }, { status: 401 });

  try {
    const streaks = await sql`select * from streaks order by created_at asc`;
    const resets = await sql`select * from reset_log order by reset_at asc`;
    const day = new Date().toISOString().slice(0, 10);
    const body = JSON.stringify(
      { app: "streakment", exported_at: new Date().toISOString(), streaks, reset_log: resets },
      null,
      2,
    );
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="streakment-backup-${day}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("export failed:", e);
    return NextResponse.json({ error: "Couldn't export." }, { status: 500 });
  }
}
