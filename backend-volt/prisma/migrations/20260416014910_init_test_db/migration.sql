/*
  Warnings:

  - A unique constraint covering the columns `[userId,date]` on the table `nutrition_logs` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "meals" DROP CONSTRAINT "meals_nutritionLogId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "nutrition_logs_userId_date_key" ON "nutrition_logs"("userId", "date");

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_nutritionLogId_fkey" FOREIGN KEY ("nutritionLogId") REFERENCES "nutrition_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
