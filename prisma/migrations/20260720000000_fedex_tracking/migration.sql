-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "inboundDeliveredAt" TIMESTAMP(3),
ADD COLUMN     "lastFedexEventAt" TIMESTAMP(3),
ADD COLUMN     "lastFedexStatus" TEXT,
ADD COLUMN     "outboundDeliveredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FedexTrackingEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "trackingNumber" TEXT NOT NULL,
    "direction" TEXT,
    "kind" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FedexTrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FedexTrackingEvent_trackingNumber_idx" ON "FedexTrackingEvent"("trackingNumber");

-- CreateIndex
CREATE INDEX "FedexTrackingEvent_orderId_idx" ON "FedexTrackingEvent"("orderId");

-- CreateIndex
CREATE INDEX "FedexTrackingEvent_createdAt_idx" ON "FedexTrackingEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "FedexTrackingEvent" ADD CONSTRAINT "FedexTrackingEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

