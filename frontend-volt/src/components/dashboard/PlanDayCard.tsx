import { Link } from "react-router";
import { Card } from "../ui/Card";
import { useActiveWorkoutPlan, useWorkoutPlanDetail } from "@/api/workoutPlan";
import { useWorkoutLogs } from "@/api/workoutLog";
import { selectNextPlanDay } from "@/lib/plan";
import { useMounted } from "@/lib/useMounted";
import { LIMIT, MIN_H } from "@/types/shared";
import { ArrowRight } from "lucide-react";

/**
 * Hero card for the user's active plan. Surfaces the next day in the plan's
 * rotation (derived from recent logs) and links to the log page to start it.
 */
export function PlanDayCard() {
  const { data: plan, isLoading: planLoading } = useActiveWorkoutPlan();
  const { data: planDetail, isLoading: detailLoading } = useWorkoutPlanDetail(
    plan?.id ?? "",
    { enabled: !!plan?.id },
  );
  // Recent logs drive the rotation; the list endpoint returns them newest-first.
  const { data: logPage, isLoading: logsLoading } = useWorkoutLogs({
    page: 1,
    limit: LIMIT,
  });

  // Gate the skeleton on the queries whose data determines what we render, so
  // we don't briefly flash the "no days" empty state before the dependent
  // detail/logs queries resolve.
  const showSkeleton = planLoading || detailLoading || logsLoading;

  if (showSkeleton) {
    return (
      <div
        className={`${MIN_H} rounded-2xl border border-white/5 bg-ink-900 animate-pulse`}
      />
    );
  }

  // Empty state: no active plan yet — invite the user to create one.
  if (!plan) {
    return (
      <Card className={`${MIN_H} flex items-center justify-between`}>
        <div>
          <div className="text-caption mb-1">No active plan</div>
          <div className="font-display text-xl font-bold">
            Build your first plan
          </div>
        </div>
        <Link
          to="/plans"
          className="inline-flex h-9 items-center gap-1 rounded-xl bg-volt-500 px-4 text-sm font-semibold text-ink-950"
        >
          <span>Create</span>
          <ArrowRight size={14} />
        </Link>
      </Card>
    );
  }

  const days = [...(planDetail?.workoutDays ?? [])].sort(
    (a, b) => a.order - b.order,
  );
  const currentDay = selectNextPlanDay(days, logPage?.workoutLogs ?? []);

  // Preview the first two exercises (by their own order) as an information
  // scent for what the session holds, with a "+N" tail for the rest.
  const exercises = [...(currentDay?.exercises ?? [])].sort(
    (a, b) => a.order - b.order,
  );
  const count = exercises.length;
  const previewNames = exercises.slice(0, 2).map((e) => e.exercise.name);
  const previewText =
    previewNames.join(" · ") + (count > 2 ? ` +${count - 2}` : "");

  return (
    <PlanDayHero
      planName={plan.name}
      heroTitle={currentDay ? currentDay.name : "Add your first day"}
      footerLabel={
        currentDay
          ? count > 0
            ? previewText
            : "No exercises yet"
          : "Add days to your plan"
      }
      showLogCta={!!currentDay}
    />
  );
}

/**
 * The resolved hero card. Rendered only once data has loaded, so its mount
 * coincides with its first paint — letting `useMounted` drive the entrance
 * transition instead of the animation being spent behind the skeleton.
 */
function PlanDayHero({
  planName,
  heroTitle,
  footerLabel,
  showLogCta,
}: {
  planName: string;
  heroTitle: string;
  footerLabel: string;
  showLogCta: boolean;
}) {
  const mounted = useMounted();

  return (
    <Link to="/workouts" className="block">
      <div
        className={`${MIN_H} flex flex-col rounded-2xl bg-linear-to-br from-volt-500 to-volt-600 text-ink-950 p-5 transition-all duration-500 ease-out hover:to-volt-500 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider">
            Next workout
          </span>
          <span className="text-xs font-semibold opacity-70">{planName}</span>
        </div>
        <div className="font-display text-3xl font-bold">{heroTitle}</div>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink-950/10 pt-3">
          <span className="min-w-0 pr-0.5 truncate text-sm font-semibold italic opacity-80">
            {footerLabel}
          </span>
          {showLogCta && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold not-italic opacity-70">
              Tap to log
              <ArrowRight size={12} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
