-- DropForeignKey
ALTER TABLE "Sales" DROP CONSTRAINT "Sales_customerId_fkey";

-- AlterTable
ALTER TABLE "Sales" ADD COLUMN     "description" TEXT,
ALTER COLUMN "customerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Sales" ADD CONSTRAINT "Sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
