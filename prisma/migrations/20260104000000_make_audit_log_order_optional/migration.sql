-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_orderId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "orderId" DROP NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey (order - optional, set null on delete)
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (user - optional, set null on delete to preserve logs)
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
