import type { GoalModel } from "../generated/prisma/models.js";
import type { Goal } from "../types/goal.dto.js";

function toGoalDto(goal: GoalModel): Goal {
  const id = goal.id;
  const targetWeight = goal.targetWeight;
  const calorieGoal = goal.calorieGoal;
  const proteinGoal = goal.proteinGoal;
  const carbGoal = goal.carbGoal;
  const fatGoal = goal.fatGoal;
  const goalType = goal.goalType;
  const createdAt = goal.createdAt.toISOString().slice(0, 10);
  const updatedAt = goal.updatedAt
    ? goal.updatedAt.toISOString().slice(0, 10)
    : null;

  return {
    id,
    targetWeight,
    calorieGoal,
    proteinGoal,
    carbGoal,
    fatGoal,
    goalType,
    createdAt,
    updatedAt,
  };
}

export { toGoalDto };
