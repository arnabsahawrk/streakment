import { cookies } from "next/headers";
import sql from "@/lib/db";
import type { UserSettings } from "@/lib/types";

export const PASSCODE_COOKIE = "sm_unlocked";

export async function hashPasscode(passcode: string): Promise<string> {
  const data = new TextEncoder().encode(`streakment:${passcode}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
    has_passcode: !!row.passcode_hash,
  };
}

/** The one real security boundary in the app. If a passcode is set,
 *  the request must carry a cookie matching its hash. No passcode set
 *  means the app is intentionally wide open (e.g. first run). Every
 *  page and API route that touches streak data calls this — there is
 *  no session, no account, nothing else standing in front of it. */
export async function isUnlocked(): Promise<boolean> {
  const [row] = await sql`select passcode_hash from user_settings where singleton = true`;
  if (!row?.passcode_hash) return true;
  const cookie = (await cookies()).get(PASSCODE_COOKIE)?.value;
  return cookie === row.passcode_hash;
}
