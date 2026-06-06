import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantContextService } from '../tenant/tenant-context.service';
import {
  AddInitialBalanceDto,
  CreatePaymentDto,
} from './dto/create-payment.dto';
import {
  PaymentMethod,
  PaymentStatus,
  SaleStatus,
  TransactionType,
} from '@prisma/client';
import { SaleHistoryService } from './sale-history.service';

@Injectable()
export class CustomerBalanceService {
  constructor(
    private tenantContext: TenantContextService,
    private saleHistoryService: SaleHistoryService,
  ) {}

  async createBalanceSheetEntry(
    data: {
      customerId: string;
      saleId?: string;
      remainingAmount: number;
      amountPaid?: number;
      description?: string;
    },
    tx?: any,
  ) {
    const prisma = tx || (await this.tenantContext.getPrismaClient());

    return await prisma.balanceSheet.create({
      data: {
        customerId: data.customerId,
        saleId: data.saleId,
        remainingAmount: data.remainingAmount,
        amountPaid: data.amountPaid || 0,
        paymentStatus: data.remainingAmount > 0 ? 'UNPAID' : 'PAID',
        transactionType: TransactionType.SALE,
        description: data.description,
      },
    });
  }

  // async recordPayment(paymentDto: CreatePaymentDto) {
  //   const { customerId, saleId, amountPaid, description } = paymentDto;
  //   // Get customer's current balance
  //   const currentBalance = await this.getCustomerBalance(customerId);

  //   if (amountPaid > currentBalance.totalOwed) {
  //     throw new Error(`Payment amount ${amountPaid} exceeds total owed ${currentBalance.totalOwed}`);
  //   }

  //   const prisma = await this.tenantContext.getPrismaClient();

  //   // Create payment record
  //   const payment = await prisma.balanceSheet.create({
  //     data: {
  //       customerId,
  //       saleId,
  //       transactionType: TransactionType.PAYMENT,
  //       remainingAmount: -amountPaid, // Negative for payment
  //       amountPaid: amountPaid,
  //       paymentStatus: 'PAID',
  //       description: description || 'Customer payment',
  //     },
  //   });

  //   // Update payment status of outstanding balances
  //   await this.updatePaymentStatus(customerId);

  //   return payment;
  // }

