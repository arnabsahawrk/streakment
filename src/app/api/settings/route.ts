import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getSettings, isUnlocked } from "@/lib/session";
import { isValidZone } from "@/lib/zone";
import { failure, locked, serverError } from "@/lib/api";

export async function GET() {
  if (!(await isUnlocked())) return locked();
  try {
    return NextResponse.json(await getSettings());
  } catch (e) {
    return serverError("load settings", e);
  }
}

/** The email switch, and the device's time zone (so emails quote the zone
 *  the phone is in). Only a real IANA zone is accepted. */
export async function PATCH(req: Request) {
  if (!(await isUnlocked())) return locked();

  const body = await req.json().catch(() => null);
  const fields: Record<string, unknown> = {};

  if (body && typeof body === "object") {
    if ("email_milestones" in body) fields.email_milestones = !!body.email_milestones;
    if (isValidZone(body.timezone)) fields.timezone = body.timezone;
  }
  if (Object.keys(fields).length === 0) return failure("Nothing to update.", 400);

  try {
    fields.updated_at = new Date();
    await sql`update user_settings set ${sql(fields)} where singleton = true`;
    return NextResponse.json(await getSettings());
  } catch (e) {
    return serverError("save settings", e);
  }
}
