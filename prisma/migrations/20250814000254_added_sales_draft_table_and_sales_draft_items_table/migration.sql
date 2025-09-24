-- CreateTable
CREATE TABLE "SalesDraft" (
    "id" TEXT NOT NULL,
    "customerPhoneNumber" TEXT NOT NULL,
    "customerName" TEXT,
    "customerMail" TEXT,
    "customerAddress" TEXT,
    "customerCountry" TEXT,
    "customerState" TEXT,
    "customerCity" TEXT,
    "customerZipCode" TEXT,
    "customerStreet" TEXT,
    "storeId" TEXT NOT NULL,
    "userId" TEXT,
    "clientId" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "source" TEXT,
    "totalAmount" DOUBLE PRECISION,
    "subTotalAmount" DOUBLE PRECISION,
    "tax" DOUBLE PRECISION,
    "discount" DOUBLE PRECISION,
    "generateInvoice" BOOLEAN NOT NULL DEFAULT false,
    "businessInfo" BOOLEAN NOT NULL DEFAULT false,
    "cashierName" TEXT,
    "shippingAddress" TEXT,
    "shippingCountry" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingZipCode" TEXT,
    "shippingStreet" TEXT,
    "assignedDriverId" TEXT,
    "assignedDriverName" TEXT,
    "useCustomerAddress" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesDraftItems" (
    "id" TEXT NOT NULL,
    "saleDraftId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "pluUpc" TEXT NOT NULL,
    "allowance" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "packType" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesDraftItems_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SalesDraft" ADD CONSTRAINT "SalesDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesDraft" ADD CONSTRAINT "SalesDraft_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesDraft" ADD CONSTRAINT "SalesDraft_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesDraftItems" ADD CONSTRAINT "SalesDraftItems_saleDraftId_fkey" FOREIGN KEY ("saleDraftId") REFERENCES "SalesDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
