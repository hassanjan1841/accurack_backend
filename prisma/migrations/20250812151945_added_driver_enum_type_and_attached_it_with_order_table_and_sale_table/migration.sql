-- CreateEnum
CREATE TYPE "DriverType" AS ENUM ('COMPANY', 'THIRD_PARTY');

-- AlterTable
ALTER TABLE "OrderProcessing" ADD COLUMN     "driverType" "DriverType";

-- AlterTable
ALTER TABLE "Sales" ADD COLUMN     "driverType" "DriverType";
