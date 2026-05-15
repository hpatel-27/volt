import express from "express";
const router = express.Router();

import * as weightController from "../controllers/weight.controller.js";
import { userMiddleware } from "../middleware/user.middleware.js";
import { parseUuidParam } from "../middleware/param.middleware.js";
import { paginationMiddleware } from "../middleware/pagination.middleware.js";
import {
  parseDate,
  parseOptionalDate,
  parseDateRange,
} from "../middleware/date.middleware.js";

// Get all of a user's weights with pagination
router.get(
  "/",
  userMiddleware,
  paginationMiddleware,
  weightController.getAllWeights,
);

// Get all of a user's weights in a date range
router.get(
  "/range",
  userMiddleware,
  parseDateRange,
  weightController.getWeightsByRange,
);

// Get a weight entry by its ID
router.get(
  "/:weightId",
  userMiddleware,
  parseUuidParam("weightId"),
  weightController.getWeightById,
);

// Create a new weight entry
router.post("/", userMiddleware, parseDate, weightController.createWeight);

// Update a weight entry by its ID
router.patch(
  "/:weightId",
  userMiddleware,
  parseUuidParam("weightId"),
  parseOptionalDate,
  weightController.updateWeight,
);

// Delete a weight entry by its ID
router.delete(
  "/:weightId",
  userMiddleware,
  parseUuidParam("weightId"),
  weightController.deleteWeight,
);

export default router;
