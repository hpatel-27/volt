import { useState } from "react";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { todayLocalIso } from "@/lib/date";

interface WorkoutDatePickerSheetProps {
  open: boolean;
  onClose: () => void;
  // Called with the chosen YYYY-MM-DD date when the user confirms.
  onConfirm: (date: string) => void;
  submitting?: boolean;
}

export function WorkoutDatePickerSheet({
  open,
  onClose,
  onConfirm,
  submitting = false,
}: WorkoutDatePickerSheetProps) {
  const today = todayLocalIso();
  // Parent remounts via a changing key, so this lazily defaults to today on
  // each open (same reset-by-key trick as SetLoggerSheet).
  const [date, setDate] = useState(today);

  return (
    <Sheet open={open} onClose={onClose} title="Start workout">
      <div className="space-y-5">
        <div>
          <div className="text-caption mb-2">Date</div>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="
              w-full bg-transparent border-0 outline-none
              font-display font-bold text-2xl text-bone-200
              focus:outline-none transition scheme-dark
              [&::-webkit-calendar-picker-indicator]:opacity-60
              [&::-webkit-calendar-picker-indicator]:cursor-pointer
            "
          />
          <div className="h-px bg-white/5 mt-2" />
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          full
          disabled={submitting || !date}
          onClick={() => onConfirm(date)}
          className="hover:bg-volt-600"
        >
          {submitting ? "Starting..." : "Start workout"}
        </Button>
      </div>
    </Sheet>
  );
}

export default WorkoutDatePickerSheet;
