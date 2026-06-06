import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { TenantContextService } from '../tenant/tenant-context.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { BulkAssignDriverDto } from './dto/bulk-assign-driver.dto';
import { SaleValidationService } from './sale-validation.service';
import { SaleInventoryService } from './sale-inventory.service';
import { SalePricingService } from './sale-pricing.service';
import { CustomerBalanceService } from './customer-balance.service';
import { hasIn } from 'lodash';
import { SaleHistoryService } from './sale-history.service';
import {
  DriverType,
  InvoiceSource,
  OrderProcessingStatus,
  PaymentMethod,
  PaymentStatus,
  SaleConfirmation,
  SaleStatus,
  TransactionType,
} from '@prisma/client';
import { ParsedResult, parseExcelOrHTML } from 'src/utils/salesFileParser';
import { chunk } from 'lodash';
import * as crypto from 'crypto';
import { SaleDraftService } from './sale-draft.service';

@Injectable()
export class SalesService {
  constructor(
    private tenantContext: TenantContextService,
    private validationService: SaleValidationService,
    private inventoryService: SaleInventoryService,
    private pricingService: SalePricingService,
    private balanceService: CustomerBalanceService,
    private saleHistoryService: SaleHistoryService,
    private saleDraftService: SaleDraftService,
  ) {}

