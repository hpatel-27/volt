import { useState } from "react";
import { toast } from "sonner";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { ExercisePickerSheet } from "./ExercisePickerSheet";
import {
  useCreateWorkoutExercise,
  useDeleteWorkoutExercise,
  useUpdateWorkoutExercise,
} from "@/api/workoutDayExercise";
import type {
  CreateWorkoutExerciseInput,
  UpdateWorkoutExerciseInput,
  WorkoutDayExercises,
} from "@/types/workoutDayExercise";
import type { ExerciseRef } from "@/types/exercise";
import { parsePositiveInt } from "@/lib/validate";
import { LIMITS } from "@/lib/limits";
import { OptionalTag } from "../ui/OptionalTag";

interface WorkoutExerciseEntrySheetProps {
  open: boolean;
  onClose: () => void;
  planId: string;
  dayId: string;
  dayName: string;
  // Present = edit that entry, null/undefined = create a new one.
  dayExercise: WorkoutDayExercises | null;
}

export function WorkoutExerciseEntrySheet({
  open,
  onClose,
  planId,
  dayId,
  dayName,
  dayExercise,
}: WorkoutExerciseEntrySheetProps) {
  const isEdit = !!dayExercise;

  const [selectedExercise, setSelectedExercise] = useState<ExerciseRef | null>(
    () => (dayExercise ? dayExercise.exercise : null),
  );
  const [sets, setSets] = useState(() =>
    dayExercise && dayExercise?.targetSets
      ? dayExercise.targetSets.toString()
      : "",
  );
  const [repsMin, setRepsMin] = useState(() =>
    dayExercise && dayExercise?.targetRepsMin
      ? dayExercise.targetRepsMin.toString()
      : "",
  );
  const [repsMax, setRepsMax] = useState(() =>
    dayExercise && dayExercise?.targetRepsMax
      ? dayExercise.targetRepsMax.toString()
      : "",
  );
  const [rest, setRest] = useState(() =>
    dayExercise && dayExercise?.restSeconds
      ? dayExercise.restSeconds.toString()
      : "",
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);

  const createWorkoutExercise = useCreateWorkoutExercise();
  const updateWorkoutExercise = useUpdateWorkoutExercise();
  const deleteWorkoutExercise = useDeleteWorkoutExercise();
  const isPending =
    createWorkoutExercise.isPending || updateWorkoutExercise.isPending;

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedExercise) {
      toast.error("Please pick an exercise.");
      return;
    }

    const parsedSets = parsePositiveInt(sets, LIMITS.SETS_MAX, {
      allowEmpty: true,
    });
    const parsedRepsMin = parsePositiveInt(repsMin, LIMITS.REPS_MAX, {
      allowEmpty: true,
    });
    const parsedRepsMax = parsePositiveInt(repsMax, LIMITS.REPS_MAX, {
      allowEmpty: true,
    });
    const parsedRest = parsePositiveInt(rest, LIMITS.REST_MAX, {
      allowEmpty: true,
    });

    // Could be null (empty) since field is optional
    // False means fields provided but bad
    if (parsedSets === false) {
      toast.error("Sets value must be a positive integer.");
      return;
    }
    if (parsedRepsMin === false) {
      toast.error("Minimum reps value must be a positive integer.");
      return;
    }
    if (parsedRepsMax === false) {
      toast.error("Maximum reps value must be a positive integer.");
      return;
    }
    if (parsedRest === false) {
      toast.error("Rest seconds value must be a positive integer.");
      return;
    }

    if (parsedRepsMin && parsedRepsMax && parsedRepsMin > parsedRepsMax) {
      toast.error("Minimum reps cannot exceed maximum reps.");
      return;
    }

    const fields: UpdateWorkoutExerciseInput = {
      exerciseId: selectedExercise.id,
    };

    if (parsedSets) fields.targetSets = parsedSets;
    if (parsedRepsMin) fields.targetRepsMin = parsedRepsMin;
    if (parsedRepsMax) fields.targetRepsMax = parsedRepsMax;
    if (parsedRest) fields.restSeconds = parsedRest;

    if (isEdit && dayExercise) {
      updateWorkoutExercise.mutate(
        {
          planId,
          dayId,
          dayExerciseId: dayExercise.id,
          input: fields,
        },
        {
          onSuccess: () => {
            toast.success("Exercise updated.");
            onClose();
          },
          onError: () =>
            toast.error("Could not update exercise. Please try again."),
        },
      );
      return;
    }

    const input: CreateWorkoutExerciseInput = {
      exerciseId: selectedExercise.id,
    };
    if (parsedSets) input.targetSets = parsedSets;
    if (parsedRepsMin) input.targetRepsMin = parsedRepsMin;
    if (parsedRepsMax) input.targetRepsMax = parsedRepsMax;
    if (parsedRest) input.restSeconds = parsedRest;

    createWorkoutExercise.mutate(
      { planId, dayId, input },
      {
        onSuccess: () => {
          toast.success("Exercise added.");
          onClose();
        },
        onError: () => toast.error("Could not add exercise. Please try again."),
      },
    );
  }

  function handleDelete() {
    if (!dayExercise) return;
    deleteWorkoutExercise.mutate(
      { planId, dayId, dayExerciseId: dayExercise.id },
      {
        onSuccess: () => {
          toast.success("Exercise deleted.");
          onClose();
        },
        onError: () =>
          toast.error("Could not delete this exercise. Please try again."),
      },
    );
  }

  function openPicker() {
    setPickerKey((k) => k + 1);
    setPickerOpen(true);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        isEdit ? `Update Exercise on ${dayName}` : `Add Exercise to ${dayName}`
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <div className="text-caption mb-2">Exercise</div>
          <button
            type="button"
            onClick={openPicker}
            className="
              w-full text-left py-2 text-sm
              text-bone-100 hover:text-volt-500 transition-colors
              cursor-pointer
            "
          >
            {selectedExercise ? selectedExercise.name : "Select exercise..."}
          </button>
          <div className="h-px bg-white/5" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Sets"
            value={sets}
            max={LIMITS.SETS_MAX}
            onChange={setSets}
            placeholder="3"
            optional
          />
          <NumberField
            label="Rest (s)"
            value={rest}
            max={LIMITS.REST_MAX}
            onChange={setRest}
            placeholder="90"
            optional
          />
          <NumberField
            label="Reps min"
            value={repsMin}
            max={LIMITS.REPS_MAX}
            onChange={setRepsMin}
            placeholder="8"
            optional
          />
          <NumberField
            label="Reps max"
            value={repsMax}
            max={LIMITS.REPS_MAX}
            onChange={setRepsMax}
            placeholder="12"
            optional
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          full
          disabled={isPending}
        >
          {isPending
            ? "Saving..."
            : isEdit
              ? "Update Exercise"
              : "Add Exercise"}
        </Button>
      </form>

      <ExercisePickerSheet
        key={pickerKey}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={setSelectedExercise}
      />

      {/* Delete in edit mode only */}
      {isEdit &&
        (confirmingDelete ? (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/5 pt-4">
            <span className="text-sm text-bone-300">Delete this exercise?</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleteWorkoutExercise.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={deleteWorkoutExercise.isPending}
              >
                {deleteWorkoutExercise.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mt-4 w-full border-t border-white/5 pt-4 text-center text-sm font-medium text-blaze-500 transition-colors hover:text-blaze-700 cursor-pointer"
          >
            Delete Exercise
          </button>
        ))}
    </Sheet>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  max,
  optional,
}: {
  label: string;
  value: string;
  max: number;
  onChange: (v: string) => void;
  placeholder?: string;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <div className="text-caption mb-2">
        {label}
        {optional && <OptionalTag />}
      </div>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        placeholder={placeholder}
        value={value}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full bg-ink-850 border border-white/5 rounded-xl
          px-3 h-10 text-sm text-bone-50
          focus:outline-none focus:border-volt-500/60
          scheme-dark
          [appearance:textfield]
          [&::-webkit-inner-spin-button]:appearance-none
          [&::-webkit-outer-spin-button]:appearance-none
        "
      />
    </label>
  );
}

export default WorkoutExerciseEntrySheet;
