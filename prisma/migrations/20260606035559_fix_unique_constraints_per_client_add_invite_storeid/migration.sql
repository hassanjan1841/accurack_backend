-- Fix multi-tenancy: replace global unique constraints with per-client ones
-- so different clients can have categories/tax types/regions/roles with the same name.

-- Category: drop global unique on name and code, add per-client unique
DROP INDEX IF EXISTS "Category_name_key";
DROP INDEX IF EXISTS "Category_code_key";
CREATE UNIQUE INDEX "Category_name_clientId_key" ON "Category"("name", "clientId");
CREATE UNIQUE INDEX "Category_code_clientId_key" ON "Category"("code", "clientId") WHERE "code" IS NOT NULL;

-- TaxCode: drop global unique on code, add per-client unique
DROP INDEX IF EXISTS "TaxCode_code_key";
CREATE UNIQUE INDEX "TaxCode_code_clientId_key" ON "TaxCode"("code", "clientId");

-- TaxType: drop global unique on name, add per-client unique
DROP INDEX IF EXISTS "TaxType_name_key";
CREATE UNIQUE INDEX "TaxType_name_clientId_key" ON "TaxType"("name", "clientId");

-- Region: drop global unique on name and code, add per-client unique
DROP INDEX IF EXISTS "Region_name_key";
DROP INDEX IF EXISTS "Region_code_key";
CREATE UNIQUE INDEX "Region_name_clientId_key" ON "Region"("name", "clientId");
CREATE UNIQUE INDEX "Region_code_clientId_key" ON "Region"("code", "clientId");

-- RoleTemplate: drop global unique on name, add per-client unique
DROP INDEX IF EXISTS "role_templates_name_key";
CREATE UNIQUE INDEX "role_templates_name_clientId_key" ON "role_templates"("name", "clientId");

-- InviteLinks: add storeId to record which store the invite is for
ALTER TABLE "InviteLinks" ADD COLUMN "storeId" TEXT;
ALTER TABLE "InviteLinks" ADD CONSTRAINT "InviteLinks_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
