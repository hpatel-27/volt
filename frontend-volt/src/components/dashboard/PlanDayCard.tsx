import { Link } from "react-router";
import { Card } from "../ui/Card";
import { useActiveWorkoutPlan, useWorkoutPlanDetail } from "@/api/workoutPlan";
import { useWorkoutLogs } from "@/api/workoutLog";
import { selectNextPlanDay } from "@/lib/plan";
import { LIMIT } from "@/types/shared";
import { ArrowRight } from "lucide-react";

/**
 * Hero card for the user's active plan. Surfaces the next day in the plan's
 * rotation (derived from recent logs) and links to the log page to start it.
 */
export function PlanDayCard() {
  const { data: plan, isLoading } = useActiveWorkoutPlan();
  const { data: planDetail } = useWorkoutPlanDetail(plan?.id ?? "", {
    enabled: !!plan?.id,
  });
  // Recent logs drive the rotation; the list endpoint returns them newest-first.
  const { data: logPage } = useWorkoutLogs({ page: 1, limit: LIMIT });

  if (isLoading) {
    return (
      <div className="h-33 rounded-2xl border border-white/5 bg-ink-900 animate-pulse" />
    );
  }

  // Empty state: no active plan yet — invite the user to create one.
  if (!plan) {
    return (
      <Card className="flex items-center justify-between">
        <div>
          <div className="text-caption mb-1">No active plan</div>
          <div className="font-display text-xl font-bold">
            Build your first plan
          </div>
        </div>
        <Link
          to="/plans"
          className="inline-flex h-9 items-center rounded-xl bg-volt-500 px-4 text-sm font-semibold text-ink-950"
        >
          Create <ArrowRight size={14} />
        </Link>
      </Card>
    );
  }

  const days = [...(planDetail?.workoutDays ?? [])].sort(
    (a, b) => a.order - b.order,
  );
  const currentDay = selectNextPlanDay(days, logPage?.workoutLogs ?? []);

  return (
    <Link to="/workouts" className="block">
      <div className="rounded-2xl bg-linear-to-br from-volt-500 to-volt-600 text-ink-950 p-5 transition-colors hover:from-volt-600 hover:to-volt-600">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider">
            Next workout
          </span>
          <span className="text-xs font-semibold opacity-70">{plan.name}</span>
        </div>
        <div className="font-display text-3xl font-bold">
          {currentDay ? currentDay.name : plan.name}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-ink-950/10 pt-3">
          <span className="text-sm font-semibold opacity-80">
            {currentDay
              ? `${currentDay.exercises?.length ?? 0} exercises · ~${(currentDay.exercises?.length ?? 0) * 8} min`
              : "Add days to your plan"}
          </span>
          <span className="text-xs font-semibold opacity-70">
            {currentDay ? "Tap to log" : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
