import express from "express";
const router = express.Router();

import * as weightController from "../controllers/weight.controller.js";
import { userMiddleware } from "../middleware/user.middleware.js";
import { parseIntParam } from "../middleware/param.middleware.js";
import { paginationMiddleware } from "../middleware/pagination.middleware.js";
import { parseDate, parseOptionalDate } from "../middleware/date.middleware.js";

// Get all of a user's weights with pagination
router.get(
  "/",
  userMiddleware,
  paginationMiddleware,
  weightController.getAllWeights,
);

// Get a weight entry by its ID
router.get(
  "/:weightId",
  userMiddleware,
  parseIntParam("weightId"),
  weightController.getWeightById,
);

// Create a new weight entry
router.post("/", userMiddleware, parseDate, weightController.createWeight);

// Update a weight entry by its ID
router.patch(
  "/:weightId",
  userMiddleware,
  parseIntParam("weightId"),
  parseOptionalDate,
  weightController.updateWeight,
);

// Delete a weight entry by its ID
router.delete(
  "/:weightId",
  userMiddleware,
  parseIntParam("weightId"),
  weightController.deleteWeight,
);

export default router;
