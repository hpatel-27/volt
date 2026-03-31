import express from "express";
const router = express.Router();

// Import routes
import exampleRoutes from "./example.routes.js";
router.use("/examples", exampleRoutes);

export default router;
