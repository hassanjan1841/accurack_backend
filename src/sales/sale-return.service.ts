import { Injectable, BadRequestException } from '@nestjs/common';
import { TenantContextService } from '../tenant/tenant-context.service';
import {
  CreateSaleReturnDto,
  QueryReturnSalesDto,
} from './dto/create-sale-return.dto';
import { SaleInventoryService } from './sale-inventory.service';
import { CustomerBalanceService } from './customer-balance.service';
import { SaleHistoryService } from './sale-history.service';

@Injectable()
export class SaleReturnService {
  constructor(
    private tenantContext: TenantContextService,
    private inventoryService: SaleInventoryService,
    private balanceService: CustomerBalanceService,
    private saleHistoryService: SaleHistoryService,
  ) {}

  async createSaleReturn(returnDto: CreateSaleReturnDto, userId: string) {
    const { saleId, storeId, returnItems } = returnDto;

    // Validate sale exists and belongs to store
    const sale = await this.validateSaleForReturn(saleId, storeId);

    // Validate return items against original sale
    let maxRefundForItem = await this.validateReturnItems(returnItems, sale);

    const prisma = await this.tenantContext.getPrismaClient();

    // Process the return in a transaction
    return await prisma.$transaction(async (tx) => {
      const returnRecords: any[] = [];
      let totalRefundAmount = 0;

      // Create return records
      for (const returnItem of returnItems) {
        const returnRecord = await tx.saleReturn.create({
          data: {
            saleId,
            productId: returnItem.productId,
            pluUpc: returnItem.pluUpc || '',
            quantity: returnItem.quantity,
            returnCategory: returnItem.returnCategory,
            reason: returnItem.reason,
            processedBy: userId,
            refundAmount: maxRefundForItem,
            isProductReturned: returnItem.isProductReturned,
          },
        });

        returnRecords.push(returnRecord);
        totalRefundAmount += returnItem.refundAmount;
      }

      // Restore inventory based on return categories
      await this.inventoryService.restoreInventoryForReturn(returnItems);

      // Update customer balance with refund
      if (totalRefundAmount > 0) {
        await this.balanceService.updateBalanceForRefund(
          (sale.customerId ?? ''),
          totalRefundAmount,
          saleId,
        );
      }

      // Update sale status
      await this.updateSaleReturnStatus(tx, saleId, returnItems, sale);

      await tx.sales.update({
        where: { id: sale.id },
        data: {
          profitAmount: { decrement: totalRefundAmount },
        },
      });

      // Log return in history
      try {
        const isPartialReturn = returnItems.length < sale.saleItems.length;
        await this.saleHistoryService.logSaleReturned(
          saleId,
          userId,
          sale.storeId,
          {
            refundAmount: totalRefundAmount,
            returnedItems: returnItems.length,
            totalItems: sale.saleItems.length,
            returnCategories: returnItems.map((item) => item.returnCategory),
          },
          isPartialReturn,
          {
            originalSaleAmount: sale.totalAmount,
            returnDate: new Date().toISOString(),
          },
          tx,
        );
      } catch (historyError) {
        // Don't fail the return if history logging fails
        console.error('Failed to log sale return history:', historyError);
      }

      return {
        saleId,
        returnRecords,
        totalRefundAmount,
        message: `Return processed successfully. ${returnRecords.length} items returned, total refund: $${totalRefundAmount}`,
      };
    });
  }

  private async validateSaleForReturn(saleId: string, storeId: string) {
    const prisma = await this.tenantContext.getPrismaClient();

    const sale = await prisma.sales.findFirst({
      where: {
        id: saleId,
        storeId,
      },
      include: {
        saleItems: true,
        returns: true,
      },
    });

    if (!sale) {
      throw new BadRequestException('Sale not found in this store');
    }

    if (sale.status === 'CANCELLED') {
      throw new BadRequestException(
        'Cannot return items from a cancelled sale',
      );
    }

    return sale;
  }

