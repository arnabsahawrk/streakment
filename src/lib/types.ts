export type StreakKind = "ascent" | "sprint";

export interface Streak {
  id: string;
  name: string;
  why_note: string;
  kind: StreakKind;
  goal_days: number | null;
  start_date: string | null;
  max_streak: number;
  reset_count: number;
  archived: boolean;
  archived_at: string | null;
  archive_reason: string | null;
  email_enabled: boolean;
  created_at: string;
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
