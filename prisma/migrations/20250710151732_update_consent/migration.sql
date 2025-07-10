-- AlterTable
ALTER TABLE "Consent" ADD COLUMN     "consentAll" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "signerName" TEXT;
