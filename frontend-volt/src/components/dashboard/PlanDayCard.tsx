import { Link } from "react-router";
import { Card } from "../ui/Card";
import { useActiveWorkoutPlan } from "@/api/workoutPlan";

/**
 * Hero card for the user's active plan.
 *
 * SCAFFOLD: until workout logs are linked to a plan day, we can't derive the
 * "current day" in the rotation, so this links straight to the log page and
 * surfaces the plan name. Once logs carry `workoutDayId`, swap the hero text
 * for the rotation-selected day and point the link at `/plans/:planId`.
 */
export function PlanDayCard() {
  const { data: plan, isLoading } = useActiveWorkoutPlan();

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
          Create →
        </Link>
      </Card>
    );
  }

  return (
    <Link to="/workouts" className="block">
      <div className="rounded-2xl bg-linear-to-br from-volt-500 to-volt-600 text-ink-950 p-5 transition-colors hover:from-volt-600 hover:to-volt-600">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider">
            Today&rsquo;s workout
          </span>
          <span className="text-[11px] font-semibold opacity-70">
            {plan.daysPerWeek} day{plan.daysPerWeek === 1 ? "" : "s"} / week
          </span>
        </div>
        <div className="font-display text-3xl font-bold">{plan.name}</div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-semibold opacity-80">Tap to log</span>
          <span className="inline-flex h-9 cursor-pointer items-center rounded-xl bg-ink-950 px-4 text-sm font-semibold text-volt-500">
            Start →
          </span>
        </div>
      </div>
    </Link>
  );
}
