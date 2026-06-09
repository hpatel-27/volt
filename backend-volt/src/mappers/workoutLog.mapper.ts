import type {
  WorkoutLog,
  WorkoutLogSummary,
  WorkoutLogWithDetail,
  WorkoutLogWithSummary,
} from "../types/workoutLog.dto.js";
import { toExerciseLogDto } from "./exerciseLog.mapper.js";

function toWorkoutLogSummaryDto(log: WorkoutLogWithSummary): WorkoutLogSummary {
  const totalVolume = log.exerciseLogs
    .flatMap((e) => e.sets)
    .reduce((sum, set) => sum + set.reps * set.weight, 0);
  return {
    id: log.id,
    date: log.date.toISOString().slice(0, 10),
    workoutDay: log.workoutDay,
    exerciseCount: log._count.exerciseLogs,
    totalVolume,
  };
}

function toWorkoutLogDetailDto(log: WorkoutLogWithDetail): WorkoutLog {
  return {
    id: log.id,
    date: log.date.toISOString().slice(0, 10),
    workoutDay: log.workoutDay,
    exercises: log.exerciseLogs.map(toExerciseLogDto),
  };
}

export { toWorkoutLogSummaryDto, toWorkoutLogDetailDto };
