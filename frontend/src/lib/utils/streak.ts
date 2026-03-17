import type { UserProgress } from '@/types/learning';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Convert a UTC millisecond timestamp to a KST date string "YYYY-MM-DD" */
export function toKSTDateString(timestampMs: number): string {
  const kstDate = new Date(timestampMs + KST_OFFSET_MS);
  return kstDate.toISOString().slice(0, 10);
}

/** Get today's date in KST as "YYYY-MM-DD" */
export function getTodayKST(): string {
  return toKSTDateString(Date.now());
}

/** Get the previous day's date string given a "YYYY-MM-DD" string */
function getPreviousDay(dateStr: string): string {
  // Parse as UTC noon to avoid DST issues, subtract one day
  const ms = new Date(dateStr + 'T12:00:00Z').getTime() - DAY_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Calculate current streak from an array of UTC millisecond timestamps.
 * Uses KST (UTC+9) for day boundaries.
 * Allows a 1-day grace period (if no activity today, yesterday's streak is preserved).
 */
export function calculateStreak(timestamps: number[]): number {
  if (timestamps.length === 0) return 0;

  const dateSet = new Set(timestamps.map(toKSTDateString));
  const today = getTodayKST();
  const yesterday = getPreviousDay(today);

  // Determine starting date: today or yesterday (grace period)
  let current: string;
  if (dateSet.has(today)) {
    current = today;
  } else if (dateSet.has(yesterday)) {
    current = yesterday;
  } else {
    return 0;
  }

  // Count consecutive days backward
  let streak = 1;
  while (true) {
    const prev = getPreviousDay(current);
    if (dateSet.has(prev)) {
      streak++;
      current = prev;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Extract activity timestamps (ms) from UserProgress[].
 * Only includes stage completions (stage_complete / quiz_pass events are recorded as completedStages).
 */
export function extractActivityTimestamps(progressList: UserProgress[]): number[] {
  const timestamps: number[] = [];
  for (const progress of progressList) {
    for (const stage of progress.completedStages) {
      if (stage.completedAt) {
        timestamps.push(new Date(stage.completedAt).getTime());
      }
    }
  }
  return timestamps;
}
