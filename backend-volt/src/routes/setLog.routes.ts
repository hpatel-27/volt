import express from "express";
const router = express.Router({ mergeParams: true });

import * as setLogController from "../controllers/setLog.controller.js";
import { parseIntParam } from "../middleware/param.middleware.js";

// Get all sets for an exercise log
router.get("/", setLogController.getAllSetLogs);

// Add a set to an exercise log
router.post("/", setLogController.createSetLog);

// Update a set
router.patch("/:setId", parseIntParam("setId"), setLogController.updateSetLog);

// Delete a set
router.delete(
  "/:setId",
  parseIntParam("setId"),
  setLogController.deleteSetLog,
);

export default router;
