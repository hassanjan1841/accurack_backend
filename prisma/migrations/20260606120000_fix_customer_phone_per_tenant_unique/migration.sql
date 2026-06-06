-- Customer: drop global unique on phoneNumber, add per-client unique
-- Same customer (by phone) can now exist across different tenants.
-- Within a single tenant, phone numbers remain unique.
DROP INDEX IF EXISTS "Customer_phoneNumber_key";
CREATE UNIQUE INDEX "Customer_phoneNumber_clientId_key" ON "Customer"("phoneNumber", "clientId");
