import express from "express";
const router = express.Router({ mergeParams: true });

import * as workoutDayController from "../controllers/workoutDay.controller.js";
import { parseIntParam } from "../middleware/param.middleware.js";
import workoutDayExerciseRouter from "./workoutDayExercise.routes.js";

// Get all days for a workout plan
router.get("/", workoutDayController.getAllWorkoutDays);

// Get a single workout day with exercises
router.get(
  "/:dayId",
  parseIntParam("dayId"),
  workoutDayController.getWorkoutDayById,
);

// Create a workout day
router.post("/", workoutDayController.createWorkoutDay);

// Update a workout day
router.patch(
  "/:dayId",
  parseIntParam("dayId"),
  workoutDayController.updateWorkoutDay,
);

// Delete a workout day
router.delete(
  "/:dayId",
  parseIntParam("dayId"),
  workoutDayController.deleteWorkoutDay,
);

// Mount Workout Day Exercise routes
router.use(
  "/:dayId/exercises",
  parseIntParam("dayId"),
  workoutDayExerciseRouter,
);

export default router;
