/*
  Warnings:

  - You are about to drop the column `reportFileName` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Kit" ADD COLUMN     "reportFileName" TEXT;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "reportFileName";
