import { NextResponse } from "next/server";
import sql from "@/lib/db";
import {
  decryptPasscode,
  encryptPasscode,
  isUnlocked,
  PASSCODE_COOKIE,
  UNLOCK_COOKIE_OPTS,
} from "@/lib/session";
import { safeEqual } from "@/lib/compare";
import { removeAllCredentials } from "@/lib/webauthn";
import { sendEmail, emailShell, esc } from "@/lib/email";
import { NOTIFY_EMAIL } from "@/lib/config";
import { failure } from "@/lib/api";

const COOKIE_OPTS = UNLOCK_COOKIE_OPTS;

/** Keep in step with the SQL in "unlock" below. */
const MAX_TRIES = 5;
const LOCK_MINUTES = 15;

/** The stored passcode, or null if it can't be read (PASSCODE_KEY changed). */
function readPasscode(enc: string): string | null {
  try {
    return decryptPasscode(enc);
  } catch {
    return null;
  }
}

/** Constant-time check of what was typed against the stored passcode. */
function matches(enc: string, typed: string): boolean {
  const real = readPasscode(enc);
  return real !== null && safeEqual(real, typed);
}

const text = (v: unknown) => (typeof v === "string" ? v : "");

/** The only lock in the app. The passcode is encrypted (not hashed) so
 *  "recover" can email it back. Unlocking sets a cookie holding the
 *  encrypted value itself, never the plain passcode, so every later request
 *  is one constant-time compare against the database (see isUnlocked).
 *
 *  "unlock" and "recover" are the only actions allowed while locked, which
 *  is the point of both. Everything else needs the app unlocked already, so
 *  a passcode can't be changed, removed or read by someone without it.
 *
 *  Brute force: 5 wrong tries lock the passcode screen for 15 minutes.
 *  Biometric unlock is not throttled. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  if (action === "unlock") {
    const typed = text(body?.passcode);

    // Count this try FIRST, in one statement, so a burst of parallel guesses
    // can't slip past the limit. The fifth try sets the lock itself. A
    // correct passcode wipes the count again below. (Numbers here match
    // MAX_TRIES and LOCK_MINUTES.)
    const [row] = await sql`
      update user_settings set
        failed_unlocks = case when locked_until is not null and locked_until <= now()
                              then 1 else failed_unlocks + 1 end,
        locked_until = case when (case when locked_until is not null and locked_until <= now()
                                       then 1 else failed_unlocks + 1 end) >= 5
                            then now() + interval '15 minutes' else null end
      where singleton = true and passcode_enc is not null
        and (locked_until is null or locked_until <= now())
      returning passcode_enc, failed_unlocks, locked_until
    `;

    if (!row) {
      const [cur] = await sql`
        select passcode_enc is not null as has_passcode,
               greatest(0, ceil(extract(epoch from (locked_until - now()))))::int as wait
        from user_settings where singleton = true
      `;
      if (cur?.has_passcode && cur.wait > 0) {
        const mins = Math.max(1, Math.ceil(cur.wait / 60));
        const res = NextResponse.json(
          { error: `Too many wrong tries. Try again in ${mins} ${mins === 1 ? "minute" : "minutes"}.`, locked: true, retry_after: cur.wait },
          { status: 429 },
        );
        res.headers.set("Retry-After", String(cur.wait));
        return res;
      }
      return failure("That passcode isn't right.", 401);
    }

    const real = readPasscode(row.passcode_enc);
    if (real === null) return failure("The passcode can't be read. Check PASSCODE_KEY.", 500);

    if (safeEqual(real, typed)) {
      await sql`update user_settings set failed_unlocks = 0, locked_until = null where singleton = true`;
      const res = NextResponse.json({ ok: true });
      res.cookies.set(PASSCODE_COOKIE, row.passcode_enc, COOKIE_OPTS);
      return res;
    }

    if (row.locked_until) {
      const res = NextResponse.json(
        { error: `Too many wrong tries. Locked for ${LOCK_MINUTES} minutes.`, locked: true, retry_after: LOCK_MINUTES * 60 },
        { status: 429 },
      );
      res.headers.set("Retry-After", String(LOCK_MINUTES * 60));
      return res;
    }
    return NextResponse.json(
      { error: "That passcode isn't right.", attempts_left: Math.max(0, MAX_TRIES - row.failed_unlocks) },
      { status: 401 },
    );
  }

  if (action === "recover") {
    // At most one email a minute: claim the slot first, in one statement.
    const [row] = await sql`
      update user_settings set recover_sent_at = now()
      where singleton = true and passcode_enc is not null
        and (recover_sent_at is null or recover_sent_at <= now() - interval '1 minute')
      returning passcode_enc
    `;
    if (!row) {
      const [cur] = await sql`select passcode_enc is not null as has_passcode from user_settings where singleton = true`;
      return cur?.has_passcode
        ? failure("Wait a minute before asking again.", 429)
        : failure("No passcode is set.", 400);
    }

    const passcode = readPasscode(row.passcode_enc);
    if (passcode === null) {
      await sql`update user_settings set recover_sent_at = null where singleton = true`;
      return failure("The passcode can't be read. Check PASSCODE_KEY.", 500);
    }

    const ok = await sendEmail({
      to: NOTIFY_EMAIL,
      subject: "Your Streakment passcode",
      html: emailShell(
        "Your passcode",
        `<p style="margin:0 0 12px;color:#F2ECE3;font-size:15px;line-height:1.6">It's <strong style="letter-spacing:2px;font-size:20px">${esc(passcode)}</strong>.</p>
<p style="margin:0;color:#A79C8C;font-size:14px;line-height:1.6">Change it in Settings after you unlock.</p>`,
      ),
    });
    if (!ok) {
      // Release the slot so a failed send doesn't cost a minute.
      await sql`update user_settings set recover_sent_at = null where singleton = true`;
      return failure("Couldn't send the email.", 502);
    }
    return NextResponse.json({ ok: true });
  }

  if (!(await isUnlocked())) return failure("Locked", 401);

  if (action === "set") {
    const passcode = text(body?.passcode);
    if (passcode.length < 4 || passcode.length > 64) {
      return failure("Use at least 4 characters.", 400);
    }
    const enc = encryptPasscode(passcode);
    // Only while none is set (one statement, so two tabs can't both set one).
    const [row] = await sql`
      update user_settings set passcode_enc = ${enc}, failed_unlocks = 0, locked_until = null, updated_at = now()
      where singleton = true and passcode_enc is null
      returning singleton
    `;
    if (!row) return failure("A passcode is already set. Use Change instead.", 400);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(PASSCODE_COOKIE, enc, COOKIE_OPTS);
    return res;
  }

  if (action === "change") {
    const current = text(body?.currentPasscode);
    const next = text(body?.newPasscode);
    if (next.length < 4 || next.length > 64) {
      return failure("The new passcode needs at least 4 characters.", 400);
    }
    const [row] = await sql`select passcode_enc from user_settings where singleton = true`;
    if (!row?.passcode_enc || !matches(row.passcode_enc, current)) {
      return failure("The current passcode isn't right.", 401);
    }
    const enc = encryptPasscode(next);
    await sql`update user_settings set passcode_enc = ${enc}, updated_at = now() where singleton = true`;
    const res = NextResponse.json({ ok: true });
    res.cookies.set(PASSCODE_COOKIE, enc, COOKIE_OPTS);
    return res;
  }

  if (action === "remove") {
    const typed = text(body?.passcode);
    const [row] = await sql`select passcode_enc from user_settings where singleton = true`;
    if (row?.passcode_enc && !matches(row.passcode_enc, typed)) {
      return failure("That passcode isn't right.", 401);
    }
    await sql`update user_settings set passcode_enc = null, failed_unlocks = 0, locked_until = null, updated_at = now() where singleton = true`;
    // Biometrics only exist on top of a passcode, so they go with it.
    await removeAllCredentials();
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(PASSCODE_COOKIE);
    return res;
  }

  if (action === "lock") {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(PASSCODE_COOKIE);
    return res;
  }

  return failure("Unknown action.", 400);
}
