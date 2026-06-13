import { useRef, useState } from "react";
import { toast } from "sonner";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { useMealCreate, useMealDelete, useMealUpdate } from "@/api/meal";
import type {
  CreateMealVariables,
  Meal,
  UpdateMealVariables,
} from "@/types/meal";
import { todayLocalIso } from "@/lib/date";
import { DATE_REGEX } from "@/types/shared";
import { parseNonNegativeNumber, parseBoundedString } from "@/lib/validate";
import { LIMITS } from "@/lib/limits";

interface MealEntrySheetProps {
  open: boolean;
  onClose: () => void;
  date: string;
  // If meal provided, edit that meal; null/undefined, create a new one.
  meal?: Meal | null;
}

export function MealEntrySheet({
  open,
  onClose,
  date,
  meal,
}: MealEntrySheetProps) {
  const isEdit = !!meal;

  // Parent remounts this sheet via a changing key, so these lazy initializers
  // re-run with the current meal on each open (same pattern as the plan sheets).
  const [name, setName] = useState(() => (meal ? meal.name : ""));
  const [calories, setCalories] = useState(() =>
    meal ? String(meal.calories) : "",
  );
  const [protein, setProtein] = useState(() =>
    meal ? String(meal.protein) : "",
  );
  const [carbs, setCarbs] = useState(() => (meal ? String(meal.carbs) : ""));
  const [fat, setFat] = useState(() => (meal ? String(meal.fat) : ""));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const createMeal = useMealCreate();
  const updateMeal = useMealUpdate();
  const deleteMeal = useMealDelete();
  const isPending = createMeal.isPending || updateMeal.isPending;

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    const mealName = parseBoundedString(name, {
      maxLen: LIMITS.NAME_MAX,
    });
    if (mealName === false) {
      toast.error("Please give this meal a name.");
      return;
    }
    if (!date || !DATE_REGEX.test(date) || todayLocalIso() < date) {
      toast.error("Please provide a valid date.");
      return;
    }

    const caloriesNum = parseNonNegativeNumber(calories, LIMITS.CALORIES_MAX);
    const proteinNum = parseNonNegativeNumber(protein, LIMITS.MACRO_MAX);
    const carbsNum = parseNonNegativeNumber(carbs, LIMITS.MACRO_MAX);
    const fatNum = parseNonNegativeNumber(fat, LIMITS.MACRO_MAX);
    if (caloriesNum === false || caloriesNum === null) {
      toast.error(
        `Calories must be non-negative numbers up to at most ${LIMITS.CALORIES_MAX}.`,
      );
      return;
    }
    if (
      proteinNum === false ||
      proteinNum === null ||
      carbsNum === false ||
      carbsNum === null ||
      fatNum === false ||
      fatNum === null
    ) {
      toast.error(
        `Macros must be non-negative numbers up to at most ${LIMITS.MACRO_MAX}.`,
      );
      return;
    }

    const fields = {
      name: mealName,
      calories: caloriesNum,
      protein: proteinNum,
      carbs: carbsNum,
      fat: fatNum,
    };

    if (isEdit && meal) {
      const variables: UpdateMealVariables = {
        date,
        mealId: meal.id,
        patch: fields,
      };
      updateMeal.mutate(variables, {
        onSuccess: () => {
          toast.success("Meal updated.");
          onClose();
        },
        onError: () => toast.error("Could not update meal. Please try again."),
      });
      return;
    }

    const variables: CreateMealVariables = { date, meal: fields };
    createMeal.mutate(variables, {
      onSuccess: () => {
        toast.success("Meal logged!");
        onClose();
      },
      onError: () => toast.error("Could not log meal. Please try again."),
    });
  }

  function handleDelete() {
    if (!meal) return;
    deleteMeal.mutate(
      { date, mealId: meal.id },
      {
        onSuccess: () => {
          toast.success("Meal deleted.");
          onClose();
        },
        onError: () => toast.error("Could not delete meal. Please try again."),
      },
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onOpenEnd={() => nameRef.current?.focus()}
      title={isEdit ? "Edit Meal" : "Log Meal"}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <div className="text-caption mb-2">Name</div>
          <input
            ref={nameRef}
            type="text"
            placeholder="e.g. Chicken, rice, broccoli"
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

        <div className="grid grid-cols-2 gap-4">
          <MacroInput
            label="Calories"
            unit="kcal"
            value={calories}
            max={LIMITS.CALORIES_MAX}
            onChange={setCalories}
          />
          <MacroInput
            label="Protein"
            unit="g"
            value={protein}
            max={LIMITS.MACRO_MAX}
            onChange={setProtein}
          />
          <MacroInput
            label="Carbs"
            unit="g"
            value={carbs}
            max={LIMITS.MACRO_MAX}
            onChange={setCarbs}
          />
          <MacroInput
            label="Fat"
            unit="g"
            value={fat}
            max={LIMITS.MACRO_MAX}
            onChange={setFat}
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

      {/* Delete in edit mode only */}
      {isEdit &&
        (confirmingDelete ? (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/5 pt-4">
            <span className="text-sm text-bone-300">Delete this meal?</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleteMeal.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMeal.isPending}
              >
                {deleteMeal.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mt-4 w-full border-t border-white/5 pt-4 text-center text-sm font-medium text-blaze-500 transition-colors hover:text-blaze-700 cursor-pointer"
          >
            Delete meal
          </button>
        ))}
    </Sheet>
  );
}

interface MacroInputProps {
  label: string;
  unit: string;
  value: string;
  max: number;
  onChange: (v: string) => void;
}

function MacroInput({ label, unit, value, onChange, max }: MacroInputProps) {
  return (
    <div>
      <div className="text-caption mb-2">{label}</div>
      <div className="flex items-baseline gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
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
