/*
  Warnings:

  - You are about to drop the column `postTestCounselingDate` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `postTestCounselingEventId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `postTestCounselingInviteeId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `postTestCounselingScheduled` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `preTestCounselingDate` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `preTestCounselingEventId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `preTestCounselingInviteeId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `preTestCounselingScheduled` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "postTestCounselingDate" TIMESTAMP(3),
ADD COLUMN     "postTestCounselingEventId" TEXT,
ADD COLUMN     "postTestCounselingInviteeId" TEXT,
ADD COLUMN     "postTestCounselingScheduled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preTestCounselingDate" TIMESTAMP(3),
ADD COLUMN     "preTestCounselingEventId" TEXT,
ADD COLUMN     "preTestCounselingInviteeId" TEXT,
ADD COLUMN     "preTestCounselingScheduled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "postTestCounselingDate",
DROP COLUMN "postTestCounselingEventId",
DROP COLUMN "postTestCounselingInviteeId",
DROP COLUMN "postTestCounselingScheduled",
DROP COLUMN "preTestCounselingDate",
DROP COLUMN "preTestCounselingEventId",
DROP COLUMN "preTestCounselingInviteeId",
DROP COLUMN "preTestCounselingScheduled";
