/*
  Warnings:

  - The primary key for the `exercise_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `meals` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `nutrition_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `set_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `weights` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `workout_day_exercises` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `workout_days` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `workout_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `workout_plans` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[slug]` on the table `exercises` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `exercises` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "exercise_logs" DROP CONSTRAINT "exercise_logs_workoutLogId_fkey";

-- DropForeignKey
ALTER TABLE "meals" DROP CONSTRAINT "meals_nutritionLogId_fkey";

-- DropForeignKey
ALTER TABLE "nutrition_logs" DROP CONSTRAINT "nutrition_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "set_logs" DROP CONSTRAINT "set_logs_exerciseLogId_fkey";

-- DropForeignKey
ALTER TABLE "weights" DROP CONSTRAINT "weights_userId_fkey";

-- DropForeignKey
ALTER TABLE "workout_day_exercises" DROP CONSTRAINT "workout_day_exercises_workoutDayId_fkey";

-- DropForeignKey
ALTER TABLE "workout_days" DROP CONSTRAINT "workout_days_workoutPlanId_fkey";

-- DropForeignKey
ALTER TABLE "workout_logs" DROP CONSTRAINT "workout_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "workout_logs" DROP CONSTRAINT "workout_logs_workoutDayId_fkey";

-- DropForeignKey
ALTER TABLE "workout_plans" DROP CONSTRAINT "workout_plans_userId_fkey";

-- AlterTable
ALTER TABLE "exercise_logs" DROP CONSTRAINT "exercise_logs_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "workoutLogId" SET DATA TYPE TEXT,
ADD CONSTRAINT "exercise_logs_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "exercise_logs_id_seq";

-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "meals" DROP CONSTRAINT "meals_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "nutritionLogId" SET DATA TYPE TEXT,
ADD CONSTRAINT "meals_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "meals_id_seq";

-- AlterTable
ALTER TABLE "nutrition_logs" DROP CONSTRAINT "nutrition_logs_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "nutrition_logs_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "nutrition_logs_id_seq";

-- AlterTable
ALTER TABLE "set_logs" DROP CONSTRAINT "set_logs_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "exerciseLogId" SET DATA TYPE TEXT,
ADD CONSTRAINT "set_logs_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "set_logs_id_seq";

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "users_id_seq";

-- AlterTable
ALTER TABLE "weights" DROP CONSTRAINT "weights_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "weights_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "weights_id_seq";

-- AlterTable
ALTER TABLE "workout_day_exercises" DROP CONSTRAINT "workout_day_exercises_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "workoutDayId" SET DATA TYPE TEXT,
ADD CONSTRAINT "workout_day_exercises_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "workout_day_exercises_id_seq";

-- AlterTable
ALTER TABLE "workout_days" DROP CONSTRAINT "workout_days_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "workoutPlanId" SET DATA TYPE TEXT,
ADD CONSTRAINT "workout_days_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "workout_days_id_seq";

-- AlterTable
ALTER TABLE "workout_logs" DROP CONSTRAINT "workout_logs_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "workoutDayId" SET DATA TYPE TEXT,
ADD CONSTRAINT "workout_logs_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "workout_logs_id_seq";

-- AlterTable
ALTER TABLE "workout_plans" DROP CONSTRAINT "workout_plans_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "workout_plans_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "workout_plans_id_seq";

-- CreateIndex
CREATE UNIQUE INDEX "exercises_slug_key" ON "exercises"("slug");

-- AddForeignKey
ALTER TABLE "weights" ADD CONSTRAINT "weights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_days" ADD CONSTRAINT "workout_days_workoutPlanId_fkey" FOREIGN KEY ("workoutPlanId") REFERENCES "workout_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_day_exercises" ADD CONSTRAINT "workout_day_exercises_workoutDayId_fkey" FOREIGN KEY ("workoutDayId") REFERENCES "workout_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_workoutDayId_fkey" FOREIGN KEY ("workoutDayId") REFERENCES "workout_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_workoutLogId_fkey" FOREIGN KEY ("workoutLogId") REFERENCES "workout_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_exerciseLogId_fkey" FOREIGN KEY ("exerciseLogId") REFERENCES "exercise_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_logs" ADD CONSTRAINT "nutrition_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_nutritionLogId_fkey" FOREIGN KEY ("nutritionLogId") REFERENCES "nutrition_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
