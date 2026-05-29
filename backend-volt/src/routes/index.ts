import express from "express";
const router = express.Router();

// Import routes
import exampleRoutes from "./example.routes.js";
import weightRoutes from "./weight.routes.js";
import exerciseRoutes from "./exercise.routes.js";
import nutritionRoutes from "./nutrition.routes.js";
import workoutPlanRoutes from "./workoutPlan.routes.js";
import workoutLogRoutes from "./workoutLog.routes.js";
import userRoutes from "./user.routes.js";
// Mount routes
router.use("/examples", exampleRoutes);
router.use("/weights", weightRoutes);
router.use("/exercises", exerciseRoutes);
router.use("/nutrition-logs", nutritionRoutes);
router.use("/workout-plans", workoutPlanRoutes);
router.use("/workout-logs", workoutLogRoutes);
router.use("/users", userRoutes);

export default router;
