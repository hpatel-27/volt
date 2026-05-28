import type { Prisma } from "../generated/prisma/client.js";
import type { EXERCISE_REF_SELECT } from "../prisma/selects.js";
import type { WorkoutDayExercise } from "../types/workoutDayExercise.dto.js";

// Matches a row fetched with the referenced exercise's id, slug, and name.
export type WorkoutDayExerciseWithExercise =
  Prisma.WorkoutDayExerciseGetPayload<{
    include: { exercise: { select: typeof EXERCISE_REF_SELECT } };
  }>;

function toWorkoutDayExerciseDto(
  row: WorkoutDayExerciseWithExercise,
): WorkoutDayExercise {
  return {
    id: row.id,
    order: row.order,
    targetSets: row.targetSets,
    targetRepsMin: row.targetRepsMin,
    targetRepsMax: row.targetRepsMax,
    restSeconds: row.restSeconds,
    exercise: {
      id: row.exercise.id,
      slug: row.exercise.slug,
      name: row.exercise.name,
    },
  };
}

export { toWorkoutDayExerciseDto };
