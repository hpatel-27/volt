import express from "express";
const router = express.Router();

// Import routes
import exampleRoutes from "./example.routes.js";
import weightRoutes from "./weight.routes.js";
import exerciseRoutes from "./exercise.routes.js";
import nutritionRoutes from "./nutrition.routes.js";

// Mount routes
router.use("/examples", exampleRoutes);
router.use("/weights", weightRoutes);
router.use("/exercises", exerciseRoutes);
router.use("/nutrition", nutritionRoutes);

export default router;
