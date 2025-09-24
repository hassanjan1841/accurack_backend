/*
  Warnings:

  - A unique constraint covering the columns `[customerNo]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[orderNo]` on the table `OrderProcessing` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[saleReturnNo]` on the table `SaleReturn` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[saleNo]` on the table `Sales` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "customerNo" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "OrderProcessing" ADD COLUMN     "orderNo" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "SaleReturn" ADD COLUMN     "saleReturnNo" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "Sales" ADD COLUMN     "saleNo" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerNo_key" ON "Customer"("customerNo");

-- CreateIndex
CREATE UNIQUE INDEX "OrderProcessing_orderNo_key" ON "OrderProcessing"("orderNo");

-- CreateIndex
CREATE UNIQUE INDEX "SaleReturn_saleReturnNo_key" ON "SaleReturn"("saleReturnNo");

-- CreateIndex
CREATE UNIQUE INDEX "Sales_saleNo_key" ON "Sales"("saleNo");
