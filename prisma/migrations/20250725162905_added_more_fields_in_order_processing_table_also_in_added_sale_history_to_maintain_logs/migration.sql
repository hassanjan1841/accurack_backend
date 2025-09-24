/*
  Warnings:

  - The `status` column on the `OrderProcessing` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SaleHistoryAction" AS ENUM ('SALE_CREATED', 'SALE_UPDATED', 'SALE_CANCELLED', 'SALE_COMPLETED', 'SALE_RETURNED', 'SALE_PARTIAL_RETURN', 'INVENTORY_UPDATED', 'PAYMENT_PROCESSED', 'PAYMENT_REFUNDED', 'STATUS_CHANGED', 'ORDER_PROCESSED', 'ITEM_ADDED', 'ITEM_REMOVED', 'CUSTOMER_UPDATED', 'NOTE_ADDED');

-- CreateEnum
CREATE TYPE "OrderProcessingStatus" AS ENUM ('SENT_FOR_VALIDATION', 'PENDING_VALIDATION', 'VALIDATED', 'PICKED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SaleStatus" ADD VALUE 'PICKED';
ALTER TYPE "SaleStatus" ADD VALUE 'PACKED';
ALTER TYPE "SaleStatus" ADD VALUE 'DELIVERED';

-- DropForeignKey
ALTER TABLE "OrderProcessing" DROP CONSTRAINT "OrderProcessing_driverId_fkey";

-- AlterTable
ALTER TABLE "OrderProcessing" ADD COLUMN     "saleId" TEXT,
ALTER COLUMN "driverId" DROP NOT NULL,
ALTER COLUMN "driverName" DROP NOT NULL,
ALTER COLUMN "paymentAmount" SET DEFAULT 0,
ALTER COLUMN "paymentType" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "OrderProcessingStatus" NOT NULL DEFAULT 'SENT_FOR_VALIDATION';

-- CreateTable
CREATE TABLE "sale_history" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "action" "SaleHistoryAction" NOT NULL,
    "description" TEXT NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrderProcessing" ADD CONSTRAINT "OrderProcessing_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderProcessing" ADD CONSTRAINT "OrderProcessing_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_history" ADD CONSTRAINT "sale_history_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_history" ADD CONSTRAINT "sale_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_history" ADD CONSTRAINT "sale_history_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
