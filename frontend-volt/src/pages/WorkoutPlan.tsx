import { useParams, Link } from "react-router";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { ArrowLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import { useCurrentUser } from "@/api/user";
import {
  useActivateWorkoutPlan,
  useWorkoutPlanDetail,
} from "@/api/workoutPlan";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import WorkoutPlanEntrySheet from "@/components/workout/WorkoutPlanEntrySheet";
import WorkoutDayEntrySheet from "@/components/workout/WorkoutDayEntrySheet";
import WorkoutExerciseEntrySheet from "@/components/workout/WorkoutExerciseEntrySheet";

export default function WorkoutPlan() {
  const { planId } = useParams<{ planId: string }>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [daySheetKey, setDaySheetKey] = useState(0);
  const [exSheetOpen, setExSheetOpen] = useState(false);
  const [exSheetKey, setExSheetKey] = useState(0);
  const planDetailQuery = useWorkoutPlanDetail(planId!);
  const userQuery = useCurrentUser();
  const activateMutation = useActivateWorkoutPlan();
  const isActive = !!planId && userQuery.data?.activePlanId === planId;
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  if (planDetailQuery.isLoading) {
    return (
      <div className="pt-8">
        <Spinner fullscreen />
      </div>
    );
  }

  const plan = planDetailQuery.data;
  const workoutDays = plan?.workoutDays ?? [];
  const selectedDay = selectedDayId
    ? workoutDays.find((d) => d.id === selectedDayId)
    : workoutDays.length > 0
      ? workoutDays[0]
      : null;
  const exercises = selectedDay?.exercises ?? [];

  // This page only ever edits the plan it's displaying, so the sheet always
  // opens in edit mode with the current plan. Bumping the key remounts the
  // sheet so its lazy initializers re-pick the latest name/type.
  const openEditSheet = () => {
    setSheetKey((k) => k + 1);
    setSheetOpen(true);
  };
  const openDaySheet = () => {
    setDaySheetKey((k) => k + 1);
    setDaySheetOpen(true);
  };
  const openExerciseSheet = () => {
    setExSheetKey((k) => k + 1);
    setExSheetOpen(true);
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link
          to="/plans"
          className="text-bone-300 p-2 rounded-lg hover:bg-ink-600 active:bg-ink-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-caption">Editing plan</div>
          <h1 className="font-display text-lg font-bold truncate">
            {plan?.name}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isActive ? (
            <span className="text-volt-500 text-xs font-semibold tracking-wider uppercase">
              Active
            </span>
          ) : (
            <Button
              size="sm"
              onClick={() => planId && activateMutation.mutate(planId)}
              disabled={!planId || activateMutation.isPending}
            >
              {activateMutation.isPending ? "Activating…" : "Activate"}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            leading={<Pencil className="w-4 h-4 text-bone-500" />}
            onClick={openEditSheet}
            aria-label="Edit plan"
            className="w-9 px-0"
          />
        </div>
      </header>

      <WorkoutPlanEntrySheet
        key={sheetKey}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        plan={plan && { id: plan.id, name: plan.name, type: plan.type }}
      />

      {planId && (
        <WorkoutDayEntrySheet
          key={`day-${daySheetKey}`}
          open={daySheetOpen}
          onClose={() => setDaySheetOpen(false)}
          planId={planId}
        />
      )}

      {planId && selectedDay && (
        <WorkoutExerciseEntrySheet
          key={`ex-${exSheetKey}`}
          open={exSheetOpen}
          onClose={() => setExSheetOpen(false)}
          planId={planId}
          dayId={selectedDay.id}
          dayName={selectedDay.name}
        />
      )}

      <div className="flex gap-2 overflow-x-auto -mx-2 px-2 pb-1">
        {workoutDays.map((d) => {
          const active = d.id === selectedDay?.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedDayId(d.id)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs cursor-pointer transition",
                active
                  ? "bg-volt-500 text-ink-950 font-bold"
                  : "bg-ink-800 text-bone-300 font-medium hover:bg-ink-700",
              )}
            >
              {d.name}
            </button>
          );
        })}
        <Button
          size="sm"
          variant="ghost"
          leading={<Plus className="w-4 h-4" />}
          disabled={workoutDays.length >= 7}
          onClick={openDaySheet}
          className="shrink-0 border border-dashed border-white/15 text-bone-300 rounded-full"
        >
          Day
        </Button>
      </div>

      {selectedDay ? (
        <div className="space-y-3">
          <div className="text-caption">Exercises</div>

          {exercises.length > 0 ? (
            <div className="space-y-px overflow-hidden rounded-2xl border border-white/5">
              {exercises.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  className="flex w-full items-center gap-4 bg-ink-900 px-4 py-3.5 text-left transition-colors hover:bg-ink-850 focus-visible:outline-none focus-visible:bg-ink-850 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-bone-50 truncate">
                      {ex.exercise.name ?? "Exercise"}
                    </div>
                    <div className="text-xs text-bone-500 font-mono mt-1">
                      {ex.targetSets} x {ex.targetRepsMin}-{ex.targetRepsMax} |{" "}
                      {ex.restSeconds}s rest
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-bone-500" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-bone-500 text-center py-6">
              No exercises yet for {selectedDay.name}.
            </p>
          )}

          <button
            type="button"
            onClick={openExerciseSheet}
            className="w-full h-12 rounded-2xl border border-dashed border-white/15 text-bone-300 text-sm font-medium hover:bg-ink-900 cursor-pointer transition-colors"
          >
            + Add exercise
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 min-h-[40vh] justify-center text-center">
          <p className="font-display text-lg font-semibold text-bone-50">
            Build your first day
          </p>
          <p className="text-caption max-w-60 text-bone-500 normal-case tracking-normal">
            Add a day to start mapping out exercises.
          </p>
        </div>
      )}
    </div>
  );
}
