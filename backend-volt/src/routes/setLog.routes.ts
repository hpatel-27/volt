import express from "express";
import * as setLogController from "../controllers/setLog.controller.js";
import { parseUuidParam } from "../middleware/param.middleware.js";
import { userMiddleware } from "../middleware/user.middleware.js";

const nestedRouter = express.Router({ mergeParams: true });
const flatRouter = express.Router();
flatRouter.use(userMiddleware);

// Get all sets for an exercise log
nestedRouter.get("/", setLogController.getAllSetLogs);

// Get a specific set by ID
flatRouter.get("/:setId", parseUuidParam("setId"), setLogController.getSetById);

// Add a set to an exercise log
nestedRouter.post("/", setLogController.createSetLog);

// Update a set
flatRouter.patch(
  "/:setId",
  parseUuidParam("setId"),
  setLogController.updateSetLog,
);

// Delete a set
flatRouter.delete(
  "/:setId",
  parseUuidParam("setId"),
  setLogController.deleteSetLog,
);

export { nestedRouter, flatRouter };
