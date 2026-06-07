import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import {
  useCreateWorkoutLog,
  useDeleteWorkoutLog,
  useUpdateWorkoutLog,
} from "@/api/workoutLog";
import { formatRelativeDate, todayLocalIso } from "@/lib/date";
import { DATE_REGEX } from "@/types/shared";
import type { WorkoutLog } from "@/types/workoutLog";

interface WorkoutLogEntrySheetProps {
  open: boolean;
  onClose: () => void;
  // Present = edit that log (with delete). Null/undefined = create a new one.
  log?: Pick<WorkoutLog, "id" | "date"> | null;
}

export function WorkoutLogEntrySheet({
  open,
  onClose,
  log,
}: WorkoutLogEntrySheetProps) {
  const isEdit = !!log;
  const today = todayLocalIso();
  // Parent remounts via a changing key, so this lazily seeds from the current
  // log's date (edit) or today (create) on every open.
  const [date, setDate] = useState(() => log?.date ?? today);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const navigate = useNavigate();

  const createWorkoutLog = useCreateWorkoutLog();
  const updateWorkoutLog = useUpdateWorkoutLog();
  const deleteWorkoutLog = useDeleteWorkoutLog();
  const isPending = createWorkoutLog.isPending || updateWorkoutLog.isPending;

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!date || !DATE_REGEX.test(date) || today < date) {
      toast.error("Invalid date provided. Please try again.");
      return;
    }

    // Narrowing on `log` (not `isEdit`) lets TS know it's non-null in here.
    if (log) {
      // Unchanged date — nothing to save, just close.
      if (date === log.date) {
        onClose();
        return;
      }
      updateWorkoutLog.mutate(
        { id: log.id, input: { date } },
        {
          onSuccess: () => {
            toast.success("Workout updated.");
            onClose();
          },
          onError: () =>
            toast.error("Could not update workout. Please try again."),
        },
      );
      return;
    }

    createWorkoutLog.mutate(
      { date },
      {
        onSuccess: (data) => {
          onClose();
          toast.success(`Workout log created for: ${formatRelativeDate(date)}`);
          navigate(`/workouts/${data.id}`);
        },
        onError: () =>
          toast.error(
            `Could not create workout log for: ${formatRelativeDate(date)}. Please try again.`,
          ),
      },
    );
  }

  function handleDelete() {
    if (!log) return;
    deleteWorkoutLog.mutate(
      { id: log.id },
      {
        onSuccess: () => {
          // Leave the detail page first — its query is removed on delete, so
          // staying would render a 404 empty state.
          navigate("/workouts");
          toast.success("Workout deleted.");
          onClose();
        },
        onError: () =>
          toast.error("Could not delete workout. Please try again."),
      },
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Workout" : "Start workout"}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <div className="text-caption mb-2">Date</div>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="
              w-full bg-transparent border-0 outline-none
              font-display font-bold text-2xl text-bone-200
              focus:outline-none transition scheme-dark
              [&::-webkit-calendar-picker-indicator]:opacity-60
              [&::-webkit-calendar-picker-indicator]:cursor-pointer
            "
          />
          <div className="h-px bg-white/5 mt-2" />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          full
          disabled={isPending || !date}
        >
          {isPending
            ? isEdit
              ? "Saving..."
              : "Starting..."
            : isEdit
              ? "Save changes"
              : "Start workout"}
        </Button>
      </form>

      {/* Delete in edit mode only — confirm-in-place, matching the plan sheet. */}
      {isEdit &&
        (confirmingDelete ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/5 pt-4">
          <span className="text-sm text-bone-300">Delete this workout?</span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleteWorkoutLog.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={deleteWorkoutLog.isPending}
            >
              {deleteWorkoutLog.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="mt-4 w-full border-t border-white/5 pt-4 text-center text-sm font-medium text-blaze-500 transition-colors hover:text-blaze-700 cursor-pointer"
        >
          Delete workout
        </button>
        ))}
    </Sheet>
  );
}

export default WorkoutLogEntrySheet;
