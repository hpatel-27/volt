import { useRef, useState } from "react";
import { toast } from "sonner";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { useMealCreate } from "@/api/meal";
import type { CreateMealVariables } from "@/types/meal";

interface MealEntrySheetProps {
  open: boolean;
  onClose: () => void;
  date: string;
}

export function MealEntrySheet({ open, onClose, date }: MealEntrySheetProps) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const createMeal = useMealCreate();

  function resetForm() {
    setName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
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

    const variables: CreateMealVariables = {
      date,
      meal: {
        name: name.trim(),
        calories: caloriesNum,
        protein: proteinNum,
        carbs: carbsNum,
        fat: fatNum,
      },
    };

    createMeal.mutate(variables, {
      onSuccess: () => {
        toast.success("Meal logged!");
        resetForm();
        onClose();
      },
      onError: () => {
        toast.error("Could not log meal. Please try again.");
      },
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onOpenEnd={() => nameRef.current?.focus()}
      title="Log Meal"
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
          disabled={createMeal.isPending}
        >
          {createMeal.isPending ? "Saving..." : "Save"}
        </Button>
      </form>
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
            font-display font-bold text-2xl text-bone-200
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
