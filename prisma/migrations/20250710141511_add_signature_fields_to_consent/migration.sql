-- AlterTable
ALTER TABLE "Consent" ADD COLUMN     "childDOB" TIMESTAMP(3),
ADD COLUMN     "childName" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "part1Accepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "part2Accepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "part3Accepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "relationshipToChild" TEXT,
ADD COLUMN     "signature" TEXT,
ADD COLUMN     "signatureDate" TIMESTAMP(3),
ADD COLUMN     "userAgent" TEXT;
