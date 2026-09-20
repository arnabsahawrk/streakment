import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { hashPasscode, isUnlocked, PASSCODE_COOKIE } from "@/lib/session";

/** The only lock in the app now that there's no sign-in. Setting a
 *  passcode stores a SHA-256 hash; unlocking sets a session cookie that
 *  dies with the browser, so it's asked for again on each fresh open.
 *
 *  "unlock" is the one action allowed while locked - that's the point of
 *  it. Every other action requires already being unlocked, so a passcode
 *  can never be changed or removed by someone who doesn't already have
 *  it. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  if (action === "unlock") {
    const passcode = typeof body?.passcode === "string" ? body.passcode : "";
    const [row] = await sql`select passcode_hash from user_settings where singleton = true`;
    const hash = await hashPasscode(passcode);
    if (!row?.passcode_hash || row.passcode_hash !== hash) {
      return NextResponse.json({ error: "That passcode isn't right" }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(PASSCODE_COOKIE, hash, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    return res;
  }

  if (!(await isUnlocked())) return NextResponse.json({ error: "Locked" }, { status: 401 });

  if (action === "set") {
    const passcode = typeof body?.passcode === "string" ? body.passcode : "";
    if (passcode.length < 4 || passcode.length > 64) {
      return NextResponse.json({ error: "Use at least 4 characters" }, { status: 400 });
    }
    const [row] = await sql`select passcode_hash from user_settings where singleton = true`;
    if (row?.passcode_hash) {
      return NextResponse.json({ error: "A passcode is already set — use Change instead" }, { status: 400 });
    }
    const hash = await hashPasscode(passcode);
    await sql`update user_settings set passcode_hash = ${hash}, updated_at = now() where singleton = true`;
    const res = NextResponse.json({ ok: true });
    res.cookies.set(PASSCODE_COOKIE, hash, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    return res;
  }

  if (action === "change") {
    const current = typeof body?.currentPasscode === "string" ? body.currentPasscode : "";
    const next = typeof body?.newPasscode === "string" ? body.newPasscode : "";
    if (next.length < 4 || next.length > 64) {
      return NextResponse.json({ error: "New passcode needs at least 4 characters" }, { status: 400 });
    }
    const [row] = await sql`select passcode_hash from user_settings where singleton = true`;
    if (!row?.passcode_hash || row.passcode_hash !== (await hashPasscode(current))) {
      return NextResponse.json({ error: "Current passcode isn't right" }, { status: 401 });
    }
    const hash = await hashPasscode(next);
    await sql`update user_settings set passcode_hash = ${hash}, updated_at = now() where singleton = true`;
    const res = NextResponse.json({ ok: true });
    res.cookies.set(PASSCODE_COOKIE, hash, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    return res;
  }

  if (action === "remove") {
    const passcode = typeof body?.passcode === "string" ? body.passcode : "";
    const [row] = await sql`select passcode_hash from user_settings where singleton = true`;
    if (row?.passcode_hash && row.passcode_hash !== (await hashPasscode(passcode))) {
      return NextResponse.json({ error: "That passcode isn't right" }, { status: 401 });
    }
    await sql`update user_settings set passcode_hash = null, updated_at = now() where singleton = true`;
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(PASSCODE_COOKIE);
    return res;
  }

  if (action === "lock") {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(PASSCODE_COOKIE);
    return res;
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
