import express from "express";
const router = express.Router();

// Import routes
import exampleRoutes from "./example.routes.js";
import weightRoutes from "./weight.routes.js";

router.use("/examples", exampleRoutes);
router.use("/weights", weightRoutes);

export default router;
