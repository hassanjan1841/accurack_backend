import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TenantContextService } from '../tenant/tenant-context.service';
import { SaleHistoryService } from './sale-history.service';
import { ChangeSaleStatusDto } from './dto/change-sale-status.dto';
import { DriverType, SaleStatus, TransactionType } from '@prisma/client';

@Injectable()
export class StatusManagementService {
  constructor(
    private tenantContext: TenantContextService,
    private saleHistoryService: SaleHistoryService,
  ) {}

  // Define valid status transitions
  private readonly statusTransitions: Record<SaleStatus, SaleStatus[]> = {
    [SaleStatus.PENDING]: [SaleStatus.CONFIRMED, SaleStatus.CANCELLED],
    [SaleStatus.CONFIRMED]: [SaleStatus.PICKED, SaleStatus.CANCELLED],
    [SaleStatus.PICKED]: [SaleStatus.PACKED, SaleStatus.CANCELLED],
    [SaleStatus.PACKED]: [SaleStatus.SHIPPED, SaleStatus.CANCELLED],
    [SaleStatus.SHIPPED]: [SaleStatus.DELIVERED, SaleStatus.CANCELLED],
    [SaleStatus.DELIVERED]: [SaleStatus.COMPLETED], // Can be marked as completed after delivery
    [SaleStatus.COMPLETED]: [], // Final status, no transitions allowed
    [SaleStatus.CANCELLED]: [], // Final status, no transitions allowed
    [SaleStatus.REFUNDED]: [], // Final status, no transitions allowed
    [SaleStatus.PARTIALLY_RETURNED]: [
      SaleStatus.COMPLETED,
      SaleStatus.REFUNDED,
      SaleStatus.CANCELLED,
    ],
    [SaleStatus.PENDING_VALIDATION]: [
      SaleStatus.VALIDATED,
      SaleStatus.CANCELLED,
    ],
    [SaleStatus.VALIDATED]: [SaleStatus.CONFIRMED, SaleStatus.CANCELLED],
    [SaleStatus.SENT_FOR_VALIDATION]: [
      SaleStatus.PENDING_VALIDATION,
      SaleStatus.CANCELLED,
    ],
  };

