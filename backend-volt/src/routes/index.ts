import express from "express";
const router = express.Router();

// Import routes
import exampleRoutes from "./example.routes.js";
import weightRoutes from "./weight.routes.js";
import exerciseRoutes from "./exercise.routes.js";

// Mount routes
router.use("/examples", exampleRoutes);
router.use("/weights", weightRoutes);
router.use("/exercises", exerciseRoutes);

export default router;
