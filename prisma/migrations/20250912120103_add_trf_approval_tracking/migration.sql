-- Add TRF approval tracking fields to Kit table
ALTER TABLE "Kit" ADD COLUMN "trfApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Kit" ADD COLUMN "trfApprovedAt" TIMESTAMP(3);
ALTER TABLE "Kit" ADD COLUMN "trfApprovedBy" TEXT;
ALTER TABLE "Kit" ADD COLUMN "trfApprovedFileName" TEXT;
