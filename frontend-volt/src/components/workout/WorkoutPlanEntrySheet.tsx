import type {
  CreateWorkoutPlanInput,
  WorkoutPlanEntry,
} from "@/types/workoutPlan";
import { Sheet } from "../ui/Sheet";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { WORKOUT_TYPES } from "@/types/shared";
import {
  useCreateWorkoutPlan,
  useDeleteWorkoutPlan,
  useUpdateWorkoutPlan,
} from "@/api/workoutPlan";
import { Button } from "../ui/Button";
import { useNavigate } from "react-router";
import { cn } from "@/lib/cn";
import { parseBoundedString } from "@/lib/validate";
import { LIMITS } from "@/lib/limits";
import { OptionalTag } from "../ui/OptionalTag";

interface WorkoutPlanEntrySheetProps {
  open: boolean;
  onClose: () => void;
  isActive: boolean;
  // Present = edit that entry, null/undefined = create a new one.
  plan?: WorkoutPlanEntry | null;
}
export function WorkoutPlanEntrySheet({
  open,
  onClose,
  isActive,
  plan,
}: WorkoutPlanEntrySheetProps) {
  const isEdit = !!plan;

  // The parent remounts this sheet on every open (via a changing key), so these
  // lazy initializers re-run with the current data.
  const [name, setName] = useState(() => (plan ? plan?.name : ""));
  const [type, setType] = useState(() => (plan?.type ? plan.type : ""));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const createWorkoutPlan = useCreateWorkoutPlan();
  const updateWorkoutPlan = useUpdateWorkoutPlan();
  const deleteWorkoutPlan = useDeleteWorkoutPlan();
  const isPending = createWorkoutPlan.isPending || updateWorkoutPlan.isPending;

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedName = parseBoundedString(name, { maxLen: LIMITS.NAME_MAX });
    if (!trimmedName) {
      toast.error("Please enter a valid name for this workout plan.");
      return;
    }

    const trimmedType = parseBoundedString(type, {
      maxLen: LIMITS.NAME_MAX,
      allowEmpty: true,
    });
    if (trimmedType && !WORKOUT_TYPES.includes(trimmedType)) {
      toast.error(
        "Invalid plan type provided. Please select one of the valid options.",
      );
      return;
    }

    const fields: { name: string; type?: string } = { name: trimmedName };
    if (trimmedType) fields.type = trimmedType;

    if (isEdit && plan) {
      updateWorkoutPlan.mutate(
        { id: plan.id, input: fields },
        {
          onSuccess: () => {
            toast.success("Workout plan updated.");
            onClose();
          },
          onError: () =>
            toast.error("Could not update weight. Please try again."),
        },
      );
      return;
    }

    const data: CreateWorkoutPlanInput = fields;
    createWorkoutPlan.mutate(data, {
      onSuccess: () => {
        toast.success("Workout plan created!");
        onClose();
      },
      onError: () => {
        toast.error("Could not create workout plan. Please try again.");
      },
    });
  }

  function handleDelete() {
    if (!plan) return;
    deleteWorkoutPlan.mutate(
      { id: plan.id },
      {
        onSuccess: () => {
          navigate("/plans");
          toast.success("Workout plan deleted.");
          onClose();
        },
        onError: () =>
          toast.error("Could not delete workout plan. Please try again."),
      },
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onOpenEnd={() => nameRef.current?.focus()}
      title={isEdit ? "Edit Plan" : "Create Plan"}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <div className="text-caption mb-2">Name</div>
          <input
            ref={nameRef}
            type="text"
            placeholder="Push, Pull, Legs"
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

        <div>
          <label htmlFor="plan-types" className="text-caption mb-2 block">
            Plan Type
            <OptionalTag />
          </label>
          <div className="relative">
            <select
              name="plan-types"
              id="plan-types"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="
                w-full appearance-none bg-transparent border-0 outline-none
                text-bone-100 pr-6 scheme-dark
                focus:outline-none transition
              "
            >
              <option value="" className="bg-ink-700 text-bone-100">
                Select a type
              </option>
              <option value="STRENGTH" className="bg-ink-700 text-bone-100">
                Strength
              </option>
              <option value="HYPERTROPHY" className="bg-ink-700 text-bone-100">
                Hypertrophy
              </option>
              <option value="WEIGHT_LOSS" className="bg-ink-700 text-bone-100">
                Weight Loss
              </option>
              <option value="OTHER" className="bg-ink-700 text-bone-100">
                Other
              </option>
            </select>
            <span
              aria-hidden
              className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-bone-600"
            >
              ▾
            </span>
          </div>
          <div className="h-px bg-white/5 mt-2" />
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
            <span className="text-sm text-bone-300">Delete this plan?</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleteWorkoutPlan.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={deleteWorkoutPlan.isPending}
              >
                {deleteWorkoutPlan.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (isActive) {
                toast.info(
                  "Active plans can't be deleted. Activate another plan first.",
                );
                return;
              }
              setConfirmingDelete(true);
            }}
            aria-disabled={isActive}
            className={cn(
              "mt-4 w-full border-t border-white/5 pt-4 text-center text-sm font-medium text-blaze-500 transition-colors hover:text-blaze-700 cursor-pointer",
              isActive && "opacity-50 cursor-not-allowed",
            )}
          >
            Delete plan
          </button>
        ))}
    </Sheet>
  );
}

export default WorkoutPlanEntrySheet;
