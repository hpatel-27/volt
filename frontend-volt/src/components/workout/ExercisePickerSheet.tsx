import { useEffect, useRef, useState } from "react";
import { Sheet } from "../ui/Sheet";
import { useExercises } from "@/api/exercise";
import type { ExerciseRef } from "@/types/exercise";

interface ExercisePickerSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: ExerciseRef) => void;
}

const PAGE_SIZE = 10;

export function ExercisePickerSheet({
  open,
  onClose,
  onSelect,
}: ExercisePickerSheetProps) {
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);

  const { data, isLoading, isError, isPlaceholderData } = useExercises({
    page: 1,
    limit: PAGE_SIZE,
    q: debouncedQ || undefined,
  });

  const exercises = data?.exercises ?? [];
  const showEmpty = !isLoading && exercises.length === 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onOpenEnd={() => searchRef.current?.focus()}
      title="Choose Exercise"
    >
      <div className="space-y-4">
        <div>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search exercises..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="
              w-full bg-transparent border-0 outline-none
              text-bone-100 placeholder:text-bone-600
              focus:outline-none transition
            "
          />
          <div className="h-px bg-white/5 mt-2" />
        </div>

        <div
          className={
            "max-h-[60vh] overflow-y-auto -mx-5 px-5 " +
            (isPlaceholderData ? "opacity-60" : "")
          }
        >
          {isLoading && (
            <div className="py-6 text-center text-sm text-bone-500">
              Loading exercises...
            </div>
          )}

          {isError && (
            <div className="py-6 text-center text-sm text-blaze-500">
              Could not load exercises.
            </div>
          )}

          {showEmpty && (
            <div className="py-6 text-center text-sm text-bone-500">
              {debouncedQ
                ? `No exercises match "${debouncedQ}".`
                : "No exercises available."}
            </div>
          )}

          <ul className="divide-y divide-white/5">
            {exercises.map((exercise) => (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(exercise);
                    onClose();
                  }}
                  className="
                    w-full text-left py-3
                    text-sm text-bone-100
                    hover:text-volt-500 transition-colors
                    cursor-pointer
                  "
                >
                  <div className="font-medium">{exercise.name}</div>
                  {(exercise.equipment ||
                    exercise.primaryMuscles.length > 0) && (
                    <div className="text-xs text-bone-500 mt-0.5">
                      {[exercise.equipment, exercise.primaryMuscles.join(", ")]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Sheet>
  );
}

export default ExercisePickerSheet;
