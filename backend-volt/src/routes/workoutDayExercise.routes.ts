import express from "express";
const router = express.Router({ mergeParams: true });

import * as workoutDayExerciseController from "../controllers/workoutDayExercise.controller.js";
import { parseIntParam } from "../middleware/param.middleware.js";

// Get all exercises for a workout day
router.get("/", workoutDayExerciseController.getAllWorkoutDayExercises);

// Get a specific exercise in a workout day by its ID
router.get(
  "/:dayExerciseId",
  parseIntParam("dayExerciseId"),
  workoutDayExerciseController.getWorkoutDayExerciseById,
);

// Add an exercise to a workout day
router.post("/", workoutDayExerciseController.createWorkoutDayExercise);

// Update the order of an exercise in a workout day
router.patch(
  "/:dayExerciseId",
  parseIntParam("dayExerciseId"),
  workoutDayExerciseController.updateWorkoutDayExercise,
);

// Remove an exercise from a workout day
router.delete(
  "/:dayExerciseId",
  parseIntParam("dayExerciseId"),
  workoutDayExerciseController.deleteWorkoutDayExercise,
);

export default router;
