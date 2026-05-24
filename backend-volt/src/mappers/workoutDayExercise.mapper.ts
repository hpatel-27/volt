import type { Prisma } from "../generated/prisma/client.js";
import type { WorkoutDayExercise } from "../types/workoutDayExercise.dto.js";

// Matches a row fetched with the referenced exercise's slug and name included.
export type WorkoutDayExerciseWithExercise =
  Prisma.WorkoutDayExerciseGetPayload<{
    include: { exercise: { select: { slug: true; name: true } } };
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
      slug: row.exercise.slug,
      name: row.exercise.name,
    },
  };
}

export { toWorkoutDayExerciseDto };
