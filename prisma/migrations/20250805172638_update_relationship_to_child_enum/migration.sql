/*
  Warnings:

  - The `relationshipToChild` column on the `Consent` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "RelationshipToChild" AS ENUM ('MOTHER', 'FATHER', 'GUARDIAN', 'OTHER');

-- AlterTable
ALTER TABLE "Consent" DROP COLUMN "relationshipToChild",
ADD COLUMN     "relationshipToChild" "RelationshipToChild";
