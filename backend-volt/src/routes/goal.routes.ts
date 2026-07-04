import express from "express";
const router = express.Router();

import * as goalController from "../controllers/goal.controller.js";
import { userMiddleware } from "../middleware/user.middleware.js";

router.get("/", userMiddleware, goalController.getGoal);
router.post("/", userMiddleware, goalController.createGoal);
router.patch("/", userMiddleware, goalController.updateGoal);

export default router;