  private async validateReturnItems(returnItems: any[], sale: any) {
    let maxRefundForItem: number = 0;

    for (const returnItem of returnItems) {
      sale.saleItems.map((s, _) => console.log(s));
      // Find original sale item
      const originalSaleItem = sale.saleItems.find(
        (si: any) =>
          si.productId === returnItem.productId &&
          si.pluUpc === returnItem.pluUpc &&
          si.packType === returnItem.packType,
      );

      if (!originalSaleItem) {
        throw new BadRequestException(
          `Item with product ID ${returnItem.productId} and PLU ${returnItem.pluUpc} was not found in the original sale`,
        );
      }

      // Calculate already returned quantity
      const alreadyReturned = sale.returns
        .filter(
          (r: any) =>
            r.productId === returnItem.productId &&
            r.pluUpc === returnItem.pluUpc,
        )
        .reduce((sum: number, r: any) => sum + r.quantity, 0);

      const totalReturnQuantity = alreadyReturned + returnItem.quantity;

      // if (returnItem.refundAmountType === 'Amount' || 'amount' || 'AMOUNT' || 'FIXED_AMOUNT') {
      if (totalReturnQuantity > originalSaleItem.quantity) {
        throw new BadRequestException(
          `Cannot return ${returnItem.quantity} items. Original quantity: ${originalSaleItem.quantity}, already returned: ${alreadyReturned}, requested return: ${returnItem.quantity}`,
        );
      }
      // }

      // if(returnItem.refundAmountType === 'Percentage' || 'percentage' || 'PERCENTAGE'){
      //   const percentAmount =
      // }

      // Validate refund amount doesn't exceed original item total
      // Calculate max refund based on refund amount type

      console.log(returnItem.refundAmountType);

      if (
        returnItem.refundAmountType === 'Amount' ||
        returnItem.refundAmountType === 'amount' ||
        returnItem.refundAmountType === 'AMOUNT' ||
        returnItem.refundAmountType === 'FIXED_AMOUNT'
      ) {
        // For fixed amount, max refund is the proportional price for returned quantity
        maxRefundForItem +=
          (originalSaleItem.totalPrice >= returnItem.refundAmount &&
            returnItem.refundAmount) * returnItem.quantity;
      }

      if (
        returnItem.refundAmountType === 'Percentage' ||
        returnItem.refundAmountType === 'percentage' ||
        returnItem.refundAmountType === 'PERCENTAGE'
      ) {
        // For percentage, calculate percentage of the proportional price
        // const proportionalPrice = (originalSaleItem.totalPrice / originalSaleItem.quantity) * returnItem.quantity;
        const percentageValue = returnItem.refundPercentage || 100; // Default to 100% if not specified
        // If originalSaleItem.totalPrice is per unit:
        const pricePerUnit = originalSaleItem.totalPrice / returnItem.quantity;
        const adjustedRefundRate = returnItem.refundAmount / percentageValue;
        maxRefundForItem +=
          adjustedRefundRate * pricePerUnit * returnItem.quantity;
      }

      // if (returnItem.refundAmount > maxRefundForItem) {
      //   throw new BadRequestException(
      //     `Refund amount ${returnItem.refundAmount} exceeds maximum refundable amount ${maxRefundForItem.toFixed(2)} for this item`,
      //   );
      // }
    }

    return maxRefundForItem;
  }

  private async updateSaleReturnStatus(
    tx: any,
    saleId: string,
    returnItems: any[],
    sale: any,
  ) {
    // Calculate if all items are returned
    const totalOriginalQuantity = sale.saleItems.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0,
    );

    const totalReturnedQuantity = returnItems.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0,
    );

    const previouslyReturnedQuantity = sale.returns.reduce(
      (sum: number, r: any) => sum + r.quantity,
      0,
    );

    const totalReturnedSoFar =
      totalReturnedQuantity + previouslyReturnedQuantity;

    let newStatus = sale.status;

    if (totalReturnedSoFar >= totalOriginalQuantity) {
      newStatus = 'REFUNDED'; // All items returned
    } else if (totalReturnedSoFar > 0) {
      newStatus = 'PARTIALLY_RETURNED'; // Some items returned
    }

    await tx.sales.update({
      where: { id: saleId },
      data: { status: newStatus },
    });
  }

  async getReturnSales(queryDto: QueryReturnSalesDto) {
    const { storeId, page = 1, limit = 20, returnCategory } = queryDto;

    const skip = (page - 1) * limit;

    const where: any = {
      AND: [{ sale: { storeId } }],
    };

    if (returnCategory) {
      where.AND.push({ returnCategory });
    }

    const prisma = await this.tenantContext.getPrismaClient();

    const [returns, totalCount] = await Promise.all([
      prisma.saleReturn.findMany({
        where,
        include: {
          sale: {
            include: {
              customer: {
                select: {
                  id: true,
                  customerName: true,
                  phoneNumber: true,
                },
              },
            },
          },
          product: {
            select: {
              id: true,
              name: true,
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
          processedByUser: {
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
      prisma.saleReturn.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      returns: returns.map((returnItem) => ({
        id: returnItem.id,
        saleReturnNo: returnItem.saleReturnNo,
        saleId: returnItem.saleId,
        saleNo: returnItem.sale?.saleNo,
        customer: returnItem.sale.customer,
        product: {
          id: returnItem.product?.id,
          name: returnItem.product?.name,
          pluUpc: returnItem.pluUpc,
        },
        quantity: returnItem.quantity,
        returnCategory: returnItem.returnCategory,
        reason: returnItem.reason,
        refundAmount: returnItem.refundAmount,
        isProductReturned: returnItem.isProductReturned,
        processedBy: returnItem.processedByUser,
        createdAt: returnItem.createdAt,
        supplier: returnItem.product?.productSuppliers.find((ps) => ps.supplier)
          ?.supplier,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    };
  }
}
