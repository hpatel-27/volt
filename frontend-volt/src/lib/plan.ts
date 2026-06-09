import type { WorkoutDay } from "@/types/workoutDay";
import type { WorkoutLogSummary } from "@/types/workoutLog";

export function formatPlanType(type: string) {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Pick the plan day to surface as "today's workout" via simple rotation.
 *
 * @param days - the active plan's days, already sorted by `order`
 * @param recentLogs - recent workout logs, most-recent first (the list endpoint
 *   returns them date-descending)
 * @returns the day to show next, or null when the plan has no days
 */
export function selectNextPlanDay(
  days: WorkoutDay[],
  recentLogs: WorkoutLogSummary[],
): WorkoutDay | null {
  if (days.length === 0) return null;

  const dayLookup = new Map<string, number>();
  days.forEach((day, idx) => {
    dayLookup.set(day.id, idx);
  });

  for (const log of recentLogs) {
    const idx = dayLookup.get(log.workoutDay?.id ?? "");
    if (idx !== undefined) {
      return days[(idx + 1) % days.length];
    }
  }

  // if no matching logs exist return the first day of the plan
  return days[0];
}
