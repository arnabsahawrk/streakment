import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isUnlocked } from "@/lib/session";
import { LIMITS, clamp } from "@/lib/limits";
import { MAX_GOAL_DAYS } from "@/lib/progress";

export async function GET(req: Request) {
  if (!(await isUnlocked())) return NextResponse.json({ error: "Locked" }, { status: 401 });

  const archived = new URL(req.url).searchParams.get("archived") === "true";
  const rows = await sql`
    select * from streaks
    where archived = ${archived}
    order by ${archived ? sql`archived_at desc` : sql`created_at asc`}
  `;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  if (!(await isUnlocked())) return NextResponse.json({ error: "Locked" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = clamp(body?.name, LIMITS.name);
  const why = clamp(body?.why_note, LIMITS.why);
  const kind = body?.kind === "sprint" ? "sprint" : "ascent";

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!why) return NextResponse.json({ error: "Why is required" }, { status: 400 });

  let goalDays: number | null = null;
  if (kind === "sprint") {
    const n = Number(body?.goal_days);
    if (!Number.isInteger(n) || n < 1 || n > MAX_GOAL_DAYS) {
      return NextResponse.json(
        { error: `A challenge needs a whole number of days between 1 and ${MAX_GOAL_DAYS}` },
        { status: 400 }
      );
    }
    goalDays = n;
  }

  const [row] = await sql`
    insert into streaks (name, why_note, kind, goal_days)
    values (${name}, ${why}, ${kind}, ${goalDays})
    returning *
  `;
  return NextResponse.json(row, { status: 201 });
}
