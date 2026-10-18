/** Shared text ceilings, mirrored by CHECK constraints in schema.sql so a
 *  bug in one layer can't bypass the other. Kept tight enough that
 *  writing one of these is a quick note, not an essay. */
export const LIMITS = {
  name: 80,
  why: 800,
  /** Closing note: Finish and Archive, Archive and Infinite, archive early,
   *  and the note a failed Challenge must leave. */
  closingNote: 300,
  /** The optional "What happened?" when a Legend fails. */
  failNote: 200,
} as const;

export function clamp(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
