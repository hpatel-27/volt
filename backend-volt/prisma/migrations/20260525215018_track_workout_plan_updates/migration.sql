-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activePlanId" TEXT;

-- AlterTable
ALTER TABLE "workout_plans" ADD COLUMN     "updatedAt" TIMESTAMP(3);