  async createSale(
    createSaleDto: CreateSaleDto,
    userId: string,
    draftId: string,
    salesFileId: string,
    tx?: any,
  ) {
    const {
      customerPhoneNumber,
      customerName,
      customerMail,
      customerAddress,
      customerCity,
      customerState,
      customerCountry,
      customerStreet,
      customerZipCode,
      storeId,
      clientId,
      saleItems,
      paymentMethod,
      source,
      totalAmount,
      tax = 0,
      discount = 0,
      generateInvoice = true,
      businessInfo,
      cashierName,
      // New shipping address fields
      shippingAddress,
      shippingCountry,
      shippingCity,
      shippingState,
      shippingZipCode,
      shippingStreet,
      useCustomerAddress,
      // New driver assignment fields
      assignedDriverId,
      assignedDriverName,
      id,
    } = createSaleDto;

    // 1. Validate store and client
    await this.validationService.validateStoreAndClient(storeId, clientId);

    // 2. Validate all sale items (including minimum quantity validation)
    await this.validationService.validateSaleItems(
      saleItems,
      storeId,
      clientId,
    );

    // 3. Get products for pricing calculations
    const products = await this.pricingService.getProductsForSale(
      saleItems,
      storeId,
      clientId,
    );

    // 4. Calculate pricing and profit
    const { subtotal, totalProfit, saleItemsWithPricing } =
      await this.pricingService.calculateTotalSaleAmount(saleItems, products);

    // 5. Determine sale status based on source
    const confirmation = source === 'website' ? 'NOT_CONFIRMED' : 'CONFIRMED';
    const status = source === 'website' ? 'PENDING' : 'CONFIRMED';

    // 6. Calculate final amounts
    const finalTotalAmount = this.pricingService.calculateFinalAmount(
      subtotal,
      tax,
      discount,
    );

    const prisma = await this.tenantContext.getPrismaClient();

    const executeTransaction = async (transactionClient: any) => {
      // 7. Find or create customer within transaction (only if phone number is provided)
      let customer: any = null;
      if (customerPhoneNumber) {
        customer = await this.balanceService.findOrCreateCustomer(
          customerPhoneNumber,
          {
            customerName,
            customerMail,
            customerAddress,
            storeId,
            clientId,
            customerCity,
            customerState,
            customerCountry,
            customerStreet,
            customerZipCode,
          },
          transactionClient,
        );
      }

      // 7.1. Handle shipping address logic
      let finalShippingAddress: string | null = null;
      let finalShippingCountry: string | null = null;
      let finalShippingCity: string | null = null;
      let finalShippingZipCode: string | null = null;
      let finalShippingStreet: string | null = null;
      let finalShippingState: string | null = null;

      if (useCustomerAddress && customer) {
        // Use customer's address as shipping address (only if customer exists)
        finalShippingAddress = customer.customerStreetAddress || null;
        finalShippingCountry = customer.country || null;
        finalShippingCity = customer.city || null;
        finalShippingZipCode = customer.zipCode || null;
        finalShippingStreet = customer.customerStreetAddress || null;
        finalShippingState = customer.state || null;
      } else {
        // Use provided shipping address
        finalShippingAddress = shippingAddress || null;
        finalShippingCountry = shippingCountry || null;
        finalShippingCity = shippingCity || null;
        finalShippingZipCode = shippingZipCode || null;
        finalShippingStreet = shippingStreet || null;
        finalShippingState = shippingState || null;
      }
      // 8. Create the sale
      const sale = await transactionClient.sales.create({
        data: {
          customerId: customer?.id || null,
          userId,
          storeId,
          clientId,
          paymentMethod,
          totalAmount: finalTotalAmount,
          profitAmount: totalProfit, // Re-enabled after DB migration
          confirmation,
          quantitySend: saleItems.reduce((sum, item) => sum + item.quantity, 0),
          allowance: discount,
          source,
          tax,
          status,
          generateInvoice,
          cashierName,
          // Shipping address fields
          shippingAddress: finalShippingAddress,
          shippingCountry: finalShippingCountry,
          shippingCity: finalShippingCity,
          shippingState: finalShippingState,
          shippingZipCode: finalShippingZipCode,
          shippingStreet: finalShippingStreet,
          // Driver assignment fields
          assignedDriverId,
          assignedDriverName,
          fileUploadSalesId: salesFileId !== '' ? salesFileId : null,
        },
      });

      // 9. Create sale items
      for (const saleItemData of saleItemsWithPricing) {
        await transactionClient.saleItem.create({
          data: {
            saleId: sale.id,
            productId: saleItemData.productId,
            pluUpc: saleItemData.pluUpc,
            productName: saleItemData.productName,
            allowance: saleItemData.allowance,
            quantity: saleItemData.quantity,
            sellingPrice: saleItemData.sellingPrice,
            totalPrice: saleItemData.totalPrice,
            packType: saleItemData.packType,
            packId: saleItemData.packId,
          },
        });
      }

      // 10. Update inventory
      await this.inventoryService.updateInventoryForSale(
        saleItems,
        'DECREMENT',
        storeId,
        clientId,
      );

      // 11. Create balance sheet entry (only if customer exists)
      if (customer) {
        await this.balanceService.createBalanceSheetEntry(
          {
            customerId: customer.id,
            saleId: sale.id,
            remainingAmount: finalTotalAmount,
            description: `Sale #${sale.id}`,
          },
          transactionClient,
        );
      }

      // 11.1. Create OrderProcessing record if driver is assigned
      if (assignedDriverId && assignedDriverName) {
        await transactionClient.orderProcessing.create({
          data: {
            saleId: sale.id,
            customerId: customer?.id || null,
            customerName: customer?.customerName || null,
            storeId,
            clientId,
            driverId: assignedDriverId,
            driverName: assignedDriverName,
            paymentAmount: finalTotalAmount,
            paymentType: paymentMethod,
            status: 'SHIPPED' as any, // Order is ready for delivery
          },
        });

        // Update sale status to SHIPPED if driver assigned
        await transactionClient.sales.update({
          where: { id: sale.id },
          data: { status: 'SHIPPED' as any },
        });
      }

      const saleDraftId = draftId ?? id ?? '';

      if (typeof saleDraftId === 'string' && saleDraftId.trim() !== '') {
        await this.saleDraftService.deleteDraftSale(
          saleDraftId,
          storeId,
          transactionClient,
        );
      }

      // 12. Generate invoice if requested
      // TODO: Integrate with invoice service when available

      // 13. Log sale creation in history
      try {
        await this.saleHistoryService.logSaleCreated(
          sale.id,
          userId,
          storeId,
          {
            totalAmount: finalTotalAmount,
            paymentMethod,
            customerName: customer?.customerName || 'Walk-in Customer',
            itemCount: saleItems.length,
            status,
            source,
          },
          null, // oldData - null for new sale creation
          {
            saleItemsCount: saleItems.length,
            totalQuantity: saleItems.reduce(
              (sum, item) => sum + item.quantity,
              0,
            ),
            profitAmount: totalProfit,
          },
          transactionClient,
        );
      } catch (historyError) {
        // Don't fail the sale if history logging fails
        console.error('Failed to log sale creation history:', historyError);
      }

      return {
        sale,
        customer: customer
          ? {
              id: customer.id,
              customerName: customer.customerName,
              phoneNumber: customer.phoneNumber,
            }
          : null,
        saleItems: saleItemsWithPricing,
        totalAmount: finalTotalAmount,
        profitAmount: totalProfit,
        status,
        confirmation,
      };
    };

    // If a transaction is provided, use it; otherwise create a new one
    if (tx) {
      return await executeTransaction(tx);
    } else {
      return await prisma.$transaction(executeTransaction);
    }
  }

