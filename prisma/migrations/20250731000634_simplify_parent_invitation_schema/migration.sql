/*
  Warnings:

  - You are about to drop the column `childDOB` on the `ParentInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `childEthnicity` on the `ParentInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `childFirstName` on the `ParentInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `childLastName` on the `ParentInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `childSex` on the `ParentInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `initiatedBy` on the `ParentInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `initiatorEmail` on the `ParentInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `invitationToken` on the `ParentInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `parentEmail` on the `ParentInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `parentName` on the `ParentInvitation` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ParentInvitation_invitationToken_key";

-- AlterTable
ALTER TABLE "ParentInvitation" DROP COLUMN "childDOB",
DROP COLUMN "childEthnicity",
DROP COLUMN "childFirstName",
DROP COLUMN "childLastName",
DROP COLUMN "childSex",
DROP COLUMN "initiatedBy",
DROP COLUMN "initiatorEmail",
DROP COLUMN "invitationToken",
DROP COLUMN "parentEmail",
DROP COLUMN "parentName";
