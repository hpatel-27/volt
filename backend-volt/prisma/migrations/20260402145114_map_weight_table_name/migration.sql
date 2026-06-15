/*
  Warnings:

  - You are about to drop the `Weight` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Weight" DROP CONSTRAINT "Weight_userId_fkey";

-- DropTable
DROP TABLE "Weight";

-- CreateTable
CREATE TABLE "weights" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "weights_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "weights" ADD CONSTRAINT "weights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
