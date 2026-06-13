import { useRef, useState } from "react";
import { toast } from "sonner";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import {
  useCreateWeight,
  useDeleteWeight,
  useUpdateWeight,
} from "../../api/weights";
import type { CreateWeightInput, Weight } from "../../types/weight";
import { todayLocalIso } from "../../lib/date";
import { DATE_REGEX } from "@/types/shared";
import { parsePositiveNumber } from "@/lib/validate";
import { LIMITS } from "@/lib/limits";

interface WeightEntrySheetProps {
  open: boolean;
  onClose: () => void;
  // Present = edit that entry, null/undefined =create a new one.
  weight?: Weight | null;
}

export function WeightEntrySheet({
  open,
  onClose,
  weight,
}: WeightEntrySheetProps) {
  const isEdit = !!weight;

  // The parent remounts this sheet on every open (via a changing key), so these
  // lazy initializers re-run with the current weight.
  const [amount, setAmount] = useState(() =>
    weight ? String(weight.amount) : "",
  );
  const [date, setDate] = useState(
    () => weight?.date.slice(0, 10) ?? todayLocalIso(),
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const createWeight = useCreateWeight();
  const updateWeight = useUpdateWeight();
  const deleteWeight = useDeleteWeight();
  const isPending = createWeight.isPending || updateWeight.isPending;

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsedWeight = parsePositiveNumber(amount, LIMITS.BODY_WEIGHT_MAX);
    if (!parsedWeight) {
      toast.error(
        `Please enter a valid weight. Weights should be positive numbers, up to at most ${LIMITS.BODY_WEIGHT_MAX}.`,
      );
      return;
    }

    // Test iso data and prevent future dates
    if (!date || !DATE_REGEX.test(date) || todayLocalIso() < date) {
      toast.error("Please select a valid date for this weight entry.");
      return;
    }

    const fields = { amount: parsedWeight, date };

    if (isEdit && weight) {
      updateWeight.mutate(
        { id: weight.id, input: fields },
        {
          onSuccess: () => {
            toast.success("Weight updated.");
            onClose();
          },
          onError: () =>
            toast.error("Could not update weight. Please try again."),
        },
      );
      return;
    }

    const data: CreateWeightInput = fields;
    createWeight.mutate(data, {
      onSuccess: () => {
        toast.success("Weight entry created!");
        onClose();
      },
      onError: () => toast.error("Could not create weight. Please try again."),
    });
  }

  function handleDelete() {
    if (!weight) return;
    deleteWeight.mutate(
      { id: weight.id },
      {
        onSuccess: () => {
          toast.success("Weight deleted.");
          onClose();
        },
        onError: () =>
          toast.error("Could not delete weight. Please try again."),
      },
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onOpenEnd={() => amountRef.current?.focus()}
      title={isEdit ? "Edit Weight" : "Log Weight"}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <div className="text-caption mb-2">Weight</div>
          <div className="flex items-baseline gap-3">
            <input
              ref={amountRef}
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="0.0"
              value={amount}
              max={LIMITS.BODY_WEIGHT_MAX}
              onChange={(e) => setAmount(e.target.value)}
              className="
                flex-1 min-w-0 bg-transparent border-0 outline-none
                font-display font-bold text-display text-right tracking-tight
                text-bone-200 placeholder:text-bone-600
                focus:outline-none transition scheme-dark
                [appearance:textfield]
                [&::-webkit-inner-spin-button]:appearance-none
                [&::-webkit-outer-spin-button]:appearance-none
              "
            />
            <span className="text-bone-500 font-medium text-xl">lbs</span>
          </div>
          <div className="h-px bg-white/5 mt-2" />
        </div>

        <label className="flex items-center justify-between gap-4">
          <span className="text-caption">Date</span>
          <input
            type="date"
            value={date}
            max={todayLocalIso()}
            onChange={(e) => setDate(e.target.value)}
            className="
              bg-ink-850 border border-white/5 rounded-xl
              px-3 h-10 text-sm text-bone-50
              focus:outline-none focus:border-volt-500/60
              scheme-dark
            "
          />
        </label>

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
            <span className="text-sm text-bone-300">Delete this entry?</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleteWeight.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={deleteWeight.isPending}
              >
                {deleteWeight.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mt-4 w-full border-t border-white/5 pt-4 text-center text-sm font-medium text-blaze-500 transition-colors hover:text-blaze-700 cursor-pointer"
          >
            Delete entry
          </button>
        ))}
    </Sheet>
  );
}
