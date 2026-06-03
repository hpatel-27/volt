import type {
  ExerciseLog,
  ExerciseLogWithExerciseAndSets,
} from "../types/exerciseLog.dto.js";
import { toSetLogDto } from "./setLog.mapper.js";

function toExerciseLogDto(log: ExerciseLogWithExerciseAndSets): ExerciseLog {
  return {
    id: log.id,
    exercise: log.exercise,
    notes: log.notes,
    sets: log.sets.map(toSetLogDto),
  };
}

export { toExerciseLogDto };
