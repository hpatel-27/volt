import type {
  WorkoutLog,
  WorkoutLogSummary,
  WorkoutLogWithDetail,
  WorkoutLogWithSummary,
} from "../types/workoutLog.dto.js";
import { toExerciseLogDto } from "./exerciseLog.mapper.js";

function toWorkoutLogSummaryDto(log: WorkoutLogWithSummary): WorkoutLogSummary {
  return {
    id: log.id,
    date: log.date.toISOString().slice(0, 10),
    workoutDay: log.workoutDay,
    exerciseCount: log._count.exerciseLogs,
    setCount: log.exerciseLogs.reduce(
      (sum, exerciseLog) => sum + exerciseLog._count.sets,
      0,
    ),
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
