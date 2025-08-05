/*
  Warnings:

  - You are about to drop the column `childDOB` on the `Consent` table. All the data in the column will be lost.
  - You are about to drop the column `childName` on the `Consent` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Consent" DROP COLUMN "childDOB",
DROP COLUMN "childName",
ADD COLUMN     "childId" TEXT;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
