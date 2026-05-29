import { Link } from "react-router";
import { Card } from "@/components/ui/Card";
import { Button } from "../components/ui/Button";
import { ChevronLeft, ChevronRight, NotebookPen, Plus } from "lucide-react";
import type { PlanFilter } from "@/types/workoutPlan";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useActiveWorkoutPlan, useWorkoutPlans } from "@/api/workoutPlan";
import { LIMIT } from "@/types/shared";
import { Spinner } from "@/components/ui/Spinner";
import WorkoutPlanEntrySheet from "@/components/workout/WorkoutPlanEntrySheet";
import { formatPlanType } from "@/lib/plan";

export default function Workouts() {
  const planFilters: PlanFilter[] = [
    "All",
    "Strength",
    "Hypertrophy",
    "Weight Loss",
  ];
  const [filter, setFilter] = useState<PlanFilter>("All");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const [page, setPage] = useState(1);
  const planQuery = useWorkoutPlans({ page, limit: LIMIT });
  const activePlanQuery = useActiveWorkoutPlan();
  const totalPages =
    planQuery.data?.total !== undefined &&
    planQuery.data?.limit !== undefined &&
    planQuery.data?.total !== 0
      ? Math.ceil(planQuery.data?.total / planQuery.data?.limit)
      : 1;
  const otherPlans = planQuery.data?.workoutPlans ?? [];
  const filteredOthers =
    filter !== "All"
      ? otherPlans.filter((p) => p.type === filter.toUpperCase())
      : otherPlans;
  const activePlan = activePlanQuery.data ?? null;
  // The list endpoint already excludes the active plan, so "no plans at all"
  // means both queries returned nothing.
  const hasNoPlans = !activePlan && otherPlans.length === 0;
  const isLoading = planQuery.isLoading || activePlanQuery.isLoading;

  // No argument = log a new workout plan.
  // Bumping the key remounts the sheet so its fields re-initialize.
  const openWorkoutPlanSheet = () => {
    setSheetKey((k) => k + 1);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Plans</h1>
        <Button
          size="sm"
          leading={<Plus className="w-4 h-4" />}
          onClick={() => openWorkoutPlanSheet()}
        >
          New
        </Button>
      </header>

      <WorkoutPlanEntrySheet
        key={sheetKey}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        isActive={false}
        plan={null}
      />

      <div className="flex gap-2">
        {planFilters.map((r) => (
          <button
            key={r}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs cursor-pointer transition",
              "hover:bg-ink-700 hover:text-bone-300 active:bg-ink-800",
              r === filter
                ? "bg-ink-800 text-bone-300 font-semibold"
                : "text-bone-500 font-medium",
            )}
            onClick={() => {
              setFilter(r);
            }}
          >
            {r}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="pt-8">
          <Spinner />
        </div>
      ) : hasNoPlans ? (
        <div className="flex flex-col items-center gap-3 min-h-[60vh] justify-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-volt-500/10">
            <NotebookPen className="h-6 w-6 text-volt-500" />
          </div>
          <p className="font-display text-lg font-semibold text-bone-50">
            Let's get started
          </p>
          <p className="text-caption max-w-60 text-bone-500 normal-case tracking-normal">
            Map out your first week of training.
          </p>
          <Button
            size="sm"
            leading={<Plus className="h-4 w-4" />}
            onClick={() => openWorkoutPlanSheet()}
            className="mt-1"
          >
            Plan
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {activePlan && (
            <Link to={`/plans/${activePlan.id}`} className="block">
              <Card interactive>
                <div className="text-caption mb-3 text-volt-500">Active</div>
                <div className="font-display text-3xl font-bold leading-none text-bone-50">
                  {activePlan.name}
                </div>
                {activePlan.type && (
                  <div className="text-caption mt-2 text-bone-500">
                    {formatPlanType(activePlan.type)}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-caption text-bone-500">
                    {activePlan.daysPerWeek} days/wk
                  </span>
                  <span className="text-xs text-bone-500 normal-case tracking-normal">
                    Pick a day to log
                  </span>
                </div>
              </Card>
            </Link>
          )}

          {otherPlans.length > 0 && (
            <div>
              <div className="mb-3 text-caption text-bone-500">Other plans</div>
              {filteredOthers.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <p className="font-display text-lg font-semibold text-bone-50">
                    No matches
                  </p>
                  <p className="text-caption max-w-60 text-bone-500 normal-case tracking-normal">
                    No plans match the active filter.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOthers.map((plan) => (
                    <Link key={plan.id} to={`/plans/${plan.id}`}>
                      <Card interactive>
                        <div className="text-caption mb-3 text-bone-500">
                          Inactive
                        </div>
                        <div className="font-display text-xl font-bold leading-none text-bone-50">
                          {plan.name}
                        </div>
                        {plan.type && (
                          <div className="text-caption mt-2 text-bone-500">
                            {formatPlanType(plan.type)}
                          </div>
                        )}
                        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                          <span className="text-caption text-bone-500">
                            {plan.daysPerWeek} days/wk
                          </span>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={page === 1}
                    leading={<ChevronLeft className="h-4 w-4" />}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <span className="-translate-y-[1.5px]">Prev</span>
                  </Button>
                  <span className="px-2 font-mono text-xs text-bone-500">
                    {page} / {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={page === totalPages}
                    trailing={<ChevronRight className="h-4 w-4" />}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <span className="-translate-y-[1.5px]">Next</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
