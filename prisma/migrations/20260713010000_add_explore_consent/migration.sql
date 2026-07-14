-- AlterTable: Fore Explore product consent (separate from screening/clinical consent)
ALTER TABLE "Kit" ADD COLUMN "exploreConsentedAt" TIMESTAMP(3);
ALTER TABLE "Kit" ADD COLUMN "exploreConsentSignerName" TEXT;
ALTER TABLE "Kit" ADD COLUMN "exploreConsentVersion" TEXT;
