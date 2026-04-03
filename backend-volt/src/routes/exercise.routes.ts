import express from "express";
const router = express.Router();
import * as exerciseController from "../controllers/exercise.controller.js";

// Get a paginated list of exercises. Clients can specify the page and limit
// via query parameters, e.g. /exercises?page=2&limit=10
router.get("/", exerciseController.getExercises);

// Get a specific exercise by ID, e.g. /exercises/123
router.get("/:id", exerciseController.getExerciseById);

// Future routes for creating, updating, deleting exercises can be added here.
export default router;
