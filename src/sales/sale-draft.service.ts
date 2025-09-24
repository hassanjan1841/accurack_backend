import { Injectable } from '@nestjs/common';
import { SaleStatus } from '@prisma/client';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { ReturnItemDto } from './dto/create-sale-return.dto';
import { includes } from 'lodash';

@Injectable()
export class SaleDraftService {
  constructor(private tenantContextService: TenantContextService) {}

  // Create or Update Draft Sale
  // Create or Update Draft Sale
  async saveDraftSale(req, res) {
    let { userId, storeId, clientId, saleItems, id, ...saleData } = req.body;
    userId = req.user.id;

    const prisma = await this.tenantContextService.getPrismaClient();

    try {
      // Validate required fields
      if (!storeId || !clientId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const saleDraft = await prisma.$transaction(async (tx) => {
        let existingDraft: any = null;

        console.log(id);

        if (id) {
          existingDraft = await tx.salesDraft.findUnique({
            where: { id },
          });
        }

        if (existingDraft) {
          // Update existing draft
          await tx.salesDraftItems.deleteMany({
            where: { saleDraftId: existingDraft.id },
          });

          const draft = await tx.salesDraft.update({
            where: { id: existingDraft.id },
            data: {
              ...saleData,
              updatedAt: new Date(),
            },
          });

          // Convert saleItems object to array and add saleDraftId to each item
          const saleItemsArray = Object.values(saleItems).map((item: any) => ({
            ...item,
            saleDraftId: draft.id,
          }));

          const salesDraftItems = await tx.salesDraftItems.createMany({
            data: saleItemsArray,
          });

          return draft;
        } else {
          // Create new draft
          const draft = await tx.salesDraft.create({
            data: {
              ...saleData,
              user: { connect: { id: userId } },
              store: { connect: { id: storeId } },
              client: { connect: { id: clientId } },
            },
          });

          // Convert saleItems object to array and add saleDraftId to each item
          const saleItemsArray = Object.values(saleItems).map((item: any) => ({
            ...item,
            saleDraftId: draft.id,
          }));

          const salesDraftItems = await tx.salesDraftItems.createMany({
            data: saleItemsArray,
          });

          return draft;
        }
      });

      res.status(200).json(saleDraft);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to save draft sale' });
    }
  }

  // Convert Draft to Confirmed Sale
  // async confirmDraftSale(req, res) {
  //   const { saleId } = req.params;
  //   const { paymentMethod, totalAmount, quantitySend, ...updateData } =
  //     req.body;

  //   try {
  //     // Validate required fields for confirmation
  //     if (!paymentMethod || !totalAmount || !quantitySend) {
  //       return res
  //         .status(400)
  //         .json({ error: 'Missing required fields for confirmation' });
  //     }

  //     const prisma = await this.tenantContextService.getPrismaClient();

  //     const sale = await prisma.$transaction(async (tx) => {
  //       // Fetch the draft sale
  //       const draftSale = await tx.salesDraft.findUnique({
  //         where: { id: saleId },
  //         include: { saleItems: true },
  //       });

  //       if (!draftSale) {
  //         throw new Error('Draft sale not found');
  //       }

  //       // Create a new confirmed sale
  //       const confirmedSale = await tx.sales.create({
  //         data: {
  //           ...updateData,
  //           customerPhoneNumber: draftSale.customerPhoneNumber,
  //           customerName: draftSale.customerName,
  //           customerMail: draftSale.customerMail,
  //           customerAddress: draftSale.customerAddress,
  //           customerCity: draftSale.customerCity,
  //           customerState: draftSale.customerState,
  //           customerCountry: draftSale.customerCountry,
  //           customerZipCode: draftSale.customerZipCode,
  //           customerStreet: draftSale.customerStreet,
  //           useCustomerAddress: draftSale.useCustomerAddress,
  //           subTotalAmount: draftSale.subTotalAmount,
  //           discount: draftSale.discount,
  //           paymentMethod,
  //           totalAmount,
  //           quantitySend,
  //           store: { connect: { id: draftSale.storeId } },
  //           client: { connect: { id: draftSale.clientId } },
  //           user: draftSale.userId
  //             ? { connect: { id: draftSale.userId } }
  //             : undefined,
  //           status: SaleStatus.CONFIRMED,
  //           saleItems: {
  //             create: draftSale.saleItems.map((item) => ({
  //               productId: item.productId,
  //               pluUpc: item.pluUpc,
  //               allowance: item.allowance,
  //               quantity: item.quantity,
  //               packType: item.packType,
  //               packId: item.packId,
  //             })),
  //           },
  //         },
  //         include: { saleItems: true },
  //       });

  //       // Delete the draft sale
  //       await tx.salesDraft.delete({
  //         where: { id: saleId },
  //       });

  //       return confirmedSale;
  //     });

  //     res.status(200).json(sale);
  //   } catch (error) {
  //     console.error(error);
  //     res.status(500).json({ error: 'Failed to confirm sale' });
  //   }
  // }

  // Fetch Draft Sales
  async getDraftSales(req, res) {
    const { userId, storeId, id } = req.query;
    const prisma = await this.tenantContextService.getPrismaClient();
    if (id) {
      try {
        const drafts = await prisma.salesDraft.findUnique({
          where: {
            id,
            userId,
            storeId,
          },
          include: { saleItems: true },
        });

        res.status(200).json(drafts);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch draft sales' });
      }
    } else {
      try {
        const drafts = await prisma.salesDraft.findMany({
          where: {
            userId,
            storeId,
          },
          include: { saleItems: true },
          orderBy: { updatedAt: 'desc' },
        });

        res.status(200).json(drafts);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch draft sales' });
      }
    }
  }

  // Delete Draft Sale
  async deleteDraftSale(
    draftId: string,
    storeId: string,
    tx?: any,
  ): Promise<void> {
    const prisma = tx || (await this.tenantContextService.getPrismaClient());

    try {
      const sale = await prisma.salesDraft.findUnique({
        where: {
          id: draftId,
          storeId: storeId,
        },
        include: { saleItems: true },
      });

      if (!sale) {
        console.log(`Draft sale with id ${draftId} not found`);
        return;
      }

      if (sale.saleItems && sale.saleItems.length > 0) {
        await prisma.salesDraftItems.deleteMany({
          where: { saleDraftId: draftId },
        });
      }

      await prisma.salesDraft.delete({
        where: { id: draftId },
      });
    } catch (error) {
      console.log(error);
      console.error(error);
      throw error; // Re-throw to allow proper error handling
    }
  }
}
