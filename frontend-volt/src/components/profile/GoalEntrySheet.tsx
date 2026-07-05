import { useState } from "react";
import { toast } from "sonner";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { cn } from "@/lib/cn";
import { useCreateGoals, useUpdateGoals } from "@/api/goal";
import type { CreateGoalInput, Goal, UpdateGoalInput } from "@/types/goal";
import { GOAL_TYPES, GOALS } from "@/types/shared";
import { LIMITS } from "@/lib/limits";
import { parseNonNegativeNumber, parsePositiveNumber } from "@/lib/validate";

interface GoalEntrySheetProps {
  open: boolean;
  onClose: () => void;
  // null => create mode (onboarding / profile empty state); present => edit mode.
  goal: Goal | null;
}

// The raw, still-stringly form values before parsing.
type GoalForm = {
  targetWeight: string;
  calorieGoal: string;
  proteinGoal: string;
  carbGoal: string;
  fatGoal: string;
  goalType: string;
};

/**
 * Turn the raw form strings into the payload to send to the API.
 *
 * Contract:
 *  - Returns `null` if ANY provided value is invalid → caller surfaces an error
 *    instead of sending a bad request.
 *  - Create mode (`original === null`): every field is required; return a full
 *    `CreateGoalInput`.
 *  - Edit mode (`original` present): return an `UpdateGoalInput` with ONLY the
 *    fields that changed; an empty object `{}` means "nothing changed".
 */
function buildGoalPayload(
  form: GoalForm,
  original: Goal | null,
): CreateGoalInput | UpdateGoalInput | null {
  const targetWeight = parsePositiveNumber(
    form.targetWeight,
    LIMITS.TARGET_WEIGHT_MAX,
  );
  const calorieGoal = parseNonNegativeNumber(
    form.calorieGoal,
    LIMITS.CALORIE_GOAL_MAX,
  );
  const proteinGoal = parseNonNegativeNumber(
    form.proteinGoal,
    LIMITS.MACRO_GOAL_MAX,
  );
  const carbGoal = parseNonNegativeNumber(form.carbGoal, LIMITS.MACRO_GOAL_MAX);
  const fatGoal = parseNonNegativeNumber(form.fatGoal, LIMITS.MACRO_GOAL_MAX);
  const goalType = form.goalType;

  // Parser returns a `number` for valid input and `false` for anything else (empty included).
  if (
    typeof targetWeight !== "number" ||
    typeof calorieGoal !== "number" ||
    typeof proteinGoal !== "number" ||
    typeof carbGoal !== "number" ||
    typeof fatGoal !== "number" ||
    !GOAL_TYPES.includes(goalType as (typeof GOAL_TYPES)[number])
  ) {
    return null;
  }

  // Create mode: every field is required, so return the full object.
  if (original === null) {
    return {
      targetWeight,
      calorieGoal,
      proteinGoal,
      carbGoal,
      fatGoal,
      goalType,
    };
  }

  // Edit mode: send only the fields that actually changed. `{}` (nothing
  // changed) is a valid result the caller handles.
  const payload: UpdateGoalInput = {};
  if (targetWeight !== original.targetWeight)
    payload.targetWeight = targetWeight;
  if (calorieGoal !== original.calorieGoal) payload.calorieGoal = calorieGoal;
  if (proteinGoal !== original.proteinGoal) payload.proteinGoal = proteinGoal;
  if (carbGoal !== original.carbGoal) payload.carbGoal = carbGoal;
  if (fatGoal !== original.fatGoal) payload.fatGoal = fatGoal;
  if (goalType !== original.goalType) payload.goalType = goalType;
  return payload;
}

// Initial create-mode values seed from the app-wide defaults so a new user
// starts from a sensible plate rather than a blank form. Target weight has no
// sane default, so it starts empty and must be entered.
function initialForm(goal: Goal | null): GoalForm {
  if (goal) {
    return {
      targetWeight: String(goal.targetWeight),
      calorieGoal: String(goal.calorieGoal),
      proteinGoal: String(goal.proteinGoal),
      carbGoal: String(goal.carbGoal),
      fatGoal: String(goal.fatGoal),
      goalType: goal.goalType,
    };
  }
  return {
    targetWeight: "",
    calorieGoal: String(GOALS.calories),
    proteinGoal: String(GOALS.protein),
    carbGoal: String(GOALS.carbs),
    fatGoal: String(GOALS.fat),
    goalType: "MAINTAIN",
  };
}

export function GoalEntrySheet({ open, onClose, goal }: GoalEntrySheetProps) {
  // Parent remounts this sheet on each open (changing key), so the lazy
  // initializer re-reads the latest goal — no prop→state effect needed.
  const [form, setForm] = useState<GoalForm>(() => initialForm(goal));

  const createGoals = useCreateGoals();
  const updateGoals = useUpdateGoals();
  const pending = createGoals.isPending || updateGoals.isPending;

  const set = (key: keyof GoalForm) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const payload = buildGoalPayload(form, goal);
    if (payload === null) {
      toast.error("Please check your goals — those values look off.");
      return;
    }

    if (goal === null) {
      createGoals.mutate(payload as CreateGoalInput, {
        onSuccess: () => {
          toast.success("Goals set.");
          onClose();
        },
        onError: () =>
          toast.error("Could not save your goals. Please try again."),
      });
      return;
    }

    if (Object.keys(payload).length === 0) {
      toast("Nothing to update — make a change first.");
      return;
    }

    updateGoals.mutate(payload as UpdateGoalInput, {
      onSuccess: () => {
        toast.success("Goals updated.");
        onClose();
      },
      onError: () =>
        toast.error("Could not update your goals. Please try again."),
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={goal ? "Edit goals" : "Set your goals"}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Target weight (lbs)"
          type="number"
          inputMode="decimal"
          step="0.1"
          value={form.targetWeight}
          max={LIMITS.TARGET_WEIGHT_MAX}
          onChange={(e) => set("targetWeight")(e.target.value)}
          placeholder="165"
        />

        <Input
          label="Daily calories (kcal)"
          type="number"
          inputMode="numeric"
          value={form.calorieGoal}
          max={LIMITS.CALORIE_GOAL_MAX}
          onChange={(e) => set("calorieGoal")(e.target.value)}
          placeholder={String(GOALS.calories)}
        />

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Protein (g)"
            type="number"
            inputMode="numeric"
            value={form.proteinGoal}
            max={LIMITS.MACRO_GOAL_MAX}
            onChange={(e) => set("proteinGoal")(e.target.value)}
          />
          <Input
            label="Carbs (g)"
            type="number"
            inputMode="numeric"
            value={form.carbGoal}
            max={LIMITS.MACRO_GOAL_MAX}
            onChange={(e) => set("carbGoal")(e.target.value)}
          />
          <Input
            label="Fat (g)"
            type="number"
            inputMode="numeric"
            value={form.fatGoal}
            max={LIMITS.MACRO_GOAL_MAX}
            onChange={(e) => set("fatGoal")(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-caption">Goal type</span>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-ink-850 p-1">
            {GOAL_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("goalType")(t)}
                className={cn(
                  "h-9 rounded-lg text-sm font-medium capitalize transition-colors",
                  form.goalType === t
                    ? "bg-volt-500 text-ink-950"
                    : "text-bone-400 hover:text-bone-100",
                )}
              >
                {t.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          full
          disabled={pending}
          className="hover:bg-volt-600"
        >
          {pending ? "Saving..." : goal ? "Save changes" : "Set goals"}
        </Button>
      </form>
    </Sheet>
  );
}
