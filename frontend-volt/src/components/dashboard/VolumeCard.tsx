import { Link } from "react-router";
import { Card } from "../ui/Card";
import { useWorkoutLogsRange } from "@/api/workoutLog";
import { currentWeekRange, dayIndexMon0, todayLocalIso } from "@/lib/date";
import { cn } from "@/lib/cn";
import type { WorkoutLogSummary } from "@/types/workoutLog";
import { MIN_H } from "@/types/shared";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Fold a week's worth of workout summaries into 7 daily volume totals, indexed
 * Monday (0) → Sunday (6) to match the fixed weekday labels on the card.
 */
function bucketWeeklyVolume(logs: WorkoutLogSummary[]): number[] {
  const dailyVolume = new Array<number>(7).fill(0);
  logs.forEach((log) => {
    const dayIdx = dayIndexMon0(log.date);
    dailyVolume[dayIdx] += log.totalVolume;
  });
  return dailyVolume;
}

export function VolumeCard() {
  const week = currentWeekRange();
  const { data, isLoading: logsLoading } = useWorkoutLogsRange(week);
  const logs = data ?? [];

  const dailyVolume = bucketWeeklyVolume(logs);
  const total = dailyVolume.reduce((sum, v) => sum + v, 0);
  // Normalize bar heights against the busiest day; guard against divide-by-zero.
  const max = Math.max(...dailyVolume, 1);
  const todayIdx = dayIndexMon0(todayLocalIso());

  if (logsLoading) {
    return (
      <div
        className={`${MIN_H} rounded-2xl border border-white/5 bg-ink-900 animate-pulse`}
      />
    );
  }

  return (
    <Link to="/workouts" className="block">
      <Card interactive>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-caption">Weekly volume</span>
          <span className="text-xs font-medium text-bone-300">
            {total.toLocaleString()} lbs
          </span>
        </div>
        <div className="flex h-20 items-end gap-2">
          {dailyVolume.map((vol, i) => {
            const isToday = i === todayIdx;
            const isFuture = i > todayIdx;
            // Past/today bars scale with volume (with a sliver floor so empty days
            // still register); future days are dashed placeholders.
            const heightPct = isFuture ? 18 : Math.max((vol / max) * 100, 4);
            return (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-md",
                  isToday
                    ? "bg-volt-500"
                    : isFuture
                      ? "border border-dashed border-white/10 bg-ink-800"
                      : "bg-ink-700",
                )}
                style={{ height: `${heightPct}%` }}
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-medium text-bone-500">
          {DAY_LABELS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
      </Card>
    </Link>
  );
}
