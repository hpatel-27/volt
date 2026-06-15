/*
  Warnings:

  - You are about to drop the column `name` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[googleId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "name",
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "force" TEXT,
    "level" TEXT,
    "mechanic" TEXT,
    "equipment" TEXT,
    "primaryMuscles" TEXT[],
    "secondaryMuscles" TEXT[],
    "instructions" TEXT[],
    "category" TEXT,
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_plans" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "workout_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_days" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "workoutPlanId" INTEGER NOT NULL,

    CONSTRAINT "workout_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_day_exercises" (
    "id" SERIAL NOT NULL,
    "order" INTEGER NOT NULL,
    "workoutDayId" INTEGER NOT NULL,
    "exerciseId" TEXT NOT NULL,

    CONSTRAINT "workout_day_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_logs" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "workoutDayId" INTEGER,

    CONSTRAINT "workout_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_logs" (
    "id" SERIAL NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "workoutLogId" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "exercise_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "set_logs" (
    "id" SERIAL NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "exerciseLogId" INTEGER NOT NULL,

    CONSTRAINT "set_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_logs" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "nutrition_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meals" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "nutritionLogId" INTEGER NOT NULL,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- AddForeignKey
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_days" ADD CONSTRAINT "workout_days_workoutPlanId_fkey" FOREIGN KEY ("workoutPlanId") REFERENCES "workout_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_day_exercises" ADD CONSTRAINT "workout_day_exercises_workoutDayId_fkey" FOREIGN KEY ("workoutDayId") REFERENCES "workout_days"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_day_exercises" ADD CONSTRAINT "workout_day_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_workoutDayId_fkey" FOREIGN KEY ("workoutDayId") REFERENCES "workout_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_workoutLogId_fkey" FOREIGN KEY ("workoutLogId") REFERENCES "workout_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_exerciseLogId_fkey" FOREIGN KEY ("exerciseLogId") REFERENCES "exercise_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_logs" ADD CONSTRAINT "nutrition_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_nutritionLogId_fkey" FOREIGN KEY ("nutritionLogId") REFERENCES "nutrition_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
