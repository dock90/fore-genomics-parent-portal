/*
  Warnings:

  - You are about to drop the column `postTestCounselingScheduled` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `preTestCounselingScheduled` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "postTestCounselingScheduled",
DROP COLUMN "preTestCounselingScheduled";
