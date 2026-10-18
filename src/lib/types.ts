export type StreakType = "challenge" | "legend" | "infinite";

export interface Streak {
  id: string;
  name: string;
  why_note: string;
  type: StreakType;
  /** Challenge only, 1 to 365. */
  goal_days: number | null;
  /** Null = a paused Legend. */
  start_date: string | null;
  /** When a Legend was paused. Cleared on Begin. */
  paused_at: string | null;
  max_streak: number;
  fail_count: number;
  /** The one-time rename has been used. */
  renamed: boolean;
  archived: boolean;
  archived_at: string | null;
  /** The closing note. */
  archive_reason: string | null;
  /** Infinite only: stopped for good. */
  stopped_at: string | null;
  /** Infinite only: the archived Legend it came from. */
  infinite_from: string | null;
  email_enabled: boolean;
  created_at: string;
  /** Archive list only: this Legend went on as an Infinite streakment. */
  continued_as_infinite?: boolean;
}

/** One failed run, from the fail_log table. */
export interface FailEntry {
  id: string;
  streak_reached: number;
  note: string | null;
  run_start: string;
  failed_at: string;
}

export interface UserSettings {
  email_milestones: boolean;
  timezone: string;
  has_passcode: boolean;
}

/** One device that has biometric unlock switched on. */
export interface BiometricDevice {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
}

/** What the archive route returns: the archived row, and the new Infinite row
 *  when the Legend went on as one. */
export interface ArchiveResult {
  archived: Streak;
  infinite: Streak | null;
}
