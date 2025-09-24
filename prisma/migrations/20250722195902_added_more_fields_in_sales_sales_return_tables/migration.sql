/*
  Warnings:

  - Added the required column `refundAmount` to the `SaleReturn` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `returnCategory` on the `SaleReturn` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ReturnCategory" AS ENUM ('SALEABLE', 'SCRAP', 'NON_SALEABLE');

-- AlterTable
ALTER TABLE "SaleReturn" ADD COLUMN     "isProductReturned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "refundAmount" DOUBLE PRECISION NOT NULL,
DROP COLUMN "returnCategory",
ADD COLUMN     "returnCategory" "ReturnCategory" NOT NULL;

-- AlterTable
ALTER TABLE "Sales" ADD COLUMN     "profitAmount" DOUBLE PRECISION;
