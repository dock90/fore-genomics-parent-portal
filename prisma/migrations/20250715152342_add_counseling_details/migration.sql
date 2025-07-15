-- AlterTable
ALTER TABLE "User" ADD COLUMN     "postTestCounselingDate" TIMESTAMP(3),
ADD COLUMN     "postTestCounselingEventId" TEXT,
ADD COLUMN     "postTestCounselingInviteeId" TEXT,
ADD COLUMN     "preTestCounselingDate" TIMESTAMP(3),
ADD COLUMN     "preTestCounselingEventId" TEXT,
ADD COLUMN     "preTestCounselingInviteeId" TEXT;
