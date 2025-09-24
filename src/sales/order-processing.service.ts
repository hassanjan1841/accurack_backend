import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TenantContextService } from '../tenant/tenant-context.service';
import { SaleHistoryService } from './sale-history.service';
import {
  UpdateOrderProcessingDto,
  OrderProcessingStatus,
} from './dto/update-order-processing.dto';
import { ValidateOrderProcessingDto } from './dto/validate-order-processing.dto';
import { QueryOrderProcessingDto } from './dto/query-order-processing.dto';
import {
  Role,
  SaleHistoryAction,
  ReturnCategory,
  PaymentStatus,
  SaleStatus,
} from '@prisma/client';
import { SaleInventoryService } from './sale-inventory.service';
import { ResponseService } from 'src/common';
import { CancelOrderProcessingDto } from './dto/cancel-order-processing.dto';
import { orderBy } from 'lodash';

export interface OrderProcessingUser {
  id: string;
  role: Role;
  stores: { storeId: string }[];
}

@Injectable()
export class OrderProcessingService {
  constructor(
    private tenantContext: TenantContextService,
    private saleHistoryService: SaleHistoryService,
    private inventoryService: SaleInventoryService,
  ) {}

  /**
   * Update order processing (Driver updates)
   */
  async updateOrderProcessing(
    orderProcessingId: string,
    updateDto: UpdateOrderProcessingDto,
    userId: string,
    user: OrderProcessingUser,
  ) {
    if (!orderProcessingId || updateDto?.storeId === undefined) {
      console.log('Order Processing ID or Store ID is missing', {
        orderProcessingId,
        updateDtoStoreId: updateDto?.storeId,
      });
      throw new NotFoundException('Order processing not found');
    }

    // Validate order processing exists and user has access
    const orderProcessing = await this.validateOrderProcessingAccess(
      orderProcessingId,
      updateDto.storeId,
    );

    const {
      status,
      paymentAmount,
      paymentType,
      notes,
      deliveryDetails,
      metadata,
    } = updateDto;

    const prisma = await this.tenantContext.getPrismaClient();

    return await prisma.$transaction(async (tx) => {
      // Store old data for history
      const oldData = {
        status: orderProcessing.status,
        paymentAmount: orderProcessing.paymentAmount,
        paymentType: orderProcessing.paymentType,
      };

      // Update order processing
      const updatedOrderProcessing = await tx.orderProcessing.update({
        where: { id: orderProcessingId },
        data: {
          ...(status && { status: status as any }),
          ...(paymentAmount !== undefined && { paymentAmount }),
          ...(paymentType && { paymentType }),
          updatedAt: new Date(),
        },
        include: {
          customer: true,
          store: true,
          sale: true,
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          validator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Log the update in history
      try {
        await this.saleHistoryService.createHistory(
          {
            saleId:
              (orderProcessing as any).saleId || 'ORDER_' + orderProcessingId,
            userId,
            storeId: orderProcessing.storeId,
            action: 'ORDER_PROCESSED' as any,
            description: `Order processing updated by driver${paymentAmount !== undefined ? ' - payment amount updated' : ''}`,
            oldData,
            newData: updateDto,
            metadata: {
              orderProcessingId,
              notes,
              deliveryDetails,
              balanceSheetUpdated: false, // Balance sheet is updated in validateOrderProcessing
              ...metadata,
            },
          },
          tx,
        );
      } catch (historyError) {
        console.error('Failed to log order processing update:', historyError);
      }

      console.log('Updated Order Processing:', updatedOrderProcessing);

      return {
        orderProcessing: updatedOrderProcessing,
        message: 'Order processing updated successfully',
        updatedFields: Object.keys(updateDto),
        timestamp: new Date(),
      };
    });
  }
  /**
   * Validate order processing (Validator approves/rejects)
   */
  async validateOrderProcessing(
    orderProcessingId: string,
    storeId: string,
    validateDto: ValidateOrderProcessingDto,
    userId: string,
    user: OrderProcessingUser,
  ) {
    // Only admin and super_admin can validate orders
    if (user.role !== Role.admin && user.role !== Role.super_admin) {
      throw new ForbiddenException(
        'Only admin and super admin can validate orders',
      );
    }

    // Validate order processing exists and user has access
    const orderProcessing = await this.validateOrderProcessingAccess(
      orderProcessingId,
      storeId,
    );

    const { isValidated, validationNotes, rejectionReason, metadata } =
      validateDto;

    const prisma = await this.tenantContext.getPrismaClient();

    return await prisma.$transaction(async (tx) => {
      // Update order processing validation
      const updatedOrderProcessing = await tx.orderProcessing.update({
        where: { id: orderProcessingId },
        data: {
          isValidated,
          validatorId: userId,
          status: isValidated ? ('VALIDATED' as any) : ('CANCELLED' as any),
          updatedAt: new Date(),
        },
        include: {
          customer: true,
          store: true,
          sale: true,
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          validator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // If validated, update balance sheet and customer balance
      if (
        isValidated &&
        (orderProcessing as any).saleId &&
        orderProcessing.paymentAmount !== undefined
      ) {
        await this.updateBalanceSheetForPaymentChange(
          tx,
          (orderProcessing as any).saleId,
          orderProcessing.customerId,
          storeId,
          orderProcessing.paymentAmount,
        );
      }

      // Log the validation in history
      try {
        await this.saleHistoryService.createHistory(
          {
            saleId:
              (orderProcessing as any).saleId || 'ORDER_' + orderProcessingId,
            userId,
            storeId: orderProcessing.storeId,
            action: isValidated
              ? ('ORDER_PROCESSED' as any)
              : ('SALE_CANCELLED' as any),
            description: isValidated
              ? `Order validated and approved, balance sheet updated`
              : `Order rejected: ${rejectionReason || 'No reason provided'}`,
            newData: {
              isValidated,
              validationNotes,
              rejectionReason,
              validatorId: userId,
              paymentAmount: orderProcessing.paymentAmount,
            },
            metadata: {
              balanceSheetUpdated:
                isValidated && orderProcessing.paymentAmount !== undefined,
              ...metadata,
            },
          },
          tx,
        );
      } catch (historyError) {
        console.error('Failed to log order validation:', historyError);
      }

      return {
        orderProcessing: updatedOrderProcessing,
        message: isValidated
          ? 'Order validated and approved successfully'
          : 'Order rejected successfully',
        isValidated,
        validationNotes,
        rejectionReason,
        timestamp: new Date(),
      };
    });
  }
  /**
   * Get order processing details
   */
  async getOrderProcessing(orderProcessingId: string, storeId: string) {
    const orderProcessing = await this.validateOrderProcessingAccess(
      orderProcessingId,
      storeId,
    );

    const prisma = await this.tenantContext.getPrismaClient();

    return await prisma.orderProcessing.findUnique({
      where: { id: orderProcessingId },
      include: {
        customer: true,
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        validator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get all order processing records with filtering and pagination
   */
  async getAllOrderProcessing(
    queryDto: QueryOrderProcessingDto,
    user: OrderProcessingUser,
  ) {
    const {
      storeId,
      page = 1,
      limit = 20,
      status,
      paymentMethod,
      search,
      dateFrom,
      dateTo,
      customerId,
      driverId,
      validatorId,
      isValidated,
    } = queryDto;

    const prisma = await this.tenantContext.getPrismaClient();

    const where: any = {
      AND: [],
    };

    // console.log('Is Validated:', isValidated);

    // General filters
    if (status) where.AND.push({ status });
    if (storeId) where.AND.push({ storeId });
    if (paymentMethod) where.AND.push({ paymentType: paymentMethod });
    if (customerId) where.AND.push({ customerId });
    if (driverId) where.AND.push({ driverId });
    if (validatorId) where.AND.push({ validatorId });
    if (isValidated !== undefined) where.AND.push({ isValidated });

    // Date range filter
    if (dateFrom || dateTo) {
      const dateFilter: any = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.AND.push({ createdAt: dateFilter });
    }

    // Search filter
    if (search?.trim()) {
      where.AND.push({
        OR: [
          {
            customer: {
              customerName: {
                contains: search.trim(),
                mode: 'insensitive',
              },
            },
          },
          {
            driver: {
              firstName: {
                contains: search.trim(),
                mode: 'insensitive',
              },
            },
          },
          {
            driver: {
              lastName: {
                contains: search.trim(),
                mode: 'insensitive',
              },
            },
          },
        ],
      });
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.orderProcessing.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              customerName: true,
              customerMail: true,
              phoneNumber: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          validator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          sale: {
            select:{
              saleNo: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.orderProcessing.count({ where }),
    ]);

    console.log("orders",orders);

    return {
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      filters: {
        storeId,
        status,
        paymentMethod,
        search,
        dateFrom,
        dateTo,
        customerId,
        driverId,
        validatorId,
        isValidated,
      },
    };
  }

  /**
   * Validate order processing exists and user has access
   */
  private async validateOrderProcessingAccess(
    orderProcessingId: string,
    storeId: string,
  ) {
    if (!orderProcessingId || !storeId) {
      throw new NotFoundException('Order processing ID or Store ID is missing');
    }

    const prisma = await this.tenantContext.getPrismaClient();

    const orderProcessing = await prisma.orderProcessing.findUnique({
      where: { id: orderProcessingId, storeId },
      include: {
        customer: true,
      },
    });

    if (!orderProcessing) {
      throw new NotFoundException(
        `Order processing with ID ${orderProcessingId} not found`,
      );
    }

    // Check store access
    // const userStoreIds = user.stores.map((store) => store.storeId);
    // if (!userStoreIds.includes(orderProcessing.storeId)) {
    //   throw new ForbiddenException(
    //     'Access denied to this order processing record',
    //   );
    // }

    return orderProcessing;
  }

  /**
   * Update balance sheet when driver changes payment amount
   */
  private async updateBalanceSheetForPaymentChange(
    tx: any,
    saleId: string,
    customerId: string,
    storeId: string,
    newPaymentAmount: number,
  ) {
    // Fetch customer
    const customer = await tx.customer.findUnique({
      where: { id: customerId, storeId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const sale = await tx.sales.findUnique({
      where: { id: saleId },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    const saleAmount = sale.totalAmount;
    let paymentStatus: PaymentStatus;
    let paidAmount = newPaymentAmount;
    let remainingAmount = 0;
    let updatedCurrentBalance = customer.currentBalance;
    let updatedCredits = customer.credits ?? 0;

    if (newPaymentAmount >= saleAmount) {
      // Full payment or overpayment
      paymentStatus = PaymentStatus.PAID;
      paidAmount = saleAmount;
      remainingAmount = 0;

      const overpayment = newPaymentAmount - saleAmount;
      if (overpayment > 0) {
        updatedCredits += overpayment; // store extra in credits
      }
    } else {
      // Partial payment
      paymentStatus = PaymentStatus.PARTIAL;
      paidAmount = newPaymentAmount;
      remainingAmount = saleAmount - newPaymentAmount;

      updatedCurrentBalance += remainingAmount; //  increase debt
    }

    // Update sale entry
    await tx.sales.update({
      where: { id: saleId },
      data: {
        status: SaleStatus.DELIVERED,
        updatedAt: new Date(),
      },
    });

    // Find and update balance sheet entry
    const lastBalanceSheet = await tx.balanceSheet.findFirst({
      where: { customerId, saleId, transactionType: 'SALE' },
    });

    if (!lastBalanceSheet) {
      throw new NotFoundException(
        'Balance sheet record not found for this sale',
      );
    }

    await tx.balanceSheet.update({
      where: { id: lastBalanceSheet.id },
      data: {
        transactionType: 'PAYMENT',
        amountPaid: paidAmount,
        remainingAmount,
        paymentStatus,
        description: `Payment of ${newPaymentAmount} applied to sale of ${saleAmount}`,
        updatedAt: new Date(),
      },
    });

    // Update customer balance & credits
    await tx.customer.update({
      where: { id: customerId },
      data: {
        currentBalance: updatedCurrentBalance,
        credits: updatedCredits,
      },
    });
  }

  private async validateSaleItemsForCancellation(
    returnItems: any[],
    sale: any,
  ) {
    for (const returnItem of returnItems) {
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

      if (totalReturnQuantity > originalSaleItem.quantity) {
        throw new BadRequestException(
          `Cannot cancel ${returnItem.quantity} items. Original quantity: ${originalSaleItem.quantity}, already returned: ${alreadyReturned}, requested cancellation: ${returnItem.quantity}`,
        );
      }
    }
  }

  async cancelOrderProcessing(
    orderProcessingId: string,
    storeId: string,
    userId: string,
    user: OrderProcessingUser,
    responseService: ResponseService,
    inventoryService: SaleInventoryService,
    dto: CancelOrderProcessingDto
  ) {
    // Restrict cancellation to admin and super_admin roles
    if (user.role !== Role.admin && user.role !== Role.super_admin) {
      throw new ForbiddenException(
        'Only admin and super admin can cancel orders',
      );
    }

    const prisma = await this.tenantContext.getPrismaClient();

    // Validate order processing exists and belongs to store
    const orderProcessing = await prisma.orderProcessing.findUnique({
      where: { id: orderProcessingId, storeId },
      include: {
        sale: {
          include: {
            saleItems: true,
            returns: true,
          },
        },
        store: true,
        customer: true,
      },
    });

    if (!orderProcessing) {
      throw new NotFoundException(
        `Order processing with ID ${orderProcessingId} not found in store ${storeId}`,
      );
    }

    // Validate sale if it exists
    if (orderProcessing.sale && orderProcessing.sale.status === 'CANCELLED') {
      throw new BadRequestException(
        'Cannot cancel items from an already cancelled sale',
      );
    }


  // Prepare items for inventory restoration
  // const returnItems = orderProcessing.sale?.saleItems?.length
  //   ? orderProcessing.sale.saleItems.map((item: any) => ({
  //     productId: item.productId,
  //     quantity: item.quantity,
  //     pluUpc: item.pluUpc || '',
  //     packType: item.packType,
  //     isProductReturned: true,
  //     returnCategory: ReturnCategory.SCRAP, // Use enum value instead of string
  //     refundAmount: 0, // No refund for cancellations
  //     refundAmountType: 'Amount', // Match CreateSaleReturnDto
  //   }))
  //   : [];

  // Validate items before restoration
  // if (returnItems.length) {
  //   await this.validateSaleItemsForCancellation(returnItems, orderProcessing.sale);
  // }

    return await prisma.$transaction(async (tx) => {
      // Update order processing status to CANCELLED
      const updatedOrderProcessing = await tx.orderProcessing.update({
        where: { id: orderProcessingId },
        data: {
          status: 'CANCELLED',
          cancellationReason: dto.cancellationReason,
          updatedAt: new Date(),
        },
        include: {
          sale: {
            include: {
              saleItems: true,
            },
          },
          store: true,
          customer: true,
        },
      });

      // let saleUpdate: any = null;
      // let inventoryRestored = false;

      // If there's an associated sale, cancel it and restore inventory
      // if (updatedOrderProcessing.sale) {
      //   saleUpdate = await tx.sales.update({
      //     where: { id: updatedOrderProcessing.sale.id },
      //     data: {
      //       status: 'CANCELLED',
      //       updatedAt: new Date(),
      //     },
      //   });

      //   // Restore inventory for all sale items
      //   if (returnItems.length) {
      //     await inventoryService.restoreInventoryForReturn(returnItems);
      //     inventoryRestored = true;
      //   }
      // }

      // Log cancellation in sale history
      try {
        await this.saleHistoryService.createHistory(
          {
            saleId: `ORDER_${orderProcessingId}`,
            userId,
            storeId: updatedOrderProcessing.storeId,
            action: 'ORDER_CANCELLED' as any,
            description: 'Order cancelled by admin/super_admin',
            oldData: {
              orderProcessingStatus: orderProcessing.status,
            },
            newData: {
              orderProcessingStatus: 'CANCELLED',
            },
            metadata: {
              orderProcessingId,
              ...dto,
            },
          },
          tx,
        );
      } catch (historyError) {
        console.error('Failed to log order cancellation:', historyError);
      }

      return {
        orderProcessing: updatedOrderProcessing,
      };
    });
  }
}
