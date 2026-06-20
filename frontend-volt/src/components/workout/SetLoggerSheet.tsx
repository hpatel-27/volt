import { useRef, useState } from "react";
import { toast } from "sonner";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import {
  useCreateSetLog,
  useUpdateSetLog,
  useDeleteSetLog,
} from "@/api/setLog";
import type { SetLog } from "@/types/setLog";
import { parseNonNegativeNumber, parsePositiveInt } from "@/lib/validate";
import { LIMITS } from "@/lib/limits";

interface SetLoggerSheetProps {
  open: boolean;
  onClose: () => void;
  workoutLogId: string;
  exerciseLogId: string;
  // Exercise name, shown as context in the sheet title.
  exerciseName?: string;
  // If a set is provided, edit it; null/undefined creates a new set.
  set?: SetLog | null;
}

export function SetLoggerSheet({
  open,
  onClose,
  workoutLogId,
  exerciseLogId,
  exerciseName,
  set,
}: SetLoggerSheetProps) {
  const isEdit = !!set;

  // Parent remounts this sheet via a changing key, so these lazy initializers
  // re-run with the current set on each open (same pattern as the plan sheets).
  const [weight, setWeight] = useState(() => (set ? String(set.weight) : ""));
  const [reps, setReps] = useState(() => (set ? String(set.reps) : ""));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const weightRef = useRef<HTMLInputElement>(null);

  const createSet = useCreateSetLog();
  const updateSet = useUpdateSetLog();
  const deleteSet = useDeleteSetLog();
  const isPending = createSet.isPending || updateSet.isPending;

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    const weightNum = parseNonNegativeNumber(weight, LIMITS.LIFT_WEIGHT_MAX);
    const repsNum = parsePositiveInt(reps, LIMITS.REPS_MAX);

    if (weightNum === false || weightNum === null) {
      toast.error(
        `Weight must be non-negative and at most ${LIMITS.LIFT_WEIGHT_MAX}.`,
      );
      return;
    }

    if (!repsNum) {
      toast.error(`Reps must be positive and at most ${LIMITS.REPS_MAX}.`);
      return;
    }

    if (isEdit && set) {
      updateSet.mutate(
        {
          workoutLogId,
          exerciseLogId,
          setLogId: set.id,
          input: { weight: weightNum, reps: repsNum },
        },
        {
          onSuccess: () => {
            toast.success("Set updated.");
            onClose();
          },
          onError: () => toast.error("Could not update set. Please try again."),
        },
      );
      return;
    }

    createSet.mutate(
      {
        workoutLogId,
        exerciseLogId,
        input: { weight: weightNum, reps: repsNum },
      },
      {
        onSuccess: () => {
          toast.success("Set logged!");
          onClose();
        },
        onError: () => toast.error("Could not log set. Please try again."),
      },
    );
  }

  function handleDelete() {
    if (!set) return;
    deleteSet.mutate(
      { workoutLogId, exerciseLogId, setLogId: set.id },
      {
        onSuccess: () => {
          toast.success("Set deleted.");
          onClose();
        },
        onError: () => toast.error("Could not delete set. Please try again."),
      },
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onOpenEnd={() => weightRef.current?.focus()}
      title={
        (isEdit ? "Edit Set" : "Add Set") +
        (exerciseName ? ` · ${exerciseName}` : "")
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            inputRef={weightRef}
            label="Weight"
            unit="lbs"
            value={weight}
            max={LIMITS.LIFT_WEIGHT_MAX}
            step="0.5"
            onChange={setWeight}
          />
          <NumberField
            label="Reps"
            unit="reps"
            value={reps}
            max={LIMITS.REPS_MAX}
            onChange={setReps}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          full
          disabled={isPending}
          className="hover:bg-volt-600"
        >
          {isPending ? "Saving..." : isEdit ? "Save changes" : "Save"}
        </Button>
      </form>

      {isEdit &&
        (confirmingDelete ? (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/5 pt-4">
            <span className="text-sm text-bone-300">Delete this set?</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleteSet.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={deleteSet.isPending}
              >
                {deleteSet.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mt-4 w-full border-t border-white/5 pt-4 text-center text-sm font-medium text-blaze-500 transition-colors hover:text-blaze-700 cursor-pointer"
          >
            Delete set
          </button>
        ))}
    </Sheet>
  );
}

interface NumberFieldProps {
  label: string;
  unit: string;
  value: string;
  max: number;
  onChange: (v: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  step?: string;
}

function NumberField({
  label,
  unit,
  value,
  onChange,
  inputRef,
  max,
  step = "1",
}: NumberFieldProps) {
  return (
    <div>
      <div className="text-caption mb-2">{label}</div>
      <div className="flex items-baseline gap-2">
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          step={step}
          min="0"
          placeholder="0"
          value={value}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className="
            flex-1 min-w-0 bg-transparent border-0 outline-none
            font-display font-bold text-2xl text-bone-200 text-right
            placeholder:text-bone-600 focus:outline-none transition scheme-dark
            [appearance:textfield]
            [&::-webkit-inner-spin-button]:appearance-none
            [&::-webkit-outer-spin-button]:appearance-none
          "
        />
        <span className="text-bone-500 text-xs">{unit}</span>
      </div>
      <div className="h-px bg-white/5 mt-2" />
    </div>
  );
}

export default SetLoggerSheet;
