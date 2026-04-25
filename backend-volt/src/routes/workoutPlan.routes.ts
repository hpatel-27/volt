import express from "express";
const router = express.Router();

import * as workoutPlanController from "../controllers/workoutPlan.controller.js";
import { userMiddleware } from "../middleware/user.middleware.js";
import { parseIntParam } from "../middleware/param.middleware.js";
import { paginationMiddleware } from "../middleware/pagination.middleware.js";
import workoutDayRouter from "./workoutDay.routes.js";

// Get all workout plans for the authenticated user
router.get(
  "/",
  userMiddleware,
  paginationMiddleware,
  workoutPlanController.getAllWorkoutPlans,
);

// Get a single workout plan with nested days and exercises
router.get(
  "/:planId",
  userMiddleware,
  parseIntParam("planId"),
  workoutPlanController.getWorkoutPlanById,
);

// Create a new workout plan
router.post("/", userMiddleware, workoutPlanController.createWorkoutPlan);

// Update a workout plan
router.patch(
  "/:planId",
  userMiddleware,
  parseIntParam("planId"),
  workoutPlanController.updateWorkoutPlan,
);

// Delete a workout plan
router.delete(
  "/:planId",
  userMiddleware,
  parseIntParam("planId"),
  workoutPlanController.deleteWorkoutPlan,
);

// Mount Workout Day routes
router.use(
  "/:planId/days",
  userMiddleware,
  parseIntParam("planId"),
  workoutDayRouter,
);

export default router;
