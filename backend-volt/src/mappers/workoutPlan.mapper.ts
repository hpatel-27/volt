import type {
  PlanWithDayCount,
  PlanWithDaysAndExercises,
  WorkoutPlan,
  WorkoutPlanDetail,
} from "../types/workoutPlan.dto.js";
import { toWorkoutDayDetailDto } from "./workoutDay.mapper.js";

function toWorkoutPlanDto(plan: PlanWithDayCount): WorkoutPlan {
  return {
    id: plan.id,
    name: plan.name,
    type: plan.type,
    daysPerWeek: plan._count.workoutDays,
    createdAt: plan.createdAt.toISOString().slice(0, 10),
    updatedAt: plan.updatedAt
      ? plan.updatedAt.toISOString().slice(0, 10)
      : null,
  };
}

function toWorkoutPlanDetailDto(
  plan: PlanWithDaysAndExercises,
): WorkoutPlanDetail {
  return {
    id: plan.id,
    name: plan.name,
    type: plan.type,
    createdAt: plan.createdAt.toISOString().slice(0, 10),
    updatedAt: plan.updatedAt
      ? plan.updatedAt.toISOString().slice(0, 10)
      : null,
    workoutDays: plan.workoutDays.map((d) => toWorkoutDayDetailDto(d)),
  };
}

export { toWorkoutPlanDto, toWorkoutPlanDetailDto };
