/*
  Warnings:

  - You are about to drop the column `status` on the `Kit` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Kit" DROP COLUMN "status";

-- DropEnum
DROP TYPE "KitStatus";
