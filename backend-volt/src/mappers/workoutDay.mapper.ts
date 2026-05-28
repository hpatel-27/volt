import type { Prisma } from "../generated/prisma/client.js";
import type { WorkoutDayModel } from "../generated/prisma/models.js";
import type { EXERCISE_REF_SELECT } from "../prisma/selects.js";
import type { WorkoutDay, WorkoutDayDetail } from "../types/workoutDay.dto.js";
import { toWorkoutDayExerciseDto } from "./workoutDayExercise.mapper.js";

// Matches a workout day fetched with its exercises (each including the
// referenced exercise's id, slug, and name).
export type WorkoutDayWithExercises = Prisma.WorkoutDayGetPayload<{
  include: {
    exercises: {
      include: { exercise: { select: typeof EXERCISE_REF_SELECT } };
    };
  };
}>;

function toWorkoutDayDetailDto(day: WorkoutDayWithExercises): WorkoutDayDetail {
  return {
    id: day.id,
    name: day.name,
    order: day.order,
    exercises: day.exercises.map((e) => toWorkoutDayExerciseDto(e)),
  };
}

function toWorkoutDayDto(day: WorkoutDayModel): WorkoutDay {
  return {
    id: day.id,
    name: day.name,
    order: day.order,
  };
}

export { toWorkoutDayDetailDto, toWorkoutDayDto };
