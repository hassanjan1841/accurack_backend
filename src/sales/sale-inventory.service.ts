import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '../tenant/tenant-context.service';
import { SaleItemDto } from './dto/create-sale.dto';
import { ReturnItemDto } from './dto/create-sale-return.dto';
import { SaleValidationService } from './sale-validation.service';

@Injectable()
export class SaleInventoryService {
  constructor(private tenantContext: TenantContextService, private saleValidationService: SaleValidationService) {}

  async updateInventoryForSale(saleItems: SaleItemDto[], operation: 'DECREMENT' | 'INCREMENT', storeId: string, clientId: string) {
    for (const item of saleItems) {
      await this.updateItemInventory(item, operation, storeId, clientId);
    }
  }

  private async updateItemInventory(item: SaleItemDto, operation: 'DECREMENT' | 'INCREMENT', storeId: string, clientId: string) {
    const prisma = await this.tenantContext.getPrismaClient();

       let product: any = null;
        if (item.productId) {
          product = await prisma.products.findFirst({
            where: {
              id: item.productId,
              storeId,
              clientId,
            },
            include: {
              packs: true,
            },
          });
        } else {
          // Use raw SQL for complex JSON array queries that Prisma doesn't support well
          // Since variants is Json[] (array of JSON objects), we need to use unnest() function
          const productsWithVariants: any = await prisma.$queryRaw`
            SELECT p.* FROM "Products" p 
            WHERE (p."storeId" = ${storeId} AND p."clientId" = ${clientId})
            AND (
              p."pluUpc" = ${item.pluUpc} 
              OR EXISTS (
                SELECT 1 FROM unnest(p.variants) AS variant 
                WHERE variant::jsonb->>'pluUpc' = ${item.pluUpc}
              )
            )
            LIMIT 1
          `;
    
          if (productsWithVariants.length > 0) {
            // Get the full product with relations
            product = await prisma.products.findFirst({
              where: {
                id: (productsWithVariants[0] as any).id,
              },
              include: {
                packs: true,
              },
            });
          }
        }
    
        if (!product) {
          throw new NotFoundException(
            `Product with pluUpc ${item.pluUpc} not found in this store`,
          );
        }

    const multiplier = operation === 'DECREMENT' ? -1 : 1;
    const quantityChange = item.quantity * multiplier;

    if (product.hasVariants) {
      await this.updateVariantInventory(prisma, product, item, quantityChange);
    } else {
      await this.updateNonVariantInventory(prisma, product, item, quantityChange);
    }
  }

  private async updateNonVariantInventory(prisma: any, product: any, item: SaleItemDto, quantityChange: number) {
    if (item.packType === 'ITEM') {
      // Update itemQuantity for single items
      await prisma.products.update({
        where: { id: product.id },
        data: {
          itemQuantity: {
            increment: quantityChange,
          },
        },
      });
    } else if (item.packType === 'BOX') {
      // Update pack totalPacksQuantity for pack sales
      // quantityChange = number of packs sold/returned
      // pack.minimumSellingQuantity = items per pack (e.g., 6 bottles per pack)
      const pack = await this.saleValidationService.validatePackRequirements(item, product)
      await prisma.pack.update({
        where: { id: pack.id },
        data: {
          totalPacksQuantity: {
            increment: quantityChange,
          },
        },
      });
      // Note: product.itemQuantity is NOT affected by pack sales
      // Pack sales only reduce pack count, not individual item count
    }
  }

