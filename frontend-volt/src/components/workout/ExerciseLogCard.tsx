import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "../ui/Button";
import type { ExerciseLog } from "@/types/exerciseLog";
import type { SetLog } from "@/types/setLog";

interface ExerciseLogCardProps {
  exerciseLog: ExerciseLog;
  onAddSet: () => void;
  onEditSet: (set: SetLog) => void;
  onDelete: () => void;
  deleting?: boolean;
}

export function ExerciseLogCard({
  exerciseLog,
  onAddSet,
  onEditSet,
  onDelete,
  deleting = false,
}: ExerciseLogCardProps) {
  const [expanded, setExpanded] = useState(true);
  // Card-local confirm step — the parent owns the actual delete mutation.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const sets = exerciseLog.sets;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-ink-900">
      {/* Header is a flex row of siblings, not nested buttons: the toggle
          expands/collapses, the trash button opens the inline confirm. */}
      <div className="flex w-full items-center gap-1 pr-2 hover:bg-ink-850 focus-visible:bg-ink-850">
        <button
          type="button"
          onClick={() => {
            setConfirmingDelete(false);
            setExpanded((v) => !v);
          }}
          className="flex flex-1 items-center gap-3 px-4 py-3.5 text-left transition-colors focus-visible:outline-none cursor-pointer rounded-2xl"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-bone-50">
              {exerciseLog.exercise.name}
            </div>
            <div className="mt-0.5 text-caption text-bone-500">
              {sets.length} {sets.length === 1 ? "set" : "sets"}
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-bone-500 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
        <button
          type="button"
          aria-label="Delete exercise"
          onClick={() => setConfirmingDelete(true)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-bone-500 transition-colors hover:bg-ink-700 hover:text-blaze-500 focus-visible:bg-ink-700 focus-visible:outline-none cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {confirmingDelete && (
        <div className="flex items-center justify-between gap-3 border-t border-white/5 bg-blaze-500/5 px-4 py-3">
          <span className="text-sm text-bone-300">
            Delete this exercise and its {sets.length}{" "}
            {sets.length === 1 ? "set" : "sets"}?
          </span>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="border-t border-white/5">
          {sets.length > 0 && (
            <div className="space-y-px">
              {sets.map((set) => (
                <button
                  key={set.id}
                  type="button"
                  onClick={() => onEditSet(set)}
                  className="grid w-full grid-cols-12 items-center gap-2 border-t border-white/5 bg-ink-900 px-4 py-2.5 text-left transition-colors hover:bg-ink-850 focus-visible:bg-ink-850 focus-visible:outline-none cursor-pointer"
                >
                  <span className="col-span-1 font-mono text-xs text-bone-500">
                    {set.setNumber}
                  </span>
                  <span className="col-span-5 font-mono text-sm text-center font-semibold text-bone-100">
                    {set.weight}
                    <span className="ml-1 text-xs text-bone-500">lbs</span>
                  </span>
                  <span className="col-span-5 font-mono text-sm text-center font-semibold text-bone-100">
                    {set.reps}
                    <span className="ml-1 text-xs text-bone-500">reps</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onAddSet}
            className="flex w-full items-center justify-center gap-1.5 border-t border-white/5 px-4 py-3 text-sm font-medium text-volt-500 transition-colors hover:bg-ink-850 focus-visible:bg-ink-850 focus-visible:outline-none cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add set
          </button>
        </div>
      )}
    </div>
  );
}

export default ExerciseLogCard;
