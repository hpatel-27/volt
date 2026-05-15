import express from "express";
const router = express.Router({ mergeParams: true });

import * as exerciseLogController from "../controllers/exerciseLog.controller.js";
import { parseUuidParam } from "../middleware/param.middleware.js";
import setLogRouter from "./setLog.routes.js";

// Get all exercise logs for a workout log
router.get("/", exerciseLogController.getAllExerciseLogs);

// Get a single exercise log with sets
router.get(
  "/:exerciseLogId",
  parseUuidParam("exerciseLogId"),
  exerciseLogController.getExerciseLogById,
);

// Log an exercise in a workout session
router.post("/", exerciseLogController.createExerciseLog);

// Update an exercise log (notes)
router.patch(
  "/:exerciseLogId",
  parseUuidParam("exerciseLogId"),
  exerciseLogController.updateExerciseLog,
);

// Delete an exercise log
router.delete(
  "/:exerciseLogId",
  parseUuidParam("exerciseLogId"),
  exerciseLogController.deleteExerciseLog,
);

// Mount Set Log routes
router.use(
  "/:exerciseLogId/sets",
  parseUuidParam("exerciseLogId"),
  setLogRouter,
);

export default router;
