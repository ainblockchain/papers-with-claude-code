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

export interface StreakStyle {
  color: string;
  iconStyle: React.CSSProperties;
  animate: boolean;
}

/**
 * Get visual style for streak badge using continuous interpolation (0–100).
 * - Color: HSL hue 120 (green) → 0 (red), linear over streak 1–100
 * - Scale: 1.0 → 1.5, applied via transform (no layout shift)
 * - Glow: drop-shadow blur 0px → 10px, proportional to streak
 * - Pulse animation: enabled at streak >= 5
 */
export function getStreakStyle(streak: number): StreakStyle {
  if (streak === 0) {
    return {
      color: 'hsl(0, 0%, 64%)',
      iconStyle: { transform: 'scale(1)' },
      animate: false,
    };
  }

  const t = Math.min(streak, 100) / 100; // 0..1
  const hue = Math.round(120 * (1 - t));  // 120 (green) → 0 (red)
  const color = `hsl(${hue}, 70%, 50%)`;
  const scale = 1 + t * 0.5;              // 1.0 → 1.5
  const blur = Math.round(2 + t * 8);     // 2px → 10px

  return {
    color,
    iconStyle: {
      transform: `scale(${scale})`,
      filter: `drop-shadow(0 0 ${blur}px ${color})`,
    },
    animate: streak >= 5,
  };
}

/**
 * Extract activity timestamps (ms) from UserProgress[].
 * Includes stage completions and lastAccessedAt as fallback
 * (so streak reflects any learning activity, not just recorded completions).
 */
export function extractActivityTimestamps(progressList: UserProgress[]): number[] {
  const timestamps: number[] = [];
  for (const progress of progressList) {
    for (const stage of progress.completedStages) {
      if (stage.completedAt) {
        timestamps.push(new Date(stage.completedAt).getTime());
      }
    }
    if (progress.lastAccessedAt) {
      const t = new Date(progress.lastAccessedAt).getTime();
      if (t > 0) timestamps.push(t);
    }
  }
  return timestamps;
}
