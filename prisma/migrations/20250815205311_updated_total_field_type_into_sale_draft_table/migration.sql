/*
  Warnings:

  - The `total` column on the `SalesDraftItems` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "SalesDraftItems" DROP COLUMN "total",
ADD COLUMN     "total" DOUBLE PRECISION;
