import { useRef, useState } from "react";
import { toast } from "sonner";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import {
  useCreateWorkoutDay,
  useDeleteWorkoutDay,
  useUpdateWorkoutDay,
} from "@/api/workoutDay";
import type { WorkoutDayEntry } from "@/types/workoutDay";
import { parseBoundedString } from "@/lib/validate";
import { LIMITS } from "@/lib/limits";

interface WorkoutDayEntrySheetProps {
  open: boolean;
  onClose: () => void;
  planId: string;
  // Present = edit that day, null/undefined = create a new one
  day?: WorkoutDayEntry | null;
}

export function WorkoutDayEntrySheet({
  open,
  onClose,
  planId,
  day,
}: WorkoutDayEntrySheetProps) {
  const isEdit = !!day;

  // Parent remounts this sheet via a changing key, so this lazy initializer
  // re-runs with the current day on each open
  const [name, setName] = useState(() => (day ? day.name : ""));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const createDay = useCreateWorkoutDay();
  const updateDay = useUpdateWorkoutDay();
  const deleteDay = useDeleteWorkoutDay();
  const isPending = createDay.isPending || updateDay.isPending;

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedName = parseBoundedString(name, { maxLen: LIMITS.NAME_MAX });
    if (!trimmedName) {
      toast.error("Please enter a non-empty name for this day.");
      return;
    }

    if (isEdit && day) {
      updateDay.mutate(
        { planId, dayId: day.id, input: { name: trimmedName } },
        {
          onSuccess: () => {
            toast.success("Day updated.");
            onClose();
          },
          onError: () => toast.error("Could not update day. Please try again."),
        },
      );
      return;
    }

    createDay.mutate(
      { planId, input: { name: trimmedName } },
      {
        onSuccess: () => {
          toast.success("Day added.");
          onClose();
        },
        onError: () => toast.error("Could not add day. Please try again."),
      },
    );
  }

  function handleDelete() {
    if (!day) return;
    deleteDay.mutate(
      { planId, dayId: day.id },
      {
        onSuccess: () => {
          toast.success("Day deleted.");
          onClose();
        },
        onError: () => toast.error("Could not delete day. Please try again."),
      },
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onOpenEnd={() => nameRef.current?.focus()}
      title={isEdit ? "Edit Day" : "Add Day"}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <div className="text-caption mb-2">Name</div>
          <input
            ref={nameRef}
            type="text"
            placeholder="Push"
            value={name}
            maxLength={LIMITS.NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            className="
              w-full bg-transparent border-0 outline-none
              text-bone-100 placeholder:text-bone-600
              focus:outline-none transition
            "
          />
          <div className="h-px bg-white/5 mt-2" />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          full
          disabled={isPending}
        >
          {isPending ? "Saving..." : isEdit ? "Save changes" : "Add Day"}
        </Button>
      </form>

      {isEdit &&
        (confirmingDelete ? (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/5 pt-4">
            <span className="text-sm text-bone-300">Delete this day?</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleteDay.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={deleteDay.isPending}
              >
                {deleteDay.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mt-4 w-full border-t border-white/5 pt-4 text-center text-sm font-medium text-blaze-500 transition-colors hover:text-blaze-700 cursor-pointer"
          >
            Delete day
          </button>
        ))}
    </Sheet>
  );
}

export default WorkoutDayEntrySheet;
