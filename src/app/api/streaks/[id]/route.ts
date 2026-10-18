import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isUnlocked } from "@/lib/session";
import { LIMITS, clamp } from "@/lib/limits";
import { completedSql } from "@/lib/sqlRules";
import { failure, isId, locked, refusal, serverError } from "@/lib/api";

/** Two things can change here:
 *   - the email mute (any running or paused Challenge or Legend);
 *   - the ONE rename: name and why together, once. After that the pencil is
 *     gone for good. It is also refused once completed, once archived, and
 *     always on an Infinite streakment.
 *  The rename is a single guarded UPDATE (`renamed = false`), so two taps or
 *  two tabs can never both win. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isUnlocked())) return locked();
  const { id } = await params;
  if (!isId(id)) return failure("Not found.", 404);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return failure("Nothing to update.", 400);

  try {
    const renaming = typeof body.name === "string" || typeof body.why_note === "string";

    if (!renaming) {
      if (typeof body.email_enabled !== "boolean") return failure("Nothing to update.", 400);
      const [row] = await sql`
        update streaks set email_enabled = ${body.email_enabled}
        where id = ${id} and archived = false and type <> 'infinite'
        returning *
      `;
      if (row) return NextResponse.json(row);
      const [cur] = await sql`select * from streaks where id = ${id}`;
      const { status, message } = refusal("mute", cur);
      return failure(message, status);
    }

    const [cur] = await sql`select name, why_note from streaks where id = ${id}`;
    if (!cur) return failure("Not found.", 404);

    const name = typeof body.name === "string" ? clamp(body.name, LIMITS.name) : cur.name;
    const why = typeof body.why_note === "string" ? clamp(body.why_note, LIMITS.why) : cur.why_note;
    if (!name || !why) return failure("Name and why can't be empty.", 400);
    // A "change" that changes nothing neither succeeds nor uses the rename.
    if (name === cur.name && why === cur.why_note) {
      return failure("Nothing changed. Your one rename is still unused.", 400);
    }

    const [row] = await sql`
      update streaks set name = ${name}, why_note = ${why}, renamed = true
      where id = ${id}
        and renamed = false and archived = false and type <> 'infinite'
        and not ${completedSql()}
      returning *
    `;
    if (row) return NextResponse.json(row);
    const [now] = await sql`select * from streaks where id = ${id}`;
    const { status, message } = refusal("rename", now);
    return failure(message, status);
  } catch (e) {
    return serverError("save that", e);
  }
}
