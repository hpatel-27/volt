import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { useCreateWeight } from "../../api/weights";

interface WeightEntrySheetProps {
  open: boolean;
  onClose: () => void;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function WeightEntrySheet({ open, onClose }: WeightEntrySheetProps) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso);
  const amountRef = useRef<HTMLInputElement>(null);
  const createWeight = useCreateWeight();

  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 280);
    return () => clearTimeout(t);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast.error("Not implemented");
  }

  return (
    <Sheet open={open} onClose={onClose} title="Log Weight">
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
              onChange={(e) => setAmount(e.target.value)}
              className="
                flex-1 bg-transparent border-0 outline-none
                font-display font-bold text-display text-right tracking-tight
                text-bone-200 placeholder:text-bone-600
                focus:outline-none -webkit-appearance:none transition
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
            onChange={(e) => setDate(e.target.value)}
            className="
              bg-ink-850 border border-white/5 rounded-xl
              px-3 h-10 text-sm text-bone-50
              focus:outline-none focus:border-volt-500/60
            "
          />
        </label>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          full
          disabled={createWeight.isPending}
        >
          {createWeight.isPending ? "Saving..." : "Save"}
        </Button>
      </form>
    </Sheet>
  );
}
