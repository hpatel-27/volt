import { useRef, useState } from "react";
import { toast } from "sonner";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { useCreateWorkoutDay } from "@/api/workoutDay";

interface WorkoutDayEntrySheetProps {
  open: boolean;
  onClose: () => void;
  planId: string;
}

export function WorkoutDayEntrySheet({
  open,
  onClose,
  planId,
}: WorkoutDayEntrySheetProps) {
  const [name, setName] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const createDay = useCreateWorkoutDay();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a name for this day.");
      return;
    }

    createDay.mutate(
      { planId, input: { name: name.trim() } },
      {
        onSuccess: () => {
          toast.success("Day added.");
          onClose();
        },
        onError: () => toast.error("Could not add day. Please try again."),
      },
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onOpenEnd={() => nameRef.current?.focus()}
      title="Add Day"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <div className="text-caption mb-2">Name</div>
          <input
            ref={nameRef}
            type="text"
            placeholder="Push, Pull, Legs"
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

        <Button
          type="submit"
          variant="primary"
          size="lg"
          full
          disabled={createDay.isPending}
        >
          {createDay.isPending ? "Adding..." : "Add Day"}
        </Button>
      </form>
    </Sheet>
  );
}

export default WorkoutDayEntrySheet;
