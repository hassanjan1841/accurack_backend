import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TenantContextService } from '../tenant/tenant-context.service';
import { SaleItemDto } from './dto/create-sale.dto';

@Injectable()
export class SaleValidationService {
  constructor(private tenantContext: TenantContextService) {}

  async validateSaleItems(
    saleItems: SaleItemDto[],
    storeId: string,
    clientId: string,
  ) {
    for (const item of saleItems) {
      await this.validateSaleItem(item, storeId, clientId);
    }
  }

  private async validateSaleItem(
    saleItem: SaleItemDto,
    storeId: string,
    clientId: string,
  ) {
    // 1. Get product with all details
    const product = await this.getProductWithValidation(
      saleItem.productId,
      storeId,
      clientId,
      saleItem.pluUpc,
    );

    // 2. Validate minimum selling quantity (CRITICAL REQUIREMENT)
    await this.validateMinimumSellingQuantity(saleItem, product);

    // 3. Validate inventory availability
    await this.validateInventoryAvailability(saleItem, product);

    // 4. Validate pack requirements if applicable
    if (saleItem.packType === 'BOX') {
      await this.validatePackRequirements(saleItem, product);
    }

    return product;
  }

  async getProductWithValidation(
    productId: string,
    storeId: string,
    clientId: string,
    pluUpc: string | undefined,
  ) {
    const prisma = await this.tenantContext.getPrismaClient();

    let product: any = null;
    if (productId) {
      product = await prisma.products.findFirst({
        where: {
          id: productId,
          storeId,
          clientId,
        },
        include: {
          packs: true,
          productSuppliers: {
            include: {
              supplier: true,
            },
          },
        },
      });
    } else {
      // Use raw SQL for complex JSON array queries that Prisma doesn't support well
      // Since variants is Json[] (array of JSON objects), we need to use unnest() function
      const productsWithVariants: any = await prisma.$queryRaw`
        SELECT p.* FROM "Products" p 
        WHERE (p."storeId" = ${storeId} AND p."clientId" = ${clientId})
        AND (
          p."pluUpc" = ${pluUpc} 
          OR EXISTS (
            SELECT 1 FROM unnest(p.variants) AS variant 
            WHERE variant::jsonb->>'pluUpc' = ${pluUpc}
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
            productSuppliers: {
              include: {
                supplier: true,
              },
            },
          },
        });
      }
    }

    if (!product) {
      throw new NotFoundException(
        `Product with pluUpc ${pluUpc} not found in this store`,
      );
    }

    return product;
  }

  private async validateMinimumSellingQuantity(
    saleItem: SaleItemDto,
    product: any,
  ) {
    console.log(saleItem);
    // CORRECTED: Only validate minimum quantity for ITEM sales, not pack sales
    if (saleItem.packType === 'ITEM') {
      // For single items, validate against product.minimumSellingQuantity
      if (saleItem.quantity < product.minimumSellingQuantity) {
        throw new BadRequestException(
          `Minimum selling quantity for ${product.name} is ${product.minimumSellingQuantity} items. Requested: ${saleItem.quantity} items`,
        );
      }
    }
    // For pack sales (BOX), no minimum validation - customer can buy any number of packs
    // pack.minimumSellingQuantity represents items per pack, not minimum packs to sell
  }

  private async validateInventoryAvailability(
    saleItem: SaleItemDto,
    product: any,
  ) {
    if (product.hasVariants) {
      // Variant product validation
      await this.validateVariantInventory(saleItem, product);
    } else {
      // Non-variant product validation
      await this.validateNonVariantInventory(saleItem, product);
    }
  }

  private async validateNonVariantInventory(
    saleItem: SaleItemDto,
    product: any,
  ) {
    if (saleItem.packType === 'ITEM') {
      // Non-variant single items - check itemQuantity
      if (saleItem.quantity > product.itemQuantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}. Available: ${product.itemQuantity}, Requested: ${saleItem.quantity}`,
        );
      }
    } else if (saleItem.packType === 'BOX') {
      // Non-variant packs - check pack totalPacksQuantity
      const pack = await this.validatePackRequirements(saleItem, product)

      if (!pack) {
        throw new BadRequestException(
          `Pack with ID ${saleItem.packId} not found for product ${product.name}`,
        );
      }

      if (saleItem.quantity > pack.totalPacksQuantity) {
        throw new BadRequestException(
          `Insufficient pack stock for ${product.name}. Available packs: ${pack.totalPacksQuantity}, Requested: ${saleItem.quantity}`,
        );
      }
    }
  }

  private async validateVariantInventory(saleItem: SaleItemDto, product: any) {
    // Find the specific variant
    const variant = product.variants.find(
      (v: any) => v.pluUpc === saleItem.pluUpc,
    );

    if (!variant) {
      throw new BadRequestException(
        `Variant with PLU/UPC ${saleItem.pluUpc} not found for product ${product.name}`,
      );
    }

    if (saleItem.packType === 'ITEM') {
      // Variant single items - check variant quantity
      if (saleItem.quantity > variant.quantity) {
        throw new BadRequestException(
          `Insufficient variant stock for ${product.name} (${variant.name || saleItem.pluUpc}). Available: ${variant.quantity}, Requested: ${saleItem.quantity}`,
        );
      }
    } else if (saleItem.packType === 'BOX') {
      // Variant packs - check variant totalPacksQuantity
      if (saleItem.quantity > variant.totalPacksQuantity) {
        throw new BadRequestException(
          `Insufficient variant pack stock for ${product.name} (${variant.name || saleItem.pluUpc}). Available packs: ${variant.totalPacksQuantity}, Requested: ${saleItem.quantity}`,
        );
      }
    }
  }

  async validatePackRequirements(saleItem: SaleItemDto, product: any) {
    if (!product?.packs?.length) {
      throw new BadRequestException(
        `Product ${product?.name ?? ''} has no packs configured`,
      );
    }

    // Case 1: Both packId and packOf missing
    if (!saleItem.packId && !saleItem.packOf) {
      throw new BadRequestException(
        `Either Pack ID or Pack Of must be provided`,
      );
    }

    let pack: any = null;

    // Case 2: Try finding by packId first
    if (saleItem.packId) {
      pack = product.packs.find(
        (p) => String(p.id).trim() === String(saleItem.packId).trim(),
      );

      if (!pack) {
        throw new BadRequestException(
          `Pack ID "${saleItem.packId}" is not valid for product "${product.name}"`,
        );
      }
    }

    // Case 3: If no packId match, try packOf
    if (
      !pack &&
      saleItem.packOf !== undefined &&
      !isNaN(Number(saleItem.packOf))
    ) {
      pack = product.packs.find(
        (p) => p.minimumSellingQuantity === Number(saleItem.packOf),
      );

      if (!pack) {
        throw new BadRequestException(
          `Pack Of "${saleItem.packOf}" is not valid for product "${product.name}"`,
        );
      }
    }

    // Final check
    if (!pack) {
      throw new BadRequestException(
        `Pack configuration not found for product "${product.name}"`,
      );
    }

    return pack; // return the found pack so you don’t need to re-query later
  }

  async validateStoreAndClient(storeId: string, clientId: string) {
    const prisma = await this.tenantContext.getPrismaClient();

    const store = await prisma.stores.findFirst({
      where: {
        id: storeId,
        clientId,
      },
    });

    if (!store) {
      throw new BadRequestException(
        'Store not found or does not belong to this client',
      );
    }

    return store;
  }

  async validateSaleExists(saleId: string, storeId: string) {
    const prisma = await this.tenantContext.getPrismaClient();

    const sale = await prisma.sales.findFirst({
      where: {
        id: saleId,
        storeId,
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found in this store');
    }

    return sale;
  }
}
