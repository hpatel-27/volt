import express from "express";
const router = express.Router();

import * as workoutLogController from "../controllers/workoutLog.controller.js";
import { userMiddleware } from "../middleware/user.middleware.js";
import { parseUuidParam } from "../middleware/param.middleware.js";
import { paginationMiddleware } from "../middleware/pagination.middleware.js";
import { parseDate, parseOptionalDate } from "../middleware/date.middleware.js";
import exerciseLogRouter from "./exerciseLog.routes.js";

// Get all workout logs for the authenticated user
router.get(
  "/",
  userMiddleware,
  paginationMiddleware,
  workoutLogController.getAllWorkoutLogs,
);

// Get a single workout log with exercise logs and sets
router.get(
  "/:logId",
  userMiddleware,
  parseUuidParam("logId"),
  workoutLogController.getWorkoutLogById,
);

// Create a new workout log
router.post(
  "/",
  userMiddleware,
  parseDate,
  workoutLogController.createWorkoutLog,
);

// Update a workout log
router.patch(
  "/:logId",
  userMiddleware,
  parseUuidParam("logId"),
  parseOptionalDate,
  workoutLogController.updateWorkoutLog,
);

// Delete a workout log
router.delete(
  "/:logId",
  userMiddleware,
  parseUuidParam("logId"),
  workoutLogController.deleteWorkoutLog,
);

// Mount Exercise Log routes
router.use(
  "/:logId/exercises",
  userMiddleware,
  parseUuidParam("logId"),
  exerciseLogRouter,
);

export default router;
