import { useParams, Link } from "react-router";
import { useState } from "react";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { ExerciseLogCard } from "../components/workout/ExerciseLogCard";
import { ExercisePickerSheet } from "../components/workout/ExercisePickerSheet";
import { SetLoggerSheet } from "../components/workout/SetLoggerSheet";
import { WorkoutLogEntrySheet } from "../components/workout/WorkoutLogEntrySheet";
import { useWorkoutLogDetail } from "@/api/workoutLog";
import { useCreateExerciseLog, useDeleteExerciseLog } from "@/api/exerciseLog";
import { formatRelativeDate } from "@/lib/date";
import type { ExerciseLog } from "@/types/exerciseLog";
import type { SetLog } from "@/types/setLog";
import type { ExerciseRef } from "@/types/exercise";

type SetTarget = { exerciseLog: ExerciseLog; set: SetLog | null };

function computeSessionStats(exercises: ExerciseLog[]): {
  totalSets: number;
} {
  // Total volume could be an interesting metric but doesn't really have value
  // other than being cool

  // Compute the total sets across all the exercises
  const totalSets = exercises.reduce(
    (sum, exercise) => sum + exercise.sets.length,
    0,
  );
  return { totalSets };
}

export default function WorkoutLogDetail() {
  const { workoutLogId } = useParams<{ workoutLogId: string }>();
  const detailQuery = useWorkoutLogDetail(workoutLogId!);
  const createExercise = useCreateExerciseLog();
  const deleteExercise = useDeleteExerciseLog();
  // Which exercise log is mid-delete, so only its card shows the pending state
  // (the mutation's own isPending is shared across all cards).
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const [setSheetOpen, setSetSheetOpen] = useState(false);
  // Bumped on each open so the sheet remounts and re-picks its lazy initial state.
  const [setSheetKey, setSetSheetKey] = useState(0);
  // Retained across the sheet's close animation so ids stay valid while it slides out.
  const [setTarget, setSetTarget] = useState<SetTarget | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  // Bumped on open so the edit sheet remounts and re-seeds its date from the log.
  const [editKey, setEditKey] = useState(0);

  function openPicker() {
    setPickerKey((k) => k + 1);
    setPickerOpen(true);
  }

  function openEditSheet() {
    setEditKey((k) => k + 1);
    setEditOpen(true);
  }

  function openSetSheet(exerciseLog: ExerciseLog, set: SetLog | null = null) {
    setSetTarget({ exerciseLog, set });
    setSetSheetKey((k) => k + 1);
    setSetSheetOpen(true);
  }

  function handleSelectExercise(exercise: ExerciseRef) {
    if (!workoutLogId) return;
    createExercise.mutate(
      { workoutLogId, exerciseId: exercise.id },
      {
        onError: () => toast.error("Could not add exercise. Please try again."),
      },
    );
  }

  function handleDeleteExercise(exerciseLog: ExerciseLog) {
    if (!workoutLogId) return;
    setDeletingId(exerciseLog.id);
    deleteExercise.mutate(
      { workoutLogId, exerciseLogId: exerciseLog.id },
      {
        onSuccess: () => toast.success("Exercise removed."),
        onError: () =>
          toast.error("Could not remove exercise. Please try again."),
        onSettled: () => setDeletingId(null),
      },
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="pt-8">
        <Spinner />
      </div>
    );
  }

  const log = detailQuery.data;
  const exercises = log?.exercises ?? [];
  const stats = computeSessionStats(exercises);

  return (
    <div className="space-y-6 pt-4">
      <header className="flex items-center gap-3">
        <Link
          to="/workouts"
          className="grid h-9 w-9 place-items-center rounded-xl text-bone-300 transition-colors hover:bg-ink-800 hover:text-bone-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="text-caption text-bone-500">Workout</div>
          <h1 className="font-display text-xl font-bold leading-tight">
            {log ? formatRelativeDate(log.date) : "Log"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            leading={<Plus className="h-4 w-4" />}
            onClick={openPicker}
          >
            Exercise
          </Button>
          {log && (
            <Button
              size="sm"
              variant="ghost"
              leading={<Pencil className="h-4 w-4 text-bone-500" />}
              onClick={openEditSheet}
              aria-label="Edit workout"
              className="w-9 px-0"
            />
          )}
        </div>
      </header>

      {/* The session's dominant number — one figure at display scale. */}
      <Card className="flex flex-col items-center gap-1 py-8">
        <span className="font-display text-display font-bold leading-none text-volt-500">
          {stats.totalSets}
        </span>
        <span className="text-caption text-bone-500">
          {stats.totalSets === 1 ? "set" : "sets"} logged
        </span>
        <span className="mt-2 font-mono text-xs text-bone-500">
          {exercises.length} {exercises.length === 1 ? "exercise" : "exercises"}
        </span>
      </Card>

      {exercises.length > 0 ? (
        <div className="space-y-3">
          {exercises.map((ex) => (
            <ExerciseLogCard
              key={ex.id}
              exerciseLog={ex}
              onAddSet={() => openSetSheet(ex)}
              onEditSet={(set) => openSetSheet(ex, set)}
              onDelete={() => handleDeleteExercise(ex)}
              deleting={deletingId === ex.id}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-display text-base font-semibold text-bone-50">
            No exercises yet
          </p>
          <p className="text-caption max-w-60 text-bone-500 normal-case tracking-normal">
            Add an exercise to start logging sets for this workout.
          </p>
          <Button
            size="sm"
            leading={<Plus className="h-4 w-4" />}
            onClick={openPicker}
            className="mt-1"
          >
            Add exercise
          </Button>
        </div>
      )}

      <ExercisePickerSheet
        key={`picker-${pickerKey}`}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectExercise}
      />

      {log && (
        <WorkoutLogEntrySheet
          key={`edit-${editKey}`}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          log={log}
        />
      )}

      {setTarget && workoutLogId && (
        <SetLoggerSheet
          key={`set-${setSheetKey}`}
          open={setSheetOpen}
          onClose={() => setSetSheetOpen(false)}
          workoutLogId={workoutLogId}
          exerciseLogId={setTarget.exerciseLog.id}
          exerciseName={setTarget.exerciseLog.exercise.name}
          set={setTarget.set}
        />
      )}
    </div>
  );
}
