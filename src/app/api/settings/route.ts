import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getSettings, isUnlocked } from "@/lib/session";
import { isValidZone } from "@/lib/zone";

export async function GET() {
  if (!(await isUnlocked())) return NextResponse.json({ error: "Locked" }, { status: 401 });
  return NextResponse.json(await getSettings());
}

export async function PATCH(req: Request) {
  if (!(await isUnlocked())) return NextResponse.json({ error: "Locked" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const fields: Record<string, unknown> = {};

  if ("email_milestones" in body) fields.email_milestones = !!body.email_milestones;
  if (isValidZone(body.timezone)) {
    fields.timezone = body.timezone;
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  fields.updated_at = new Date();
  await sql`update user_settings set ${sql(fields)} where singleton = true`;
  return NextResponse.json(await getSettings());
}
