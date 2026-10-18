import { NextResponse } from "next/server";
import { isCompleted, kindOf, type RuleRow } from "./streak";

export const locked = () => NextResponse.json({ error: "Locked" }, { status: 401 });

export const failure = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

/** A database error: logged for the owner (no user text in the log), and a
 *  plain message for the screen. */
export function serverError(what: string, e: unknown) {
  console.error(`${what} failed:`, e instanceof Error ? e.message : "unknown error");
  return failure(`Couldn't ${what}. Try again.`, 500);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids come from the URL; anything that isn't a UUID can't exist. */
export const isId = (id: string) => UUID.test(id);

export type Action = "mute" | "rename" | "fail" | "begin" | "archive" | "archive-infinite" | "stop";

interface RefusalRow extends RuleRow {
  renamed?: boolean | null;
}

/** Every guard lives in the SQL `WHERE` of its route, so double taps and a
 *  second tab are safe. When a guarded statement changes nothing, this works
 *  out which rule said no, so the screen gets a plain, strict reason. */
export function refusal(action: Action, row: RefusalRow | undefined): { status: number; message: string } {
  if (!row) return { status: 404, message: "Not found." };
  const kind = kindOf(row);

  if (kind === "infinite") {
    return { status: 403, message: "An Infinite streakment can only be stopped." };
  }
  if (row.archived) return { status: 409, message: "Already archived." };

  const completed = isCompleted(row);
  const paused = kind === "legend" && !row.start_date;

  switch (action) {
    case "rename":
      if (completed) return { status: 403, message: "Completed. It can't be edited." };
      if (row.renamed) return { status: 403, message: "Already renamed once. It's locked." };
      break;
    case "fail":
      if (completed) return { status: 409, message: "Completed. Finish and archive it." };
      if (paused) return { status: 409, message: "Already paused. Tap Begin." };
      break;
    case "begin":
      if (kind === "challenge") return { status: 409, message: "A challenge never pauses." };
      break;
    case "archive":
      if (kind === "challenge" && !completed) {
        return { status: 409, message: "A challenge ends by completing or failing." };
      }
      break;
    case "archive-infinite":
      if (kind !== "legend" || !completed) {
        return { status: 409, message: "Only a completed Legend can become Infinite." };
      }
      break;
    default:
      break;
  }
  return { status: 409, message: "That changed. Reload and try again." };
}
