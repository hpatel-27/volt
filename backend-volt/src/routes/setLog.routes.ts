import express from "express";
const router = express.Router({ mergeParams: true });

import * as setLogController from "../controllers/setLog.controller.js";
import { parseUuidParam } from "../middleware/param.middleware.js";

// Get all sets for an exercise log
router.get("/", setLogController.getAllSetLogs);

// Get a specific set by ID
router.get("/:setId", parseUuidParam("setId"), setLogController.getSetById);

// Add a set to an exercise log
router.post("/", setLogController.createSetLog);

// Update a set
router.patch("/:setId", parseUuidParam("setId"), setLogController.updateSetLog);

// Delete a set
router.delete("/:setId", parseUuidParam("setId"), setLogController.deleteSetLog);

export default router;
