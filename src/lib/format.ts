export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** 0 and 1 both read as "day"; only 2+ is "days". */
export function dayWord(n: number): string {
  return n <= 1 ? "day" : "days";
}

/** The simple, user-facing name for each streak shape. Internally these
 *  stay "ascent"/"sprint" (matching the database and the type system) —
 *  only the label shown to a person changes. */
export function kindLabel(isSprint: boolean): string {
  return isSprint ? "Challenge" : "Climb";
}
