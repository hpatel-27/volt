/*
  Warnings:

  - A unique constraint covering the columns `[exerciseLogId,setNumber]` on the table `set_logs` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "set_logs_exerciseLogId_setNumber_key" ON "set_logs"("exerciseLogId", "setNumber");
