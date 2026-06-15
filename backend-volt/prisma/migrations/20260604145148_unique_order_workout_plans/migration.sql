/*
  Warnings:

  - A unique constraint covering the columns `[workoutDayId,order]` on the table `workout_day_exercises` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[workoutPlanId,order]` on the table `workout_days` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "workout_day_exercises_workoutDayId_order_key" ON "workout_day_exercises"("workoutDayId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "workout_days_workoutPlanId_order_key" ON "workout_days"("workoutPlanId", "order");
