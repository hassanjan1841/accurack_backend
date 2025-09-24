import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantContextService } from '../tenant/tenant-context.service';
import { SaleItemDto } from './dto/create-sale.dto';
import { SaleValidationService } from './sale-validation.service';

@Injectable()
export class SalePricingService {
  constructor(
    private tenantContext: TenantContextService,
    private saleValidationService: SaleValidationService,
  ) {}

  async calculateSaleItemPricing(saleItem: SaleItemDto, product: any) {
    let basePrice = 0;
    let costPrice = 0;

    if (product.hasVariants) {
      const variant = product.variants.find(
        (v: any) => v.pluUpc === saleItem.pluUpc,
      );
      if (variant) {
        basePrice =
          saleItem.packType === 'ITEM'
            ? variant.price
            : this.getPackPrice(product, saleItem.packId, saleItem.packOf);

        costPrice =
          saleItem.packType !== 'ITEM'
            ? this.getItemsQuantityInPack(
                product,
                saleItem.packId,
                saleItem.packOf,
              ) * variant.costPrice
            : variant.costPrice;
      }
    } else {
      basePrice =
        saleItem.packType === 'ITEM'
          ? product.singleItemSellingPrice
          : this.getPackPrice(product, saleItem.packId, saleItem.packOf);

      costPrice =
        saleItem.packType !== 'ITEM'
          ? this.getItemsQuantityInPack(
              product,
              saleItem.packId,
              saleItem.packOf,
            ) * product.singleItemCostPrice
          : product.singleItemCostPrice;
    }

    // console.log(saleItem.allowance, saleItem)

    // Apply discounts using the formula from documentation
    // Formula: (price * quantity) * (1 - percentDiscount/100) - discountAmount
    const subtotal = basePrice * saleItem.quantity;
    const percentDiscountAmount = subtotal * (product.percentDiscount / 100);
    const totalPrice =
      subtotal -
      percentDiscountAmount -
      product.discountAmount -
      (saleItem.allowance ?? 0);

    // Calculate profit: (sellingPrice - costPrice) * quantity - discounts - allowance
    const baseProfitPerItem = basePrice - costPrice;
    const totalBaseProfit = baseProfitPerItem * saleItem.quantity;
    const itemProfit =
      totalBaseProfit -
      percentDiscountAmount -
      product.discountAmount -
      (saleItem.allowance ?? 0);

    return {
      sellingPrice: basePrice,
      totalPrice: Math.max(totalPrice, 0), // Ensure no negative prices
      profit: itemProfit,
      costPrice,
    };
  }

  private getPackPrice(product: any, packId?: string, packOf?: number): number {
    if (!product?.packs?.length) return 0;

    // 1. Try to find by packId first (strict match)
    if (packId) {
      const packById = product.packs.find(
        (p) => String(p.id).trim() === String(packId).trim(),
      );
      if (packById) return packById.orderedPacksPrice ?? 0;
    }

    // 2. Fallback: try to find by packOf
    if (packOf !== undefined && !isNaN(Number(packOf))) {
      const packByQuantity = product.packs.find(
        (p) => p.minimumSellingQuantity === Number(packOf),
      );
      if (packByQuantity) return packByQuantity.orderedPacksPrice ?? 0;
    }

    // 3. Default
    return 0;
  }

  private getItemsQuantityInPack(
    product: {
      packs?: { id: string | number; minimumSellingQuantity: number }[];
    },
    packId?: string,
    packOf?: number,
  ): number {
    if (!product?.packs?.length) return 0;

    // 1. Try to find by packId first
    if (packId) {
      const packById = product.packs.find(
        (p) => String(p.id).trim() === String(packId).trim(),
      );
      if (packById) return packById.minimumSellingQuantity;
    }

    // 2. Fallback: try to find by packOf
    if (packOf !== undefined && !isNaN(Number(packOf))) {
      const packByQuantity = product.packs.find(
        (p) => p.minimumSellingQuantity === Number(packOf),
      );
      if (packByQuantity) return packByQuantity.minimumSellingQuantity;
    }

    // 3. Default
    return 0;
  }

  private getSupplierCostPrice(product: any): number {
    // Get primary supplier cost price
    const primarySupplier = product.productSuppliers.find(
      (ps: any) => ps.state === 'primary',
    );
    return primarySupplier?.costPrice || 0;
  }

  async calculateTotalSaleAmount(
    saleItems: SaleItemDto[],
    products: any[],
  ): Promise<{
    subtotal: number;
    totalProfit: number;
    saleItemsWithPricing: any[];
  }> {
    let subtotal = 0;
    let totalProfit = 0;
    const saleItemsWithPricing: any[] = [];

    for (const saleItem of saleItems) {
      const product = products.find(
        (p) =>
          p.pluUpc === saleItem.pluUpc ||
          (p.variants && p.variants.some((v) => v.pluUpc === saleItem.pluUpc)),
      );
      const pack = products.find(
        (p) => p.packs && p.packs.minimumSellingQuantity === saleItem.packOf,
      );
      if (!product) continue;

      const pricing = await this.calculateSaleItemPricing(saleItem, product);

      subtotal += pricing.totalPrice;
      totalProfit += pricing.profit;

      // Get supplier information for logging
      const supplier = this.getSupplierInfo(product);

      saleItemsWithPricing.push({
        productId: product.id,
        pluUpc: saleItem.pluUpc || product.pluUpc || '',
        productName: product.name,
        quantity: saleItem.quantity,
        allowance: saleItem.allowance,
        sellingPrice: pricing.sellingPrice,
        totalPrice: pricing.totalPrice,
        packType: saleItem.packType,
        packId: pack?.id,
        supplier,
      });
    }

    return {
      subtotal,
      totalProfit,
      saleItemsWithPricing,
    };
  }

  private getSupplierInfo(product: any) {
    const primarySupplier = product.productSuppliers.find(
      (ps: any) => ps.state === 'primary',
    );

    if (primarySupplier?.supplier) {
      return {
        id: primarySupplier.supplier.id,
        name: primarySupplier.supplier.name,
      };
    }

    // Fallback to any supplier if no primary found
    const anySupplier = product.productSuppliers[0]?.supplier;
    return anySupplier
      ? {
          id: anySupplier.id,
          name: anySupplier.name,
        }
      : null;
  }

  calculateFinalAmount(
    subtotal: number,
    tax: number = 0,
    allowance: number = 0,
  ): number {
    let taxAmount = subtotal * (tax / 100);
    return Math.max(subtotal + taxAmount - allowance, 0);
  }

  async getProductsForSale(
    saleItems: SaleItemDto[],
    storeId: string,
    clientId: string,
  ) {
    try {
      const productPromises = saleItems.map(async (item) => {
        return await this.saleValidationService.getProductWithValidation(
          item.productId,
          storeId,
          clientId,
          item.pluUpc,
        );
      });

      const products = await Promise.all(productPromises);
      return products;
    } catch (error) {
      throw new BadRequestException(
        'Failed to retrieve one or more products for sale',
      );
    }
  }
}
