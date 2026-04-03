import express from "express";
const router = express.Router();
import * as exerciseController from "../controllers/exercise.controller.js";
import { userMiddleware } from "../middleware/user.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";

// Get a paginated list of exercises. Clients can specify the page and limit
// via query parameters, e.g. /exercises?page=2&limit=10
router.get("/", exerciseController.getExercises);

// Get a specific exercise by ID, e.g. /exercises/123
router.get("/:id", exerciseController.getExerciseById);

router.post(
  "/",
  userMiddleware,
  requireAdmin,
  exerciseController.createExercise,
);

router.patch(
  "/:id",
  userMiddleware,
  requireAdmin,
  exerciseController.updateExercise,
);

router.delete(
  "/:id",
  userMiddleware,
  requireAdmin,
  exerciseController.deleteExercise,
);

export default router;
