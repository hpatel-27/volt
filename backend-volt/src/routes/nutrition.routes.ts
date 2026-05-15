import express from "express";
const router = express.Router();

import * as nutritionController from "../controllers/nutrition.controller.js";
import { userMiddleware } from "../middleware/user.middleware.js";
import { parseDateParam } from "../middleware/param.middleware.js";
import { paginationMiddleware } from "../middleware/pagination.middleware.js";
import mealRouter from "./meal.routes.js";
import { parseDate, parseDateRange } from "../middleware/date.middleware.js";

// All routes in this file require the user to be authenticated, so we apply the userMiddleware to all routes

// Nutrition Routes

// Get all nutrition logs (as summaries) for the user that made the request, with pagination
router.get(
  "/",
  userMiddleware,
  paginationMiddleware,
  nutritionController.getAllNutritionLogs,
);
// Get all of a user's nutrition logs in a date range
router.get(
  "/range",
  userMiddleware,
  parseDateRange,
  nutritionController.getNutritionLogsByRange,
);
// Get a single nutrition log by its date (YYYY-MM-DD), this includes full meal details
router.get(
  "/:date",
  userMiddleware,
  parseDateParam("date"),
  nutritionController.getNutritionLogByDate,
);
// Create a new nutrition log
router.post(
  "/",
  userMiddleware,
  parseDate,
  nutritionController.createNutritionLog,
);
// PATCH /nutrition/:date — kept for forward-extensibility; currently returns 405
// because date is the URL key and cannot be changed via update.
router.patch(
  "/:date",
  userMiddleware,
  parseDateParam("date"),
  nutritionController.updateNutritionLog,
);
// Delete a nutrition log by date
router.delete(
  "/:date",
  userMiddleware,
  parseDateParam("date"),
  nutritionController.deleteNutritionLog,
);

// Mount Meal routes under /:date/meals
// mergeParams: true on the meal router allows :date to be accessible in meal controllers
router.use("/:date/meals", userMiddleware, parseDateParam("date"), mealRouter);

export default router;