  /**
   * Change sale status with validation and order flow
   */
  async changeSaleStatus(
    saleId: string,
    statusDto: ChangeSaleStatusDto,
    userId: string,
    storeId: string,
  ) {
    const { status, notes, driverId, driverName, metadata, driverType } =
      statusDto;

    // Validate sale exists
    const sale = await this.validateSaleExists(saleId, storeId);

    // Validate status transition
    this.validateStatusTransition(sale.status, status);

    let isCompanyDriver = false;

    if (driverType) {
      isCompanyDriver = driverType === DriverType.COMPANY;
    }

    // Special handling for SHIPPED status
    if (status === SaleStatus.SHIPPED) {
      if (!driverType) {
        throw new BadRequestException('Driver type is required for SHIPPED status');
      }
      await this.handleShippedStatus(
        sale,
        storeId,
        driverType,
        driverId,
        driverName,
        userId,
      );
    }

    // Special handling for DELIVERED status
    if (status === ('DELIVERED' as any)) {
      await this.handleDeliveredStatus(sale, userId, storeId);
    }

    const prisma = await this.tenantContext.getPrismaClient();

    return await prisma.$transaction(async (tx) => {
      // Update sale status
      const updatedSale = await tx.sales.update({
        where: { id: saleId },
        data: { status },
        include: {
          customer: true,
          saleItems: {
            include: {
              product: true,
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
      });

      // Log status change in history
      try {
        await this.saleHistoryService.logStatusChanged(
          saleId,
          userId,
          storeId,
          sale.status,
          status,
          {
            reason: notes,
            driverId: isCompanyDriver ? driverId : '',
            driverName: isCompanyDriver ? driverName : 'THIRD_PARTY_DRIVER',
            ...metadata,
            timestamp: new Date().toISOString(),
          },
          tx,
        );
      } catch (historyError) {
        console.error('Failed to log status change history:', historyError);
      }

      return {
        sale: updatedSale,
        previousStatus: sale.status,
        newStatus: status,
        notes,
        timestamp: new Date(),
        message: `Sale status successfully changed from ${sale.status} to ${status}`,
      };
    });
  }

  /**
   * Validate status transition rules
   */
  private validateStatusTransition(
    currentStatus: SaleStatus,
    newStatus: SaleStatus,
  ) {
    const allowedTransitions = this.statusTransitions[currentStatus];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`,
      );
    }
  }

  /**
   * Handle SHIPPED status - create OrderProcessing record if not exists
   */
  private async handleShippedStatus(
    sale: any,
    storeId: string,
    driverType: DriverType,
    driverId?: string,
    driverName?: string,
    userId?: string,
  ) {

    const isCompanyDriver = driverType === DriverType.COMPANY;

    const prisma = await this.tenantContext.getPrismaClient();

    // Check if OrderProcessing record already exists for this sale
    const existingOrder = await prisma.orderProcessing.findFirst({
      where: {
        OR: [
          { saleId: sale.id },
          {
            customerId: sale.customerId,
            storeId: storeId,
            paymentAmount: sale.totalAmount,
            // Additional check to ensure it's the same order
            customerName: sale.customer?.customerName || 'Unknown Customer',
          },
        ],
      },
    });

    let orderProcessingCreated = false;

    // Only create OrderProcessing record if it doesn't exist
    if (!existingOrder) {
      await prisma.orderProcessing.create({
        data: {
          saleId: sale.id, // Add saleId to link it properly
          customerId: sale.customerId,
          customerName: sale.customer?.customerName || 'Unknown Customer',
          storeId: sale.storeId,
          clientId: sale.clientId,
          driverId: isCompanyDriver ? driverId : null,
          driverName: isCompanyDriver ? driverName : 'THIRD_PARTY_DRIVER',
          driverType,
          paymentAmount: sale.totalAmount,
          paymentType: sale.paymentMethod,
          status: 'SHIPPED' as any, // Will be updated when enum is available
        },
      });
      orderProcessingCreated = true;
    }

    // Update balance sheet to mark as shipped
    await this.updateBalanceSheetForShipping(sale);

    // Log order processing creation or existing record found
    try {
      await this.saleHistoryService.createHistory({
        saleId: sale.id,
        userId: userId || sale.userId,
        storeId: sale.storeId,
        action: 'ORDER_PROCESSED' as any,
        description: orderProcessingCreated
          ? `Order shipped and assigned to driver ${driverName}`
          : `Order status updated to shipped - OrderProcessing record already exists`,
        newData: {
          driverId: isCompanyDriver ? driverId : '',
          driverName: isCompanyDriver ? driverName : 'THIRD_PARTY_DRIVER',
          orderProcessingCreated,
          orderProcessingExists: !orderProcessingCreated,
          balanceSheetUpdated: true,
        },
      });
    } catch (error) {
      console.error('Failed to log order processing creation:', error);
    }
  }

  /**
   * Update balance sheet when sale is shipped
   * This marks the sale as "out for delivery" and confirms the amount
   */
  private async updateBalanceSheetForShipping(sale: any) {
    const prisma = await this.tenantContext.getPrismaClient();

    // Update balance sheet description to indicate shipping
    await prisma.balanceSheet.updateMany({
      where: { saleId: sale.id },
      data: {
        description: `Sale #${sale.id} - Shipped for delivery (${sale.totalAmount})`,
        // Confirm the final amount at shipping time
        remainingAmount: sale.totalAmount,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Handle DELIVERED status - update customer balance
   */
  private async handleDeliveredStatus(
    sale: any,
    userId: string,
    storeId: string,
  ) {
    const prisma = await this.tenantContext.getPrismaClient();

    // Update customer balance sheet when delivered
    await this.updateBalanceSheetForDelivery(sale);

    // Log delivery completion
    try {
      await this.saleHistoryService.createHistory({
        saleId: sale.id,
        userId,
        storeId: storeId,
        action: 'SALE_COMPLETED' as any,
        description: `Sale delivered and completed - balance confirmed`,
        newData: {
          deliveredAt: new Date().toISOString(),
          totalAmount: sale.totalAmount,
          balanceUpdated: true,
        },
      });
    } catch (error) {
      console.error('Failed to log delivery completion:', error);
    }
  }

  /**
   * Update balance sheet when sale is delivered
   * This confirms the final amount and adjusts payment status
   */
  private async updateBalanceSheetForDelivery(sale: any) {
    const prisma = await this.tenantContext.getPrismaClient();

    // Find existing balance sheet entry for this sale
    const balanceEntry = await prisma.balanceSheet.findFirst({
      where: { saleId: sale.id },
    });

    if (balanceEntry) {
      // Update existing entry with delivery confirmation
      await prisma.balanceSheet.update({
        where: { id: balanceEntry.id },
        data: {
          description: `${balanceEntry.description || ''} - Delivered`,
          // Confirm the remaining amount (may have been updated by driver)
          remainingAmount:
            balanceEntry.paymentStatus === 'PAID'
              ? 0
              : sale.totalAmount - balanceEntry.amountPaid,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new balance sheet entry if none exists (edge case)
      await prisma.balanceSheet.create({
        data: {
          customerId: sale.customerId,
          saleId: sale.id,
          transactionType: TransactionType.PAYMENT,
          remainingAmount: sale.totalAmount,
          amountPaid: 0,
          paymentStatus: 'UNPAID',
          description: `Sale #${sale.id} - Delivered (${sale.totalAmount})`,
        },
      });
    }

    // Log the balance update in history
    try {
      await this.saleHistoryService.createHistory({
        saleId: sale.id,
        userId: sale.userId,
        storeId: sale.storeId,
        action: 'PAYMENT_PROCESSED' as any,
        description: `Balance sheet updated for delivered sale`,
        newData: {
          totalAmount: sale.totalAmount,
          deliveryConfirmed: true,
        },
      });
    } catch (error) {
      console.error('Failed to log balance update:', error);
    }
  }

  /**
   * Validate sale exists and belongs to store
   */
  private async validateSaleExists(saleId: string, storeId: string) {
    const prisma = await this.tenantContext.getPrismaClient();

    const sale = await prisma.sales.findFirst({
      where: {
        id: saleId,
        storeId,
      },
      include: {
        customer: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(
        `Sale with ID ${saleId} not found in store ${storeId}`,
      );
    }

    return sale;
  }

  /**
   * Get available status transitions for a sale
   */
  async getAvailableStatusTransitions(saleId: string, storeId: string) {
    const sale = await this.validateSaleExists(saleId, storeId);
    const availableTransitions = this.statusTransitions[sale.status];

    return {
      currentStatus: sale.status,
      availableTransitions,
      saleId: sale.id,
      customerName: sale.customer?.customerName || 'Unknown Customer',
    };
  }
}
