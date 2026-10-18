import sql from "./db";

/** The same rules as `streak.ts`, written for SQL, so the guards in each
 *  route's WHERE clause agree with what the screens show. Each call returns
 *  a fresh fragment to drop into a query. Days are 24-hour blocks since
 *  start_date, exactly like `currentStreakDays`. */

/** Whole days since start_date (use only where start_date is not null). */
export const elapsedDaysSql = () =>
  sql`floor(extract(epoch from (now() - start_date)) / 86400)::int`;

/** Reached its goal (challenge) or 365 days (legend). Infinite never is. */
export const completedSql = () =>
  sql`(start_date is not null and (
    (type = 'challenge' and start_date + goal_days * interval '24 hours' <= now()) or
    (type = 'legend' and start_date + interval '8760 hours' <= now())
  ))`;
