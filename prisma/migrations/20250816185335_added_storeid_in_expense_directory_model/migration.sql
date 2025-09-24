/*
  Warnings:

  - Made the column `storeId` on table `ExpenseDirectory` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ExpenseDirectory" DROP CONSTRAINT "ExpenseDirectory_storeId_fkey";

-- AlterTable
ALTER TABLE "ExpenseDirectory" ALTER COLUMN "storeId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "ExpenseDirectory" ADD CONSTRAINT "ExpenseDirectory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
