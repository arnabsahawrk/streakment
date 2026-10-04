export type StreakType = "legend" | "challenge";

export interface Streak {
  id: string;
  name: string;
  why_note: string;
  type: StreakType;
  goal_days: number | null;
  start_date: string | null;
  max_streak: number;
  reset_count: number;
  archived: boolean;
  archived_at: string | null;
  archive_reason: string | null;
  email_enabled: boolean;
  created_at: string;
  /** When a paused streak was paused (its latest reset). Read-only; the
   *  list endpoint works it out from the existing reset history. */
  paused_at?: string | null;
}

export interface ResetEntry {
  id: string;
  streak_reached: number;
  note: string | null;
  run_start: string;
  reset_at: string;
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
