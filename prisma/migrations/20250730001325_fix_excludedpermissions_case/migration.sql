/*
  Warnings:

  - You are about to drop the column `excludedPermissions` on the `Users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Users" DROP COLUMN "excludedPermissions",
ADD COLUMN     "excludedpermissions" JSONB;