  private async updateVariantInventory(prisma: any, product: any, item: SaleItemDto, quantityChange: number) {
    const variants = [...product.variants];
    const variantIndex = variants.findIndex((v: any) => v.pluUpc === item.pluUpc);
    
    if (variantIndex === -1) return;

    const variant = variants[variantIndex];

    if (item.packType === 'ITEM') {
      // Update variant quantity for single items
      variant.quantity = (variant.quantity || 0) + quantityChange;
      variant.individualItemQuantity = (variant.individualItemQuantity || 0) + quantityChange;
    } else if (item.packType === 'BOX') {
      // Update variant totalPacksQuantity for pack sales
      // quantityChange = number of packs sold/returned
      variant.totalPacksQuantity = (variant.totalPacksQuantity || 0) + quantityChange;
      
      const pack = await this.saleValidationService.validatePackRequirements(item,product)
      // pack.totalPacksQuantity = pack.totalPacksQuantity +  quantityChange;

      await prisma.pack.update({
        where: { id: pack.id },
        data: {
          totalPacksQuantity: {
            increment: quantityChange,
          },
        },
      });

      
      // CORRECTED: Also update variant.quantity to reflect total items in packs
      // Find pack to get items per pack (pack.minimumSellingQuantity = items per pack)
      if (pack && pack.minimumSellingQuantity) {
        const itemsInPacks = quantityChange * pack.minimumSellingQuantity;
        variant.quantity = (variant.quantity || 0) + itemsInPacks;
      }
    }

    variants[variantIndex] = variant;

    await prisma.products.update({
      where: { id: product.id },
      data: {
        variants: variants,
      },
    });
  }

  async restoreInventoryForReturn(returnItems: ReturnItemDto[]) {
    for (const returnItem of returnItems) {
      // Only restore inventory if product is physically returned
      if (returnItem.isProductReturned) {
        await this.handleReturnInventoryRestoration(returnItem);
      }
    }
  }

  private async handleReturnInventoryRestoration(returnItem: ReturnItemDto) {
    // Restore inventory based on return category
    switch (returnItem.returnCategory) {
      case 'SALEABLE':
      case 'SCRAP':
        // Both categories restore inventory (SCRAP for tracking purposes)
        await this.restoreItemInventory(returnItem);
        break;
      case 'NON_SALEABLE':
        // No inventory restoration - item is completely written off
        break;
    }
  }

  private async restoreItemInventory(returnItem: ReturnItemDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    
    const product = await prisma.products.findUnique({
      where: { id: returnItem.productId },
      include: { packs: true },
    });

    if (!product) return;

    if (product.hasVariants) {
      await this.restoreVariantInventory(prisma, product, returnItem);
    } else {
      await this.restoreNonVariantInventory(prisma, product, returnItem);
    }
  }

  private async restoreNonVariantInventory(prisma: any, product: any, returnItem: ReturnItemDto) {
    if (returnItem.packType === 'ITEM') {
      // Restore itemQuantity
      await prisma.products.update({
        where: { id: product.id },
        data: {
          itemQuantity: {
            increment: returnItem.quantity,
          },
        },
      });
    } else if (returnItem.packType === 'BOX') {
      // Restore pack totalPacksQuantity
      await prisma.pack.update({
        where: { id: returnItem.packId },
        data: {
          totalPacksQuantity: {
            increment: returnItem.quantity,
          },
        },
      });
    }
  }

  private async restoreVariantInventory(prisma: any, product: any, returnItem: ReturnItemDto) {
    const variants = [...product.variants];
    const variantIndex = variants.findIndex((v: any) => v.pluUpc === returnItem.pluUpc);
    
    if (variantIndex === -1) return;

    const variant = variants[variantIndex];

    if (returnItem.packType === 'ITEM') {
      // Restore variant quantity and individualItemQuantity
      variant.quantity = (variant.quantity || 0) + returnItem.quantity;
      variant.individualItemQuantity = (variant.individualItemQuantity || 0) + returnItem.quantity;
    } else if (returnItem.packType === 'BOX') {
      // Restore variant totalPacksQuantity
      variant.totalPacksQuantity = (variant.totalPacksQuantity || 0) + returnItem.quantity;
      
      // Also restore variant.quantity for items in returned packs
      const pack = product.packs.find((p: any) => p.id === returnItem.packId);
      if (pack && pack.minimumSellingQuantity) {
        const itemsInPacks = returnItem.quantity * pack.minimumSellingQuantity;
        variant.quantity = (variant.quantity || 0) + itemsInPacks;
      }
    }

    variants[variantIndex] = variant;

    await prisma.products.update({
      where: { id: product.id },
      data: {
        variants: variants,
      },
    });
  }
}
