-- CreateEnum
CREATE TYPE "KitType" AS ENUM ('BASE', 'PLUS', 'PREMIUM');

-- CreateEnum
CREATE TYPE "KitStatus" AS ENUM ('PENDING_ONBOARDING', 'ONBOARDING_COMPLETED', 'PREPARING_KIT', 'SHIPPED_TO_USER', 'DELIVERED_AWAITING_RETURN', 'SHIPPED_TO_LAB', 'RECEIVED_IN_PROCESS', 'COMPLETE_REPORT_DELIVERED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "kitCount" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Kit" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kitNumber" INTEGER NOT NULL,
    "kitType" "KitType" NOT NULL DEFAULT 'BASE',
    "status" "KitStatus" NOT NULL DEFAULT 'PENDING_ONBOARDING',
    "childId" TEXT,
    "consentId" TEXT,
    "questionnaireId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Kit_childId_key" ON "Kit"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "Kit_consentId_key" ON "Kit"("consentId");

-- CreateIndex
CREATE UNIQUE INDEX "Kit_questionnaireId_key" ON "Kit"("questionnaireId");

-- AddForeignKey
ALTER TABLE "Kit" ADD CONSTRAINT "Kit_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kit" ADD CONSTRAINT "Kit_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kit" ADD CONSTRAINT "Kit_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "Consent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kit" ADD CONSTRAINT "Kit_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE SET NULL ON UPDATE CASCADE;