  async createPayment(dto: CreatePaymentDto, user: any) {
    const prisma = await this.tenantContext.getPrismaClient();

    return await prisma.$transaction(async (tx) => {
      const store = await prisma.stores.findUnique({
        where: { id: dto.storeId },
      });
      if (!store) {
        throw new BadRequestException('Invalid storeId - store does not exist');
      }

      const customer = await tx.customer.findUnique({
        where: { id: dto.customerId, storeId: dto.storeId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      if (dto.amountPaid <= 0) {
        throw new BadRequestException('Payment amount must be positive');
      }

      let operationalAmount = dto.amountPaid;
      let newBalance = customer.currentBalance;
      let newCredits = customer.credits ?? 0;

      // STEP 1: Apply payment to debts (oldest unpaid/partial first)
      if (operationalAmount > 0) {
        const balanceEntries = await tx.balanceSheet.findMany({
          where: {
            customerId: dto.customerId,
            paymentStatus: {
              in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL],
            },
          },
          orderBy: { createdAt: 'asc' },
        });

        for (const entry of balanceEntries) {
          if (operationalAmount <= 0) break;

          const amountOwed = Number(
            (entry.remainingAmount - entry.amountPaid).toFixed(2),
          );
          const amountToPay = Math.min(operationalAmount, amountOwed);

          await tx.balanceSheet.update({
            where: { id: entry.id },
            data: {
              amountPaid: { increment: amountToPay },
              paymentStatus:
                entry.amountPaid + amountToPay >= entry.remainingAmount
                  ? PaymentStatus.PAID
                  : PaymentStatus.PARTIAL,
              updatedAt: new Date(),
              description: entry.description
                ? `${entry.description} | Payment applied: ${amountToPay}`
                : `Payment applied: ${amountToPay}`,
            },
          });

          // Update sale entry only if saleId is not null
          if (entry.saleId) {
            await tx.sales.update({
              where: {
                id: entry.saleId,
                status: { not: SaleStatus.DELIVERED },
              },
              data: {
                status: SaleStatus.DELIVERED,
                updatedAt: new Date(),
              },
            });
          }

          newBalance -= amountToPay;
          operationalAmount -= amountToPay;
        }
      }

      // STEP 2: If excess remains after clearing debts → store as credits
      if (operationalAmount > 0) {
        newCredits += operationalAmount;
        const { clientId } = this.tenantContext.getTenantInfo() as { clientId: string };

        await tx.balanceSheet.create({
          data: {
            customerId: dto.customerId,
            clientId,
            transactionType: TransactionType.PAYMENT,
            amountPaid: operationalAmount,
            remainingAmount: 0,
            paymentStatus: PaymentStatus.PAID,
            description: 'Excess payment recorded as credit',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        operationalAmount = 0;
      }

      // STEP 3: Update customer balances
      await tx.customer.update({
        where: { id: dto.customerId },
        data: {
          currentBalance: newBalance,
          credits: newCredits,
        },
      });

      // STEP 4: Log payment in history (if associated with a sale)
      if (dto.saleId) {
        const paymentData = {
          customerId: dto.customerId,
          amount: dto.amountPaid,
          paymentMethod: dto.paymentMethod,
          remainingPayment: operationalAmount,
          newBalance,
          newCredits,
        };

        await this.saleHistoryService.logPaymentProcessed(
          dto.saleId,
          user.id,
          dto.storeId,
          paymentData,
          null, // oldData - could pass previous payment state if available
          { description: `Payment processed for customer ${dto.customerId}` },
          tx,
        );
      }

      return {
        success: true,
        currentBalance: newBalance,
        credits: newCredits,
      };
    });
  }

  async addInitialBalance(dto: AddInitialBalanceDto) {
    const prisma = await this.tenantContext.getPrismaClient();

    return await prisma.$transaction(async (tx) => {
      // Validate that store exists
      const store = await prisma.stores.findUnique({
        where: { id: dto.storeId },
      });
      if (!store) {
        throw new BadRequestException('Invalid storeId - store does not exist');
      }

      // Validate customer exists
      const customer = await tx.customer.findUnique({
        where: { id: dto.customerId, storeId: dto.storeId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      // Validate initial balance
      if (dto.initialBalance < 0) {
        throw new BadRequestException('Initial balance cannot be negative');
      }

      const { clientId } = this.tenantContext.getTenantInfo() as { clientId: string };

      // Create balance sheet entry for initial balance
      const balanceEntry = await tx.balanceSheet.create({
        data: {
          customerId: dto.customerId,
          clientId,
          transactionType: TransactionType.ADJUSTMENT,
          remainingAmount: dto.initialBalance,
          amountPaid: 0,
          paymentStatus:
            dto.initialBalance > 0 ? PaymentStatus.UNPAID : PaymentStatus.PAID,
          description:
            dto.description ||
            `Initial balance imported for customer ${customer.customerName}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Update customer's currentBalance (credits remain untouched)
      const currentBalance = customer.currentBalance + dto.initialBalance;

      await tx.customer.update({
        where: { id: dto.customerId },
        data: { currentBalance }, // credits field stays as is
      });

      return {
        success: true,
        currentBalance,
        credits: customer.credits, // unchanged
        balanceEntry,
      };
    });
  }

  // async updateBalanceForRefund(
  //   customerId: string,
  //   refundAmount: number,
  //   saleId?: string,
  // ) {
  //   const prisma = await this.tenantContext.getPrismaClient();
  //   return await prisma.balanceSheet.create({
  //     data: {
  //       customerId,
  //       saleId,
  //       transactionType: TransactionType.REFUND,
  //       remainingAmount: refundAmount, 
  //       amountPaid: 0,
  //       paymentStatus: PaymentStatus.REFUND,
  //       description: 'Refund processed',
  //     },
  //   });
  // }
  async updateBalanceForRefund(
    customerId: string,
    refundAmount: number,
    saleId: string,
  ) {
    const prisma = await this.tenantContext.getPrismaClient();
    
    if (saleId) {
      // Try to find existing balance sheet entry for this sale
      const existingEntry = await prisma.balanceSheet.findFirst({
        where: {
          customerId,
          saleId,
        },
      });

      if (existingEntry) {
        // Update existing entry
        return await prisma.balanceSheet.update({
          where: { id: existingEntry.id },
          data: {
            transactionType: TransactionType.REFUND,
            remainingAmount: refundAmount,
            amountPaid: 0,
            paymentStatus: PaymentStatus.REFUNDED,
            description: 'Refund processed',
            updatedAt: new Date(),
          },
        });
      }
    }

    // Fallback: Create new entry if no existing entry found or no saleId provided
    const { clientId } = this.tenantContext.getTenantInfo() as { clientId: string };
    return await prisma.balanceSheet.create({
      data: {
        customerId,
        clientId,
        saleId,
        transactionType: TransactionType.REFUND,
        remainingAmount: refundAmount,
        amountPaid: 0,
        paymentStatus: PaymentStatus.REFUNDED,
        description: 'Refund processed',
      },
    });
  }
  private async updatePaymentStatus(customerId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    // Get all unpaid entries
    const unpaidEntries = await prisma.balanceSheet.findMany({
      where: {
        customerId,
        paymentStatus: 'UNPAID',
        remainingAmount: { gt: 0 },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get total payments
    const totalPayments = await prisma.balanceSheet.aggregate({
      where: {
        customerId,
        remainingAmount: { lt: 0 }, // Payments and refunds
      },
      _sum: {
        remainingAmount: true,
      },
    });

    const availableCredit = Math.abs(totalPayments._sum.remainingAmount || 0);
    let remainingCredit = availableCredit;

    // Apply payments to oldest unpaid entries first
    for (const entry of unpaidEntries) {
      if (remainingCredit >= entry.remainingAmount) {
        // Fully pay this entry
        await prisma.balanceSheet.update({
          where: { id: entry.id },
          data: { paymentStatus: 'PAID' },
        });
        remainingCredit -= entry.remainingAmount;
      } else if (remainingCredit > 0) {
        // Partially pay this entry
        await prisma.balanceSheet.update({
          where: { id: entry.id },
          data: { paymentStatus: 'PARTIAL' },
        });
        remainingCredit = 0;
      }
    }
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
      take: 10, // Recent 10 entries as per documentation
    });

    // Calculate totals
    const totalOwed = balanceEntries
      .filter((entry) => entry.remainingAmount > 0)
      .reduce((sum, entry) => {
        return entry.paymentStatus === 'UNPAID'
          ? sum + entry.remainingAmount
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
      credit: customer.currentBalance,
      recentHistory,
    };
  }

  async deleteBalanceEntriesForSale(saleId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    return await prisma.balanceSheet.deleteMany({
      where: { saleId },
    });
  }

  async findOrCreateCustomer(
    phoneNumber: string,
    customerData?: {
      customerName?: string;
      customerMail?: string;
      customerAddress?: string;
      storeId: string;
      clientId: string;
      customerStreet?: string;
      customerCity?: string;
      customerState?: string;
      customerCountry?: string;
      customerZipCode?: string;
    },
    tx?: any,
  ) {
    const prisma = tx || (await this.tenantContext.getPrismaClient());
    // Try to find existing customer by phone
    let customer = await prisma.customer.findUnique({
      where: { phoneNumber },
    });

    if (!customer && customerData) {
      // Create new customer
      customer = await prisma.customer.create({
        data: {
          customerName: customerData.customerName || 'Unknown Customer',
          phoneNumber,
          customerMail: customerData.customerMail,
          customerStreetAddress: customerData.customerAddress,
          country: customerData.customerCountry,
          city: customerData.customerCity,
          state: customerData.customerState,
          zipCode: customerData.customerZipCode,
          storeId: customerData.storeId,
          clientId: customerData.clientId,
        },
      });
    }

    return customer;
  }
}
