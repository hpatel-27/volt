import express from "express";
const router = express.Router();
import * as exerciseController from "../controllers/exercise.controller.js";
import { userMiddleware } from "../middleware/user.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import { paginationMiddleware } from "../middleware/pagination.middleware.js";

// Get a paginated list of exercises. Clients can specify the page and limit
// via query parameters, e.g. /exercises?page=2&limit=10
router.get("/", paginationMiddleware, exerciseController.getExercises);

// Get a specific exercise by slug, e.g. /exercises/barbell-bench-press
router.get("/:slug", exerciseController.getExerciseById);

router.post(
  "/",
  userMiddleware,
  requireAdmin,
  exerciseController.createExercise,
);

router.patch(
  "/:slug",
  userMiddleware,
  requireAdmin,
  exerciseController.updateExercise,
);

router.delete(
  "/:slug",
  userMiddleware,
  requireAdmin,
  exerciseController.deleteExercise,
);

export default router;
