/*
  Warnings:

  - Added the required column `clientId` to the `ApiTokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `AuditLogs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `BalanceSheet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `CustomField` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `ErrorLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `ExpenseColumn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `ExpenseEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `ExpenseEntryValue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `Expenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `FileUploadInventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `FileUploadSales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `InviteLinks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `Notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `Pack` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `PasswordResetTokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `ProductSupplier` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `PurchaseOrders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `Region` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `Reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `SaleAdjustment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `SaleItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `SaleReturn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `SalesDraftItems` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `StoreSettings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `Suppliers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `TaxAssignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `TaxCode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `TaxRate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `TaxType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `UserStoreMap` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `role_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `sale_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `user_roles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ApiTokens" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AuditLogs" ADD COLUMN     "clientId" TEXT;
UPDATE "AuditLogs" SET "clientId" = (SELECT id FROM "Clients" LIMIT 1) WHERE "clientId" IS NULL;
ALTER TABLE "AuditLogs" ALTER COLUMN "clientId" SET NOT NULL;

-- AlterTable
ALTER TABLE "BalanceSheet" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CustomField" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ErrorLog" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ExpenseColumn" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ExpenseEntry" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ExpenseEntryValue" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Expenses" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FileUploadInventory" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FileUploadSales" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "InviteLinks" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Notifications" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Pack" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PasswordResetTokens" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ProductSupplier" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseOrders" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Region" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Reports" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SaleAdjustment" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SaleReturn" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SalesDraftItems" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Suppliers" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TaxAssignment" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TaxCode" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TaxRate" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TaxType" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserStoreMap" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "permissions" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "role_templates" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "sale_history" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "user_roles" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "SaleAdjustment" ADD CONSTRAINT "SaleAdjustment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesDraftItems" ADD CONSTRAINT "SalesDraftItems_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceSheet" ADD CONSTRAINT "BalanceSheet_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturn" ADD CONSTRAINT "SaleReturn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSettings" ADD CONSTRAINT "StoreSettings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStoreMap" ADD CONSTRAINT "UserStoreMap_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteLinks" ADD CONSTRAINT "InviteLinks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_templates" ADD CONSTRAINT "role_templates_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifications" ADD CONSTRAINT "Notifications_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogs" ADD CONSTRAINT "AuditLogs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiTokens" ADD CONSTRAINT "ApiTokens_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetTokens" ADD CONSTRAINT "PasswordResetTokens_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suppliers" ADD CONSTRAINT "Suppliers_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrders" ADD CONSTRAINT "PurchaseOrders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expenses" ADD CONSTRAINT "Expenses_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reports" ADD CONSTRAINT "Reports_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSupplier" ADD CONSTRAINT "ProductSupplier_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pack" ADD CONSTRAINT "Pack_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileUploadInventory" ADD CONSTRAINT "FileUploadInventory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileUploadSales" ADD CONSTRAINT "FileUploadSales_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxCode" ADD CONSTRAINT "TaxCode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxType" ADD CONSTRAINT "TaxType_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRate" ADD CONSTRAINT "TaxRate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxAssignment" ADD CONSTRAINT "TaxAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_history" ADD CONSTRAINT "sale_history_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseColumn" ADD CONSTRAINT "ExpenseColumn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntryValue" ADD CONSTRAINT "ExpenseEntryValue_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
