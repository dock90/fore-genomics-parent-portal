/*
  Migration to add parentId and purchaserId fields to Order table
  For existing data, we'll set purchaserId to the current userId and parentId to null
*/

-- First, add the new columns
ALTER TABLE "Order" ADD COLUMN "parentId" TEXT;
ALTER TABLE "Order" ADD COLUMN "purchaserId" TEXT;

-- Update existing data: set purchaserId to current userId, parentId to null
UPDATE "Order" SET "purchaserId" = "userId", "parentId" = NULL;

-- Make purchaserId NOT NULL after setting values
ALTER TABLE "Order" ALTER COLUMN "purchaserId" SET NOT NULL;

-- Drop the old foreign key constraint
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- Drop the old userId column
ALTER TABLE "Order" DROP COLUMN "userId";

-- Add new foreign key constraints
ALTER TABLE "Order" ADD CONSTRAINT "Order_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_purchaserId_fkey" FOREIGN KEY ("purchaserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
