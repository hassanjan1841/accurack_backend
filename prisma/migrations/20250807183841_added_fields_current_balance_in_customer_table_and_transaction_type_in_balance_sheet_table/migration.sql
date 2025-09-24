/*
  Warnings:

  - Added the required column `transactionType` to the `BalanceSheet` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SALE', 'PAYMENT', 'ADJUSTMENT', 'REFUND');

-- AlterTable
ALTER TABLE "BalanceSheet" ADD COLUMN     "transactionType" "TransactionType" NOT NULL,
ALTER COLUMN "amountPaid" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
