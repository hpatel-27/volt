import type { Prisma, PlanType } from "../generated/prisma/client.js";
import type { WorkoutDayDetail } from "./workoutDay.dto.js";

export interface CreateWorkoutPlanInput {
  userId: string;
  name: string;
}

export interface UpdateWorkoutPlanInput {
  name?: string;
}

// Matches a plan that includes the count of workout days scheduled for the plan
export type PlanWithDayCount = Prisma.WorkoutPlanGetPayload<{
  include: { _count: { select: { workoutDays: true } } };
}>;

// Matches a plan fetched with its days and each day's exercises (with the
// referenced exercise's slug + name). Used by the single-plan detail endpoint.
export type PlanWithDaysAndExercises = Prisma.WorkoutPlanGetPayload<{
  include: {
    workoutDays: {
      include: {
        exercises: {
          include: { exercise: { select: { slug: true; name: true } } };
        };
      };
    };
  };
}>;

// API response shape for the plan list
export interface WorkoutPlan {
  id: string;
  name: string;
  type: PlanType | null;
  daysPerWeek: number;
  createdAt: Date;
}

// API response shape for a single plan with its full structure expanded.
export interface WorkoutPlanDetail {
  id: string;
  name: string;
  type: PlanType | null;
  createdAt: Date;
  workoutDays: WorkoutDayDetail[];
}
