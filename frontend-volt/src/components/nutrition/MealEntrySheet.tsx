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

  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const createMeal = useMealCreate();
  const updateMeal = useMealUpdate();
  const deleteMeal = useMealDelete();
  const isPending = createMeal.isPending || updateMeal.isPending;

  // Sync form to the sheet's purpose when it opens, or when it switches
  // to a different meal while open. This uses the render-time "adjust state on
  // prop change" pattern (see Sheet.tsx).
  const [prevOpen, setPrevOpen] = useState(false);
  const [prevMealId, setPrevMealId] = useState<string | null>(null);
  const mealId = meal?.id ?? null;

  if (open && (!prevOpen || prevMealId !== mealId)) {
    setPrevOpen(true);
    setPrevMealId(mealId);
    setConfirmingDelete(false);

    // Prefill from existing meal or reset to "" for new entry
    if (meal) {
      setName(meal.name);
      setCalories(String(meal.calories));
      setProtein(String(meal.protein));
      setCarbs(String(meal.carbs));
      setFat(String(meal.fat));
    } else {
      setName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
    }
  }

  if (!open && prevOpen) {
    setPrevOpen(false);
  }

  function parseNonNegative(value: string): number | null {
    if (value === "") return null;
    const n = Number(value);
    if (isNaN(n) || n < 0) return null;
    return n;
  }

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please give this meal a name.");
      return;
    }

    const caloriesNum = parseNonNegative(calories);
    const proteinNum = parseNonNegative(protein);
    const carbsNum = parseNonNegative(carbs);
    const fatNum = parseNonNegative(fat);

    if (
      caloriesNum === null ||
      proteinNum === null ||
      carbsNum === null ||
      fatNum === null
    ) {
      toast.error(
        "Calories, protein, carbs, and fat are required and must be non-negative numbers.",
      );
      return;
    }

    const fields = {
      name: name.trim(),
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
            onChange={setCalories}
          />
          <MacroInput
            label="Protein"
            unit="g"
            value={protein}
            onChange={setProtein}
          />
          <MacroInput
            label="Carbs"
            unit="g"
            value={carbs}
            onChange={setCarbs}
          />
          <MacroInput label="Fat" unit="g" value={fat} onChange={setFat} />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          full
          disabled={isPending}
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
            className="mt-4 w-full border-t border-white/5 pt-4 text-center text-sm font-medium text-blaze-400 transition-colors hover:text-blaze-500 cursor-pointer"
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
  onChange: (v: string) => void;
}

function MacroInput({ label, unit, value, onChange }: MacroInputProps) {
  return (
    <div>
      <div className="text-caption mb-2">{label}</div>
      <div className="flex items-baseline gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="1"
          min="0"
          placeholder="0"
          value={value}
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
