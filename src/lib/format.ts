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
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** 0 and 1 both read as "day"; only 2+ is "days". */
export function dayWord(n: number): string {
  return n <= 1 ? "day" : "days";
}

/** The name shown for each streak shape, used everywhere: the type
 *  picker, badges, and status lines. */
export function typeLabel(isChallenge: boolean): string {
  return isChallenge ? "Accept Challenge" : "Become Legend";
}
