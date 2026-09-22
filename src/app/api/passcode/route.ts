import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { decryptPasscode, encryptPasscode, isUnlocked, PASSCODE_COOKIE } from "@/lib/session";
import { sendEmail, emailShell } from "@/lib/email";

const NOTIFY_EMAIL = "arnabsahawrk@gmail.com";
const COOKIE_OPTS = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };

/** The only lock in the app now that there's no sign-in. The passcode is
 *  encrypted (not hashed) precisely so "recover" can work - see below.
 *  Unlocking sets a session cookie holding the encrypted value itself,
 *  never the plain passcode, so every later request is just a string
 *  compare against the database (see isUnlocked).
 *
 *  "unlock" and "recover" are the only actions allowed while locked -
 *  that's the point of both. Every other action requires already being
 *  unlocked, so a passcode can never be changed, removed, or read by
 *  someone who doesn't already have it. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  if (action === "unlock") {
    const passcode = typeof body?.passcode === "string" ? body.passcode : "";
    const [row] = await sql`select passcode_enc from user_settings where singleton = true`;
    if (!row?.passcode_enc || decryptPasscode(row.passcode_enc) !== passcode) {
      return NextResponse.json({ error: "That passcode isn't right" }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(PASSCODE_COOKIE, row.passcode_enc, COOKIE_OPTS);
    return res;
  }

  if (action === "recover") {
    const [row] = await sql`select passcode_enc from user_settings where singleton = true`;
    if (!row?.passcode_enc) {
      return NextResponse.json({ error: "No passcode is set" }, { status: 400 });
    }
    const passcode = decryptPasscode(row.passcode_enc);
    const ok = await sendEmail({
      to: NOTIFY_EMAIL,
      subject: "Your Streakment passcode",
      html: emailShell(
        "Your passcode",
        `<p style="margin:0 0 12px;color:#F2ECE3;font-size:15px;line-height:1.6">It's <strong style="letter-spacing:2px;font-size:20px">${passcode}</strong>.</p>
<p style="margin:0;color:#A79C8C;font-size:14px;line-height:1.6">Change it from Settings once I'm back in.</p>`
      ),
    });
    if (!ok) return NextResponse.json({ error: "Couldn't send the email" }, { status: 502 });
    return NextResponse.json({ ok: true });
  }

  if (!(await isUnlocked())) return NextResponse.json({ error: "Locked" }, { status: 401 });

  if (action === "set") {
    const passcode = typeof body?.passcode === "string" ? body.passcode : "";
    if (passcode.length < 4 || passcode.length > 64) {
      return NextResponse.json({ error: "Use at least 4 characters" }, { status: 400 });
    }
    const [row] = await sql`select passcode_enc from user_settings where singleton = true`;
    if (row?.passcode_enc) {
      return NextResponse.json({ error: "A passcode is already set — use Change instead" }, { status: 400 });
    }
    const enc = encryptPasscode(passcode);
    await sql`update user_settings set passcode_enc = ${enc}, updated_at = now() where singleton = true`;
    const res = NextResponse.json({ ok: true });
    res.cookies.set(PASSCODE_COOKIE, enc, COOKIE_OPTS);
    return res;
  }

  if (action === "change") {
    const current = typeof body?.currentPasscode === "string" ? body.currentPasscode : "";
    const next = typeof body?.newPasscode === "string" ? body.newPasscode : "";
    if (next.length < 4 || next.length > 64) {
      return NextResponse.json({ error: "New passcode needs at least 4 characters" }, { status: 400 });
    }
    const [row] = await sql`select passcode_enc from user_settings where singleton = true`;
    if (!row?.passcode_enc || decryptPasscode(row.passcode_enc) !== current) {
      return NextResponse.json({ error: "Current passcode isn't right" }, { status: 401 });
    }
    const enc = encryptPasscode(next);
    await sql`update user_settings set passcode_enc = ${enc}, updated_at = now() where singleton = true`;
    const res = NextResponse.json({ ok: true });
    res.cookies.set(PASSCODE_COOKIE, enc, COOKIE_OPTS);
    return res;
  }

  if (action === "remove") {
    const passcode = typeof body?.passcode === "string" ? body.passcode : "";
    const [row] = await sql`select passcode_enc from user_settings where singleton = true`;
    if (row?.passcode_enc && decryptPasscode(row.passcode_enc) !== passcode) {
      return NextResponse.json({ error: "That passcode isn't right" }, { status: 401 });
    }
    await sql`update user_settings set passcode_enc = null, updated_at = now() where singleton = true`;
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
