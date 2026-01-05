-- DropForeignKey (if exists)
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_orderId_fkey";

-- AlterTable - make orderId optional
ALTER TABLE "AuditLog" ALTER COLUMN "orderId" DROP NOT NULL;

-- AlterTable - make userId optional
ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;

-- Clear invalid userId values (Clerk IDs that don't match database User IDs)
UPDATE "AuditLog" SET "userId" = NULL WHERE "userId" IS NOT NULL AND "userId" NOT IN (SELECT "id" FROM "User");

-- AddForeignKey (order - optional, set null on delete)
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (user - optional, set null on delete to preserve logs)
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
