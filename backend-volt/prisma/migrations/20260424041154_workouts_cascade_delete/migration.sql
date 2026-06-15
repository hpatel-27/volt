-- DropForeignKey
ALTER TABLE "exercise_logs" DROP CONSTRAINT "exercise_logs_workoutLogId_fkey";

-- DropForeignKey
ALTER TABLE "set_logs" DROP CONSTRAINT "set_logs_exerciseLogId_fkey";

-- DropForeignKey
ALTER TABLE "workout_day_exercises" DROP CONSTRAINT "workout_day_exercises_workoutDayId_fkey";

-- DropForeignKey
ALTER TABLE "workout_days" DROP CONSTRAINT "workout_days_workoutPlanId_fkey";

-- AddForeignKey
ALTER TABLE "workout_days" ADD CONSTRAINT "workout_days_workoutPlanId_fkey" FOREIGN KEY ("workoutPlanId") REFERENCES "workout_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_day_exercises" ADD CONSTRAINT "workout_day_exercises_workoutDayId_fkey" FOREIGN KEY ("workoutDayId") REFERENCES "workout_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_workoutLogId_fkey" FOREIGN KEY ("workoutLogId") REFERENCES "workout_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_exerciseLogId_fkey" FOREIGN KEY ("exerciseLogId") REFERENCES "exercise_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
