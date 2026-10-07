import sql from "./db";

let known = false;

/** A paused streakment remembers the moment it was paused (paused_at), so
 *  "Paused for 12d 04:11:09" survives closing the app - a pause can last
 *  days or months. That is one small timestamp column, added by section 6
 *  of schema.sql.
 *
 *  The app never alters the table itself. It just asks whether the column
 *  is there (a cheap read, remembered once it's true), so it behaves
 *  correctly before and after the line is run. */
export async function hasPausedAt(): Promise<boolean> {
  if (known) return true;
  const [row] = await sql`
    select 1 as ok from information_schema.columns
    where table_schema = current_schema() and table_name = 'streaks' and column_name = 'paused_at'
  `;
  known = !!row;
  return known;
}

/** Streakments paused before the column existed have no stored pause time.
 *  For those, fall back to the latest logged reset, which is when they
 *  stopped whenever the run lasted at least a day. Anything still unknown
 *  stays null and the card simply says "Paused". */
export async function fillPausedAt(rows: Record<string, unknown>[]): Promise<void> {
  const need = rows.filter((r) => !r.start_date && !r.paused_at).map((r) => r.id as string);
  if (need.length === 0) return;
  const logs = await sql`
    select streak_id, max(reset_at) as at from reset_log
    where streak_id in ${sql(need)}
    group by streak_id
  `;
  const byId = new Map(logs.map((l) => [l.streak_id as string, l.at as Date]));
  for (const r of rows) {
    if (!r.start_date && !r.paused_at) r.paused_at = byId.get(r.id as string) ?? null;
  }
}
