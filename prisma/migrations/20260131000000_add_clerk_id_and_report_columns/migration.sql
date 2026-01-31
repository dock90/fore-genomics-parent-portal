-- CreateEnum
CREATE TYPE "CommunicationPreference" AS ENUM ('EMAIL', 'SMS', 'BOTH');

-- AlterTable
ALTER TABLE "Kit" ADD COLUMN "fullLabReportFileName" TEXT;
ALTER TABLE "Kit" ADD COLUMN "parentReportFileName" TEXT;
ALTER TABLE "Kit" ADD COLUMN "pediatricianReportFileName" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "clerkId" TEXT;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN "communicationPreference" "CommunicationPreference" NOT NULL DEFAULT 'EMAIL';

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");
