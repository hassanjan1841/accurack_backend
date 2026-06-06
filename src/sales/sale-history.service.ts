import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  QuerySalesHistoryDto,
  SaleHistoryAction,
} from './dto/query-sales-history.dto';
import { Role } from '@prisma/client';
import { TenantContextService } from 'src/tenant/tenant-context.service';

interface CreateSaleHistoryInput {
  saleId: string;
  userId: string;
  storeId: string;
  action: SaleHistoryAction;
  description: string;
  oldData?: any;
  newData?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

interface SaleHistoryUser {
  id: string;
  role: Role;
  stores: { storeId: string }[];
}

@Injectable()
export class SaleHistoryService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
  ) {}

  /**
   * Create a new sale history entry
   */
  async createHistory(input: CreateSaleHistoryInput, tx?: any) {
    // Validate that saleId is provided and not empty
    if (!input.saleId || input.saleId.trim() === '') {
      throw new BadRequestException(
        'saleId is required for creating sale history',
      );
    }

    // Use transaction if provided, otherwise get prisma client
    const prismaClient = tx || (await this.tenantContext.getPrismaClient());

    try {
      return await prismaClient.saleHistory.create({
        data: {
          action: input.action,
          description: input.description,
          oldData: input.oldData ?? undefined,
          newData: input.newData ?? undefined,
          metadata: input.metadata ?? undefined,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          // Connect to the existing records using relationships
          sale: {
            connect: {
              id: input.saleId,
            },
          },
          user: {
            connect: {
              id: input.userId,
            },
          },
          store: {
            connect: {
              id: input.storeId,
            },
          },
        },
      });
    } catch (error) {
      console.error('Error creating sale history:', error);
      throw error;
    }
  }

  /**
   * Get sales history with advanced filtering and access control
   */
  async getSalesHistory(
    query: QuerySalesHistoryDto,
    user: SaleHistoryUser,
    tenantId: string,
  ) {
    const prisma = await this.tenantContext.getPrismaClient();
    // Access control: Only super admin and store admin can access
    // if (user.role !== Role.super_admin && user.role !== Role.admin) {
    //   throw new ForbiddenException('Access denied. Only super admin and store admin can view sales history.');
    // }

    // Get user's accessible store IDs
    // const userStoreIds = user.stores.map(store => store.storeId);

    // if (userStoreIds.length === 0) {
    //   throw new ForbiddenException('No store access found for user.');
    // }

    // Build where conditions
    const whereConditions: any = {
      storeId: query.storeId,
    };

    // Apply filters
    if (query.saleId) {
      whereConditions.saleId = query.saleId;
    }

    if (query.userId) {
      whereConditions.userId = query.userId;
    }

    if (query.action) {
      whereConditions.action = query.action;
    }

    // Date range filtering
    if (query.startDate || query.endDate) {
      whereConditions.createdAt = {};
      if (query.startDate) {
        whereConditions.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        whereConditions.createdAt.lte = new Date(query.endDate);
      }
    }

    // Search functionality
    if (query.search) {
      whereConditions.OR = [
        {
          description: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          saleId: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          sale: {
            customer: {
              OR: [
                {
                  firstName: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          },
        },
      ];
    }

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await prisma.saleHistory.count({
      where: whereConditions,
    });

    // Build orderBy object
    const orderBy: any = {};
    orderBy[query.sortBy || 'createdAt'] = query.sortOrder || 'desc';

    // Get records with relations
    const records = await prisma.saleHistory.findMany({
      where: whereConditions,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        sale: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            saleNo: true,
            paymentMethod: true,
            customer: {
              select: {
                id: true,
                customerName: true,
                customerMail: true,
              },
            },
          },
        },
      },
      orderBy: orderBy,
      skip,
      take: limit,
    });


    return {
      formattedRecords: records,
      pagination: {
        page: page,
        limit: limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Helper method to log sale creation
   */
  async logSaleCreated(
    saleId: string,
    userId: string,
    storeId: string,
    saleData: any,
    oldData?: any,
    metadata?: any,
    tx?: any,
  ) {
    return this.createHistory(
      {
        saleId,
        userId,
        storeId,
        action: SaleHistoryAction.SALE_CREATED,
        description: `Sale created with total amount: $${saleData.totalAmount}`,
        oldData: oldData ?? null,
        newData: saleData,
        metadata,
      },
      tx,
    );
  }

  /**
   * Helper method to log sale updates
   */
  async logSaleUpdated(
    saleId: string,
    userId: string,
    storeId: string,
    oldData: any,
    newData: any,
    metadata?: any,
    tx?: any,
  ) {
    return this.createHistory(
      {
        saleId,
        userId,
        storeId,
        action: SaleHistoryAction.SALE_UPDATED,
        description: `Sale updated`,
        oldData,
        newData,
        metadata,
      },
      tx,
    );
  }

  /**
   * Helper method to log status changes
   */
  async logStatusChanged(
    saleId: string,
    userId: string,
    storeId: string,
    oldStatus: string,
    newStatus: string,
    metadata?: any,
    tx?: any,
  ) {
    return this.createHistory(
      {
        saleId,
        userId,
        storeId,
        action: SaleHistoryAction.STATUS_CHANGED,
        description: `Sale status changed from ${oldStatus} to ${newStatus}`,
        oldData: { status: oldStatus },
        newData: { status: newStatus },
        metadata,
      },
      tx,
    );
  }

  /**
   * Helper method to log payment processing
   */
  async logPaymentProcessed(
    saleId: string,
    userId: string,
    storeId: string,
    paymentData: any,
    oldData?: any,
    metadata?: any,
    tx?: any,
  ) {
    return this.createHistory(
      {
        saleId,
        userId,
        storeId,
        action: SaleHistoryAction.PAYMENT_PROCESSED,
        description: `Payment processed: ${paymentData.paymentMethod} - $${paymentData.amount}`,
        oldData: oldData ?? null,
        newData: paymentData,
        metadata,
      },
      tx,
    );
  }

  /**
   * Helper method to log returns
   */
  async logSaleReturned(
    saleId: string,
    userId: string,
    storeId: string,
    returnData: any,
    isPartial: boolean = false,
    oldData?: any,
    metadata?: any,
    tx?: any,
  ) {
    return this.createHistory(
      {
        saleId,
        userId,
        storeId,
        action: isPartial
          ? SaleHistoryAction.SALE_PARTIAL_RETURN
          : SaleHistoryAction.SALE_RETURNED,
        description: isPartial
          ? `Partial return processed for $${returnData.refundAmount}`
          : `Full sale return processed for $${returnData.refundAmount}`,
        oldData: oldData ?? null,
        newData: returnData,
        metadata,
      },
      tx,
    );
  }

  /**
   * Helper method to log inventory updates
   */
  async logInventoryUpdated(
    saleId: string,
    userId: string,
    storeId: string,
    inventoryChanges: any,
    oldData?: any,
    metadata?: any,
    tx?: any,
  ) {
    return this.createHistory(
      {
        saleId,
        userId,
        storeId,
        action: SaleHistoryAction.INVENTORY_UPDATED,
        description: `Inventory updated for sale`,
        oldData: oldData ?? null,
        newData: inventoryChanges,
        metadata,
      },
      tx,
    );
  }
}
