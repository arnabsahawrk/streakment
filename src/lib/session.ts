import { cookies } from "next/headers";
import crypto from "crypto";
import sql from "@/lib/db";
import type { UserSettings } from "@/lib/types";

export const PASSCODE_COOKIE = "sm_unlocked";

/** The passcode is encrypted, not hashed - on request, the exact
 *  original has to be recoverable to email back (see the "recover"
 *  action in /api/passcode). AES-256-GCM keyed from PASSCODE_KEY, so
 *  it's unreadable from a plain database browse but not one-way. */
function key(): Buffer {
  return crypto.createHash("sha256").update(process.env.PASSCODE_KEY ?? "").digest();
}

export function encryptPasscode(passcode: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(passcode, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64");
}

export function decryptPasscode(blob: string): string {
  const data = Buffer.from(blob, "base64");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const enc = data.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

/** Reads the one settings row, creating it on first access. Personal
 *  single-user app: there is exactly one of these, always. */
export async function getSettings(): Promise<UserSettings> {
  const [row] = await sql`
    insert into user_settings (singleton) values (true)
    on conflict (singleton) do update set updated_at = user_settings.updated_at
    returning *
  `;
  return {
    email_milestones: row.email_milestones,
    timezone: row.timezone,
    has_passcode: !!row.passcode_enc,
  };
}

/** The one real security boundary in the app. If a passcode is set,
 *  the request must carry a cookie matching the stored (encrypted)
 *  value exactly - a plain string compare, no decryption needed for
 *  every request. No passcode set means the app is intentionally wide
 *  open (e.g. first run). Every page and API route that touches streak
 *  data calls this. */
export async function isUnlocked(): Promise<boolean> {
  const [row] = await sql`select passcode_enc from user_settings where singleton = true`;
  if (!row?.passcode_enc) return true;
  const cookie = (await cookies()).get(PASSCODE_COOKIE)?.value;
  return !!cookie && cookie === row.passcode_enc;
}
