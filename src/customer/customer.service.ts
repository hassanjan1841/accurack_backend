import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
} from './dto/customer.dto';
import { TenantContextService } from '../tenant/tenant-context.service';
import {
  PaymentStatus,
  TransactionType,
} from '@prisma/client';

@Injectable()
export class CustomerService {
  constructor(
    private readonly tenantContext: TenantContextService, // Add tenant context
  ) {}

  // Customer Management
  async createCustomer(dto: CreateCustomerDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    const { clientId } = this.tenantContext.getTenantInfo() as { clientId: string };
    // Check if customer already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (existingCustomer) {
      throw new BadRequestException(
        'Customer with this phone number already exists',
      );
    }

    return await prisma.$transaction(async (tx) => {
      // Create customer
      const customer = await tx.customer.create({
        data: dto,
      });

      // Create initial balance sheet for customer
      await tx.balanceSheet.create({
        data: {
          customerId: customer.id,
          clientId,
          remainingAmount: 0,
          transactionType: TransactionType.ADJUSTMENT,
          amountPaid: 0,
          paymentStatus: PaymentStatus.PAID,
          description: 'Initial balance sheet created',
        },
      });

      return customer;
    });
  }

  async findCustomerByPhone(phoneNumber: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    return await prisma.customer.findUnique({
      where: { phoneNumber },
      include: {
        balanceSheets: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async updateCustomer(customerId: string, dto: UpdateCustomerDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    try {
      const { customerAddress, ...validData } = dto as any;

      const updatedCustomer = await prisma.customer.update({
        where: { id: customerId },
        data: validData,
      });
      return updatedCustomer;
    } catch (updateError) {
      throw updateError; // Re-throw the original error to see what's actually happening
    }
  }

  async deleteCustomer(customerId: string) {
    const prisma = await this.tenantContext.getPrismaClient();

    // First check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Check if customer has any associated sales
    const salesCount = await prisma.sales.count({
      where: { customerId: customerId },
    });

    if (salesCount > 0) {
      throw new BadRequestException(
        'Cannot delete customer with existing sales records',
      );
    }

    // Delete related balance sheets first (due to foreign key constraints)
    await prisma.balanceSheet.deleteMany({
      where: { customerId: customerId },
    });

    // Delete the customer
    const response = await prisma.customer.delete({
      where: { id: customerId },
    });

    return response;
  }

  async getCustomers(
    user: any,
    storeId: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ) {
    const prisma = await this.tenantContext.getPrismaClient();

    if (storeId === 'undefined' || storeId === null) {
      const store = await prisma.stores.findFirst({
        where: { clientId: user.clientId },
        select: { id: true },
      });
      if (!store) {
        throw new NotFoundException('No store found for this user');
      }
    }

    // If search is provided, ignore pagination and return all matches
    if (search && search.trim() !== '') {
      const where: any = {
        storeId,
        OR: [
          { customerName: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search, mode: 'insensitive' } },
        ],
      };
      const customers = await prisma.customer.findMany({
        where,
        include: {
          balanceSheets: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { sales: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return {
        customers,
        total: customers.length,
        page: 1,
        limit: customers.length,
        totalPages: 1,
      };
    }

    // Default: paginated fetch
    const skip = (page - 1) * limit;
    const where: any = { storeId };
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          balanceSheets: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { sales: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);
    console.log('customers', customers, 'total', total);

    return {
      customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCustomerBalance(customerId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    const customer = await prisma.customer.findFirst({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found!');
    }

    const balanceEntries = await prisma.balanceSheet.findMany({
      where: { customerId },
      include: {
        sale: {
          select: {
            id: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals
    const totalOwed = balanceEntries
      .filter((entry) => entry.remainingAmount > 0)
      .reduce((sum, entry) => {
        return entry.paymentStatus === 'UNPAID' ||
          entry.paymentStatus === 'PARTIAL'
          ? entry.paymentStatus === 'PARTIAL'
            ? sum + (entry.remainingAmount - entry.amountPaid)
            : sum + entry.remainingAmount
          : sum;
      }, 0);

    const totalPaid = balanceEntries.reduce(
      (sum, entry) => sum + entry.amountPaid,
      0,
    );

    const recentHistory = balanceEntries.map((entry) => ({
      id: entry.id,
      amount: entry.remainingAmount,
      amountPaid: entry.amountPaid,
      paymentStatus: entry.paymentStatus,
      description: entry.description,
      saleId: entry.saleId,
      createdAt: entry.createdAt,
      sale: entry.sale,
    }));

    return {
      customerId,
      totalOwed,
      totalPaid,
      credit: customer.credits,
      recentHistory,
    };
  }

}
