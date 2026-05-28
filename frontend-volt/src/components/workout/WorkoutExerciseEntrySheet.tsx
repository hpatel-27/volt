import { useState } from "react";
import { toast } from "sonner";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { ExercisePickerSheet } from "./ExercisePickerSheet";
import { useCreateWorkoutExercise } from "@/api/workoutDayExercise";
import type { CreateWorkoutExerciseInput } from "@/types/workoutDayExercise";
import type { Exercise } from "@/types/exercise";

interface WorkoutExerciseEntrySheetProps {
  open: boolean;
  onClose: () => void;
  planId: string;
  dayId: string;
  dayName: string;
}

export function WorkoutExerciseEntrySheet({
  open,
  onClose,
  planId,
  dayId,
  dayName,
}: WorkoutExerciseEntrySheetProps) {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  );
  const [sets, setSets] = useState("");
  const [repsMin, setRepsMin] = useState("");
  const [repsMax, setRepsMax] = useState("");
  const [rest, setRest] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);

  const createExercise = useCreateWorkoutExercise();

  // Parses an optional positive-integer numeric input from a controlled string
  // Returns null when blank (omit from payload), the integer when valid,
  // or NaN when present-but-invalid so the caller can flag it
  function parseOptionalInt(raw: string): number | null | typeof NaN {
    if (raw.trim() === "") return null;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 1 ? n : NaN;
  }

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedExercise) {
      toast.error("Please pick an exercise.");
      return;
    }

    const parsed = {
      sets: parseOptionalInt(sets),
      repsMin: parseOptionalInt(repsMin),
      repsMax: parseOptionalInt(repsMax),
      rest: parseOptionalInt(rest),
    };
    if (Object.values(parsed).some((v) => Number.isNaN(v))) {
      toast.error("Sets, reps, and rest must be positive whole numbers.");
      return;
    }
    if (
      typeof parsed.repsMin === "number" &&
      typeof parsed.repsMax === "number" &&
      parsed.repsMin > parsed.repsMax
    ) {
      toast.error("Minimum reps cannot exceed maximum reps.");
      return;
    }

    const input: CreateWorkoutExerciseInput = {
      exerciseId: selectedExercise.id,
    };
    if (parsed.sets !== null) input.targetSets = parsed.sets as number;
    if (parsed.repsMin !== null) input.targetRepsMin = parsed.repsMin as number;
    if (parsed.repsMax !== null) input.targetRepsMax = parsed.repsMax as number;
    if (parsed.rest !== null) input.restSeconds = parsed.rest as number;

    createExercise.mutate(
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

  function openPicker() {
    setPickerKey((k) => k + 1);
    setPickerOpen(true);
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Add to ${dayName}`}>
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
            onChange={setSets}
            placeholder="3"
          />
          <NumberField
            label="Rest (s)"
            value={rest}
            onChange={setRest}
            placeholder="90"
          />
          <NumberField
            label="Reps min"
            value={repsMin}
            onChange={setRepsMin}
            placeholder="8"
          />
          <NumberField
            label="Reps max"
            value={repsMax}
            onChange={setRepsMax}
            placeholder="12"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          full
          disabled={createExercise.isPending}
        >
          {createExercise.isPending ? "Adding..." : "Add exercise"}
        </Button>
      </form>

      <ExercisePickerSheet
        key={pickerKey}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={setSelectedExercise}
      />
    </Sheet>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-caption mb-2">{label}</div>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        placeholder={placeholder}
        value={value}
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
