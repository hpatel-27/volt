-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('STRENGTH', 'HYPERTROPHY', 'WEIGHT_LOSS');

-- AlterTable
ALTER TABLE "nutrition_logs" ALTER COLUMN "date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "workout_day_exercises" ADD COLUMN     "restSeconds" INTEGER,
ADD COLUMN     "targetRepsMax" INTEGER,
ADD COLUMN     "targetRepsMin" INTEGER,
ADD COLUMN     "targetSets" INTEGER;

-- AlterTable
ALTER TABLE "workout_plans" ADD COLUMN     "type" "PlanType";
