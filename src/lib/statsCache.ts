/** The Stats screen keeps its last answer for a minute so opening it twice
 *  is instant and costs no database read. Any change to a streakment
 *  drops it, so the numbers are never stale. */
export const statsCache: { at: number; data: unknown } = { at: 0, data: null };

export function dropStatsCache() {
  statsCache.at = 0;
  statsCache.data = null;
}
