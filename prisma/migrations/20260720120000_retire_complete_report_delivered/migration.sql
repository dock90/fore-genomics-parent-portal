-- Retire the legacy COMPLETE_REPORT_DELIVERED status.
--
-- Every complete order has its report delivered by definition; the only
-- distinction that matters is whether genetic counseling is required. The old
-- catch-all bucket made the admin pipeline ambiguous (orders sat in "Report
-- Delivered" instead of being split into counseling / no-counseling).
--
-- 1) Reclassify existing rows: a booked/scheduled post-test counseling session
--    is the best available signal that the report had findings requiring
--    counseling; everything else is a clean report.
UPDATE "Order"
SET "status" = 'COMPLETE_COUNSELING_REQUIRED'
WHERE "status" = 'COMPLETE_REPORT_DELIVERED'
  AND (
    "postTestCounselingDate" IS NOT NULL
    OR "postTestCounselingEventId" IS NOT NULL
    OR "postTestCounselingInviteeId" IS NOT NULL
  );

UPDATE "Order"
SET "status" = 'COMPLETE_NO_COUNSELING_REQUIRED'
WHERE "status" = 'COMPLETE_REPORT_DELIVERED';

-- 2) Drop the value from the enum (Postgres requires recreating the type).
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";

CREATE TYPE "OrderStatus" AS ENUM (
  'ONBOARDING_COMPLETED',
  'PREPARING_ORDER',
  'SHIPPED_TO_USER',
  'DELIVERED_AWAITING_RETURN',
  'SHIPPED_TO_LAB',
  'RECEIVED_IN_PROCESS',
  'RESAMPLE_REQUIRED',
  'COMPLETE_COUNSELING_REQUIRED',
  'COMPLETE_NO_COUNSELING_REQUIRED',
  'ORDER_RECEIVED',
  'ORDER_CANCELED'
);

ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order"
  ALTER COLUMN "status" TYPE "OrderStatus"
  USING ("status"::text::"OrderStatus");
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'ORDER_RECEIVED';

DROP TYPE "OrderStatus_old";