  async getAllSales(queryDto: QuerySalesDto) {
    const {
      storeId,
      page = 1,
      limit = 20,
      status,
      q,
      paymentMethod,
      dateFrom,
      dateTo,
    } = queryDto;

    const skip = (page - 1) * limit;

    const where: any = {
      AND: [],
    };

    // console.log(q, dateFrom, dateTo);

    // General filters
    if (storeId) where.AND.push({ storeId });
    if (status) where.AND.push({ status });
    if (paymentMethod) where.AND.push({ paymentMethod });

    if (dateFrom || dateTo) {
      const dateFilter: any = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.AND.push({ createdAt: dateFilter });
    }

    // Search query filters (if q is present)
    if (q && q.trim()) {
      const searchQuery = q.trim();

      where.AND.push({
        OR: [
          {
            customer: {
              customerName: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            },
          },
          {
            customer: {
              id: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            },
          },
          {
            saleItems: {
              some: {
                productName: {
                  contains: searchQuery,
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      });
    }

    const prisma = await this.tenantContext.getPrismaClient();

    const [sales, totalCount] = await Promise.all([
      prisma.sales.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              customerName: true,
              phoneNumber: true,
            },
          },
          invoices: true,
          saleItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  productSuppliers: {
                    include: {
                      supplier: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.sales.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // Add hasInvoice field to each sale
    const salesWithInvoiceFlag = sales.map((sale) => ({
      ...sale,
      hasInvoice: Array.isArray(sale.invoices) && sale.invoices.length > 0,
    }));
    // console.log('salesWithInvoiceFlag', salesWithInvoiceFlag[0]);

    return {
      sales: sales.map((sale) => this.formatSaleResponse(sale)),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    };
  }

  async getSaleById(saleId: string, storeId: string) {
    const prisma = await this.tenantContext.getPrismaClient();

    const sale = await prisma.sales.findFirst({
      where: {
        id: saleId,
        storeId,
      },
      include: {
        customer: true,
        saleItems: {
          include: {
            product: true,
            // select: {
            //   id: true,
            //   name: true,
            //   // productSuppliers: {
            //   //   include: {
            //   //     supplier: {
            //   //       select: {
            //   //         id: true,
            //   //         name: true,
            //   //       },
            //   //     },
            //   //   },
            //   // },
            // },
          },
        },
        invoices: true,
        returns: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!sale) {
      throw new BadRequestException('Sale not found in this store');
    }

    console.log('Sale retrieved:', this.formatSaleResponse(sale));

    return this.formatSaleResponse(sale);
  }

  async updateSale(
    saleId: string,
    updateSaleDto: UpdateSaleDto,
    storeId: string,
  ) {
    // Validate sale exists
    const existingSale = await this.validationService.validateSaleExists(
      saleId,
      storeId,
    );

    const {
      paymentMethod,
      totalAmount,
      tax,
      allowance,
      saleItems,
      status,
      cashierName,
    } = updateSaleDto;

    const prisma = await this.tenantContext.getPrismaClient();

    return await prisma.$transaction(async (tx) => {
      // If sale items are being updated, handle inventory changes
      if (saleItems) {
        // First restore inventory for old items
        const oldSaleItems = await tx.saleItem.findMany({
          where: { saleId },
        });

        const oldSaleItemsForInventory = oldSaleItems.map((item) => ({
          productId: item.productId!,
          pluUpc: item.pluUpc,
          quantity: item.quantity,
          packType: item.packType,
          packId: item.packId === null ? undefined : item.packId,
        }));

        await this.inventoryService.updateInventoryForSale(
          oldSaleItemsForInventory,
          'INCREMENT',
          storeId,
          existingSale.clientId,
        );

        // Delete old sale items
        await tx.saleItem.deleteMany({
          where: { saleId },
        });

        // Validate and create new sale items
        await this.validationService.validateSaleItems(
          saleItems,
          storeId,
          existingSale.clientId,
        );

        const products = await this.pricingService.getProductsForSale(
          saleItems,
          storeId,
          existingSale.clientId,
        );
        const { saleItemsWithPricing } =
          await this.pricingService.calculateTotalSaleAmount(
            saleItems,
            products,
          );

        // Create new sale items
        for (const saleItemData of saleItemsWithPricing) {
          await tx.saleItem.create({
            data: {
              saleId,
              clientId: existingSale.clientId,
              productId: saleItemData.productId,
              pluUpc: saleItemData.pluUpc,
              productName: saleItemData.productName,
              quantity: saleItemData.quantity,
              sellingPrice: saleItemData.sellingPrice,
              totalPrice: saleItemData.totalPrice,
              packType: saleItemData.packType,
              packId: saleItemData.packId,
            },
          });
        }

        // Update inventory for new items
        await this.inventoryService.updateInventoryForSale(
          saleItems,
          'DECREMENT',
          storeId,
          existingSale.clientId,
        );
      }

      // Update sale record
      const updatedSale = await tx.sales.update({
        where: { id: saleId },
        data: {
          ...(paymentMethod && { paymentMethod }),
          ...(totalAmount !== undefined && { totalAmount }),
          ...(tax !== undefined && { tax }),
          ...(allowance !== undefined && { allowance }),
          ...(status && { status }),
          ...(cashierName && { cashierName }),
        },
        include: {
          customer: true,
          saleItems: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Update balance sheet if total amount changed
      if (totalAmount !== undefined) {
        await tx.balanceSheet.updateMany({
          where: { saleId },
          data: { remainingAmount: totalAmount },
        });
      }

      // Log sale update in history
      try {
        await this.saleHistoryService.logSaleUpdated(
          saleId,
          updatedSale.userId,
          storeId,
          existingSale,
          updateSaleDto,
          {
            updatedFields: Object.keys(updateSaleDto),
            itemsUpdated: !!saleItems,
          },
          tx,
        );

        // Log status change if status was updated
        if (status && existingSale.status !== status) {
          await this.saleHistoryService.logStatusChanged(
            saleId,
            updatedSale.userId,
            storeId,
            existingSale.status,
            status,
            undefined,
            tx,
          );
        }
      } catch (historyError) {
        // Don't fail the update if history logging fails
        console.error('Failed to log sale update history:', historyError);
      }

      return this.formatSaleResponse(updatedSale);
    });
  }

  async deleteSale(saleId: string, storeId: string) {
    const sale = await this.validationService.validateSaleExists(
      saleId,
      storeId,
    );

    const prisma = await this.tenantContext.getPrismaClient();

    return await prisma.$transaction(async (tx) => {
      // Get sale items for inventory restoration
      const saleItems = await tx.saleItem.findMany({
        where: { saleId },
      });

      const saleItemsForInventory = saleItems.map((item) => ({
        productId: item.productId!,
        pluUpc: item.pluUpc,
        quantity: item.quantity,
        packType: item.packType,
        packId: item.packId === null ? undefined : item.packId,
      }));

      // Restore inventory
      await this.inventoryService.updateInventoryForSale(
        saleItemsForInventory,
        'INCREMENT',
        storeId,
        sale.clientId,
      );

      // Delete related records
      await tx.saleItem.deleteMany({ where: { saleId } });
      await tx.saleReturn.deleteMany({ where: { saleId } });
      await tx.invoice.deleteMany({ where: { saleId } });
      await this.balanceService.deleteBalanceEntriesForSale(saleId);

      // Delete the sale
      await tx.sales.delete({ where: { id: saleId } });

      return { message: 'Sale deleted successfully and inventory restored' };
    });
  }

  async deleteAllSales(storeId: string, clientId: string) {
    const prisma = await this.tenantContext.getPrismaClient();

    const salesCount = await prisma.sales.count({
      where: { storeId },
    });

    if (salesCount === 0) {
      throw new BadRequestException('No sales found for this store');
    }

    return await prisma.$transaction(async (tx) => {
      // Get all sale items for inventory restoration
      const allSaleItems = await tx.saleItem.findMany({
        where: {
          sale: { storeId },
        },
      });

      const allSaleItemsForInventory = allSaleItems.map((item) => ({
        productId: item.productId!,
        pluUpc: item.pluUpc,
        quantity: item.quantity,
        packType: item.packType,
        packId: item.packId === null ? undefined : item.packId,
      }));

      // Restore inventory
      await this.inventoryService.updateInventoryForSale(
        allSaleItemsForInventory,
        'INCREMENT',
        storeId,
        clientId,
      );

      // Delete all related records in batches
      await tx.saleItem.deleteMany({
        where: { sale: { storeId } },
      });

      await tx.saleReturn.deleteMany({
        where: { sale: { storeId } },
      });

      await tx.invoice.deleteMany({
        where: { sale: { storeId } },
      });

      await tx.balanceSheet.deleteMany({
        where: { sale: { storeId } },
      });

      // Delete sales in batches of 500
      let deletedCount = 0;
      while (true) {
        const batch = await tx.sales.findMany({
          where: { storeId },
          take: 500,
          select: { id: true },
        });

        if (batch.length === 0) break;

        await tx.sales.deleteMany({
          where: {
            id: { in: batch.map((s) => s.id) },
          },
        });

        deletedCount += batch.length;
      }

      return {
        message: `All sales deleted successfully. ${deletedCount} sales deleted and inventory restored`,
        deletedCount,
        inventoryItemsRestored: allSaleItemsForInventory.length,
      };
    });
  }

  private formatSaleResponse(sale: any) {
    return {
      id: sale.id,
      customer: sale.customer,
      shippingAddress: sale.shippingAddress,
      shippingCity: sale.shippingCity,
      shippingCountry: sale.shippingCountry,
      shippingState: sale.shippingState,
      shippingStreet: sale.shippingStreet,
      shippingZipCode: sale.shippingZipCode,
      totalAmount: sale.totalAmount,
      saleNo: sale.saleNo,
      profitAmount: sale.profitAmount,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      confirmation: sale.confirmation,
      source: sale.source,
      tax: sale.tax,
      allowance: sale.allowance,
      generateInvoice: sale.generateInvoice,
      cashierName: sale.cashierName,
      assignedDriverId: sale.assignedDriverId,
      assignedDriverName: sale.assignedDriverName,
      driverType: sale.driverType,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
      saleItems: sale.saleItems?.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        pluUpc: item.pluUpc,
        productName: item.productName,
        description: item.product.description,
        quantity: item.quantity,
        allowance: item.allowance,
        sellingPrice: item.sellingPrice,
        totalPrice: item.totalPrice,
        packType: item.packType,
        packId: item.packId,
        supplier: item.product?.productSuppliers?.find((ps: any) => ps.supplier)
          ?.supplier,
      })),
      user: sale.user,
      invoices: sale.invoices,
      returns: sale.returns,
      hasInvoice: Array.isArray(sale.invoices) && sale.invoices.length > 0,
    };
  }

  /**
   * Bulk assign multiple sales to a driver
   */
  async bulkAssignDriver(
    bulkAssignDto: BulkAssignDriverDto,
    userId: string,
    storeId: string,
  ) {
    const { saleIds, driverId, driverName, driverType } = bulkAssignDto;

    const prisma = await this.tenantContext.getPrismaClient();

    return await prisma.$transaction(async (tx) => {
      // 1. Validate that all sales exist and belong to the store
      const sales = await tx.sales.findMany({
        where: {
          id: { in: saleIds },
          storeId,
        },
        include: {
          customer: true,
        },
      });

      if (sales.length !== saleIds.length) {
        throw new BadRequestException(
          'Some sales not found or do not belong to this store',
        );
      }

      // 2. Check if any sales are already assigned or in invalid status
      const invalidSales = sales.filter(
        (sale) =>
          sale.assignedDriverId ||
          !['PENDING', 'CONFIRMED', 'PICKED', 'PACKED'].includes(sale.status),
      );

      if (invalidSales.length > 0) {
        throw new BadRequestException(
          `Sales ${invalidSales.map((s) => s.id).join(', ')} are already assigned or in invalid status for assignment`,
        );
      }

      // 3. Validate driverType
      if (![DriverType.COMPANY, DriverType.THIRD_PARTY].includes(driverType)) {
        throw new BadRequestException('Invalid driver type');
      }

      const isCompanyDriver = driverType === DriverType.COMPANY;

      console.log('isCompanyDriver', isCompanyDriver);

      // 4. Update sales with driver assignment
      await tx.sales.updateMany({
        where: { id: { in: saleIds } },
        data: {
          assignedDriverId: isCompanyDriver ? driverId : null,
          assignedDriverName: isCompanyDriver ? driverName : null,
          driverType,
        },
      });

      // 5. Create OrderProcessing records
      const orderProcessingData = sales.map((sale) => ({
        saleId: sale.id,
        customerId: sale.customerId ? sale.customerId : '',
        customerName: sale.customer?.customerName || '',
        storeId: sale.storeId,
        clientId: sale.clientId,
        driverId: isCompanyDriver ? driverId : null,
        driverName: isCompanyDriver ? driverName : 'THIRD_PARTY_DRIVER',
        driverType,
        paymentAmount: sale.totalAmount,
        paymentType: sale.paymentMethod as PaymentMethod,
        status: OrderProcessingStatus.PICKED,
      }));

      await tx.orderProcessing.createMany({ data: orderProcessingData });

      // 6. Log history
      try {
        for (const sale of sales) {
          await this.saleHistoryService.logStatusChanged(
            sale.id,
            userId,
            storeId,
            sale.status,
            sale.status,
            {
              bulkAssignment: true,
              driverId: isCompanyDriver ? driverId : '',
              driverName: isCompanyDriver ? driverName : 'THIRD_PARTY_DRIVER',
              assignedWithOtherSales: saleIds.filter((id) => id !== sale.id),
            },
            tx,
          );
        }
      } catch (historyError) {
        console.error('Failed to log bulk assignment history:', historyError);
      }

      // 7. Return summary
      return {
        assignedSales: sales.length,
        driverAssigned: isCompanyDriver ? driverName : 'THIRD_PARTY_DRIVER',
        saleIds,
        newStatus: OrderProcessingStatus.PICKED,
        message: `Successfully assigned ${sales.length} sales to ${
          isCompanyDriver ? `driver ${driverName}` : 'a third-party driver'
        }`,
      };
    });
  }

  async checkSalesFileHash(fileHash: string, storeId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    console.log(storeId);
    return await prisma.fileUploadSales.findUnique({
      where: {
        fileHash,
        storeId,
      },
    });
  }

  async checkSalesFileStatus(
    file: Express.Multer.File,
    user: any,
    storeId: string,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }
    const dataToHash = Buffer.concat([file.buffer, Buffer.from(user.id)]);
    const fileHash = crypto
      .createHash('sha256')
      .update(dataToHash)
      .digest('hex');
    const existingFile = await this.checkSalesFileHash(fileHash, storeId);
    if (existingFile) {
      throw new ConflictException('This file has already been uploaded');
    }
    return fileHash;
  }

  async uploadSalesSheet(
    user: any,
    parsedData: ParsedResult,
    file: Express.Multer.File,
    fileHash: string,
    storeId: string,
  ) {
    const prisma = await this.tenantContext.getPrismaClient();

    // Validate that the store exists
    const store = await prisma.stores.findFirst({
      where: { id: storeId },
    });
    if (!store) {
      throw new NotFoundException('Store not found for this user');
    }

    // Validate that the client exists
    const client = await prisma.clients.findUnique({
      where: { id: user.clientId },
    });
    if (!client) {
      throw new BadRequestException(
        'Invalid client - user client does not exist',
      );
    }

    // Validate that the store belongs to the user's client
    if (store.clientId !== user.clientId) {
      throw new BadRequestException('Store does not belong to your client');
    }

    // Start a transaction to ensure atomicity
    await prisma.$transaction(
      async (prisma) => {
        // Create FileUploadSales record
        const fileUpload = await prisma.fileUploadSales.create({
          data: {
            fileHash,
            storeId: store.id,
            clientId: user.clientId,
            fileName: file.originalname,
          },
        });

        // Process each sale from the parsed data
        for (const saleData of parsedData.sales) {
          // Transform ParsedSale to CreateSaleDto format
          const createSaleDto = {
            ...saleData,
            paymentMethod: saleData.paymentMethod as PaymentMethod,
            saleItems: saleData.saleItems.map((item) => ({
              productId: item.productId || '', // Handle optional productId
              pluUpc: item.pluUpc,
              quantity: item.quantity,
              allowance: item.allowance || 0,
              packType: item.packType as any,
              packId: item.packId,
              packOf: item.packOf,
            })),
          } as CreateSaleDto;

          await this.createSale(
            createSaleDto,
            user.id,
            '',
            fileUpload.id,
            prisma,
          );
        }
      },
      {
        timeout: 120000, // 120 seconds = 2 mins
      },
    );

    return { success: true, message: 'Sales processed successfully' };
  }

  async addSales(user: any, file: Express.Multer.File, storeId: string) {
    // console.log('user', user, 'file', file);
    const fileHash = await this.checkSalesFileStatus(file, user, storeId);
    const parsedData = parseExcelOrHTML(file, storeId, user.clientId);
    console.log('parsedData', parsedData);
    return await this.uploadSalesSheet(
      user,
      parsedData,
      file,
      fileHash,
      storeId,
    );
  }
}
