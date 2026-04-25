import express from "express";
const router = express.Router({ mergeParams: true });

import * as exerciseLogController from "../controllers/exerciseLog.controller.js";
import { parseIntParam } from "../middleware/param.middleware.js";
import setLogRouter from "./setLog.routes.js";

// Get all exercise logs for a workout log
router.get("/", exerciseLogController.getAllExerciseLogs);

// Get a single exercise log with sets
router.get(
  "/:exerciseLogId",
  parseIntParam("exerciseLogId"),
  exerciseLogController.getExerciseLogById,
);

// Log an exercise in a workout session
router.post("/", exerciseLogController.createExerciseLog);

// Update an exercise log (notes)
router.patch(
  "/:exerciseLogId",
  parseIntParam("exerciseLogId"),
  exerciseLogController.updateExerciseLog,
);

// Delete an exercise log
router.delete(
  "/:exerciseLogId",
  parseIntParam("exerciseLogId"),
  exerciseLogController.deleteExerciseLog,
);

// Mount Set Log routes
router.use(
  "/:exerciseLogId/sets",
  parseIntParam("exerciseLogId"),
  setLogRouter,
);

export default router;
