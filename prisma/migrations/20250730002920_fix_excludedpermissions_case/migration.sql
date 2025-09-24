/*
  Warnings:

  - You are about to drop the column `excludedpermissions` on the `Users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Users" DROP COLUMN "excludedpermissions",
ADD COLUMN     "excludedPermissions" JSONB;
