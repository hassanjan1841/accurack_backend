-- Invoice.invoiceNumber: drop global unique, add per-tenant unique.
-- Two tenants can now both have invoice #001 — numbers are scoped per client.
DROP INDEX IF EXISTS "Invoice_invoiceNumber_key";
CREATE UNIQUE INDEX "Invoice_invoiceNumber_clientId_key" ON "Invoice"("invoiceNumber", "clientId");

-- Users.employeeCode: drop global unique, add per-tenant unique.
-- Two different clients can now both have an employee with code "EMP001".
DROP INDEX IF EXISTS "Users_employeeCode_key";
CREATE UNIQUE INDEX "Users_employeeCode_clientId_key" ON "Users"("employeeCode", "clientId") WHERE "employeeCode" IS NOT NULL;
