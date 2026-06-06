import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TenantContextService } from '../tenant/tenant-context.service';
import {
  CreateTaxTypeDto,
  UpdateTaxTypeDto,
  CreateTaxCodeDto,
  UpdateTaxCodeDto,
  CreateRegionDto,
  UpdateRegionDto,
  CreateTaxRateDto,
  UpdateTaxRateDto,
  CreateTaxAssignmentDto,
  UpdateTaxAssignmentDto,
  CreateTaxBundleDto,
  BulkAssignTaxDto,
  AssignTaxDto,
} from './dto';
import { UpdateTaxBundleDto } from './dto/update-tax-bundle.dto';
import { EntityType } from '@prisma/client';

@Injectable()
export class TaxService {
  constructor(private readonly tenantContext: TenantContextService) { }

  // --- TaxType CRUD ---
  async createTaxType(dto: CreateTaxTypeDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    const { clientId } = this.tenantContext.getTenantInfo() as { clientId: string };
    return prisma.taxType.create({ data: { ...dto, clientId } });
  }
  async getAllTaxTypes() {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxType.findMany();
  }
  async getTaxTypeById(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    const found = await prisma.taxType.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('TaxType not found');
    return found;
  }
  async updateTaxType(id: string, dto: UpdateTaxTypeDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxType.update({ where: { id }, data: dto });
  }
  async deleteTaxType(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxType.delete({ where: { id } });
  }

  // --- TaxCode CRUD ---
  async createTaxCode(dto: CreateTaxCodeDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    const { clientId } = this.tenantContext.getTenantInfo() as { clientId: string };
    return prisma.taxCode.create({ data: { ...dto, clientId } });
  }
  async getAllTaxCodes() {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxCode.findMany();
  }
  async getTaxCodeById(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    const found = await prisma.taxCode.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('TaxCode not found');
    return found;
  }
  async updateTaxCode(id: string, dto: UpdateTaxCodeDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxCode.update({ where: { id }, data: dto });
  }
  async deleteTaxCode(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxCode.delete({ where: { id } });
  }

  // --- Region CRUD ---
  async createRegion(dto: CreateRegionDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    const { clientId } = this.tenantContext.getTenantInfo() as { clientId: string };
    return prisma.region.create({ data: { ...dto, clientId } });
  }
  async getAllRegions() {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.region.findMany();
  }
  async getRegionById(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    const found = await prisma.region.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Region not found');
    return found;
  }
  async updateRegion(id: string, dto: UpdateRegionDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.region.update({ where: { id }, data: dto });
  }
  async deleteRegion(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.region.delete({ where: { id } });
  }

  // --- TaxRate CRUD ---
  async createTaxRate(dto: CreateTaxRateDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    const { clientId } = this.tenantContext.getTenantInfo() as { clientId: string };
    return prisma.taxRate.create({ data: { ...dto, clientId } });
  }

  async getAllTaxRates() {
    const prisma = await this.tenantContext.getPrismaClient();
    // Fetch all tax rates and their assignments, including entity
    const taxRates = await prisma.taxRate.findMany({
      select: {
        id: true,
        rate: true,
        rateType: true,
        effectiveFrom: true,
        effectiveTo: true,
        createdAt: true,
        updatedAt: true,
        assignments: {
          select: {
            id: true,
            entityId: true,
            entity: true,
            entityType: true,
            assignedAt: true,
          },
        },
        region: {
          select: { id: true, name: true, code: true, description: true },
        },
        taxType: {
          select: { id: true, name: true, description: true, payer: true },
        },
        taxCode: { select: { id: true, code: true, description: true } },
      },
    });
    return taxRates;
  }

  async getTaxRateById(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    // Fetch tax rate and assignments, including entity
    const found = await prisma.taxRate.findUnique({
      where: { id },
      select: {
        id: true,
        rate: true,
        rateType: true,
        effectiveFrom: true,
        effectiveTo: true,
        createdAt: true,
        updatedAt: true,
        assignments: {
          select: {
            id: true,
            entityId: true,
            entity: true,
            entityType: true,
            assignedAt: true,
          },
        },
        region: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
          },
        },
        taxType: {
          select: {
            id: true,
            name: true,
            description: true,
            payer: true,
          },
        },
        taxCode: {
          select: {
            id: true,
            code: true,
            description: true,
          },
        },
      },
    });
    if (!found) throw new NotFoundException('TaxRate not found');
    return found;
  }

  async updateTaxRate(id: string, dto: UpdateTaxRateDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxRate.update({ where: { id }, data: dto });
  }


  async deleteTaxRate(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxRate.delete({ where: { id } });
  }

  // --- TaxAssignment CRUD ---
  async createTaxAssignment(dto: CreateTaxAssignmentDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    const { clientId } = this.tenantContext.getTenantInfo() as { clientId: string };
    return prisma.taxAssignment.create({ data: { ...dto, clientId } });
  }

  async getAllTaxAssignments() {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxAssignment.findMany();
  }


  async getTaxAssignmentById(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    const found = await prisma.taxAssignment.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('TaxAssignment not found');
    return found;
  }
  async updateTaxAssignment(id: string, dto: UpdateTaxAssignmentDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxAssignment.update({ where: { id }, data: dto });
  }
  async deleteTaxAssignment(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxAssignment.delete({ where: { id } });
  }

  // --- Tax Bundle (Atomic Creation) ---
  /**
   * Atomically creates TaxType, TaxCode, and TaxRate in a single transaction.
   * All entities are linked appropriately. Throws BadRequestException if any step fails.
   * Checks for duplicate TaxType (by name) and TaxCode (by code) before creation.
   */
  async createTaxBundle(dto: CreateTaxBundleDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    const { clientId } = this.tenantContext.getTenantInfo();
    // Check for duplicate TaxType by name (scoped to this client)
    const existingType = await prisma.taxType.findFirst({
      where: { name: dto.taxType.name, clientId: clientId ?? undefined },
    });
    if (existingType) {
      throw new BadRequestException(
        `TaxType with name '${dto.taxType.name}' already exists.`,
      );
    }
    // Check for duplicate TaxCode by code (scoped to this client)
    const existingCode = await prisma.taxCode.findFirst({
      where: { code: dto.taxCode.code, clientId: clientId ?? undefined },
    });
    if (existingCode) {
      throw new BadRequestException(
        `TaxCode with code '${dto.taxCode.code}' already exists.`,
      );
    }
    try {
      return await prisma.$transaction(async (tx) => {
        // Create TaxType
        const taxType = await tx.taxType.create({ data: { ...dto.taxType, clientId: clientId! } });
        // Create TaxCode, link to TaxType
        const taxCode = await tx.taxCode.create({
          data: {
            ...dto.taxCode,
            clientId: clientId!,
            taxTypeId: taxType.id,
          },
        });
        // Create TaxRate, link to TaxCode (and region, if required by your schema)
        const taxRate = await tx.taxRate.create({
          data: {
            ...dto.taxRate,
            clientId: clientId!,
            taxCodeId: taxCode.id,
          },
        });
        return { taxType, taxCode, taxRate };
      });
    } catch (err) {
      throw new BadRequestException(
        'Failed to create tax bundle: ' + err.message,
      );
    }
  }

  /**
   * Atomically updates TaxType, TaxCode, and TaxRate in a single transaction by TaxCode ID.
   * Fails if any entity is missing.
   */
  async updateTaxBundle(taxCodeId: string, dto: UpdateTaxBundleDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    // Find TaxCode and related TaxType/TaxRate
    const taxCode = await prisma.taxCode.findUnique({
      where: { id: taxCodeId },
    });
    if (!taxCode) throw new NotFoundException('TaxCode not found');
    const taxType = await prisma.taxType.findUnique({
      where: { id: taxCode.taxTypeId },
    });
    if (!taxType) throw new NotFoundException('TaxType not found');
    const taxRate = await prisma.taxRate.findFirst({ where: { taxCodeId } });
    if (!taxRate) throw new NotFoundException('TaxRate not found');
    try {
      return await prisma.$transaction(async (tx) => {
        const updatedTaxType = await tx.taxType.update({
          where: { id: taxType.id },
          data: dto.taxType,
        });
        const updatedTaxCode = await tx.taxCode.update({
          where: { id: taxCodeId },
          data: dto.taxCode,
        });
        const updatedTaxRate = await tx.taxRate.update({
          where: { id: taxRate.id },
          data: dto.taxRate,
        });
        return {
          taxType: updatedTaxType,
          taxCode: updatedTaxCode,
          taxRate: updatedTaxRate,
        };
      });
    } catch (err) {
      throw new BadRequestException(
        'Failed to update tax bundle: ' + err.message,
      );
    }
  }

  /**
   * Atomically deletes TaxRate, TaxCode, and TaxType in a single transaction by TaxCode ID.
   * Fails if any entity is missing.
   */
  async deleteTaxBundle(taxCodeId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    // Find TaxCode and related TaxType/TaxRate
    const taxCode = await prisma.taxCode.findUnique({
      where: { id: taxCodeId },
    });
    if (!taxCode) throw new NotFoundException('TaxCode not found');
    const taxType = await prisma.taxType.findUnique({
      where: { id: taxCode.taxTypeId },
    });
    if (!taxType) throw new NotFoundException('TaxType not found');
    const taxRate = await prisma.taxRate.findFirst({ where: { taxCodeId } });
    if (!taxRate) throw new NotFoundException('TaxRate not found');
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.taxRate.delete({ where: { id: taxRate.id } });
        await tx.taxCode.delete({ where: { id: taxCodeId } });
        await tx.taxType.delete({ where: { id: taxType.id } });
        return { success: true };
      });
    } catch (err) {
      throw new BadRequestException(
        'Failed to delete tax bundle: ' + err.message,
      );
    }
  }

  /**
   * Bulk assign taxes to multiple entities (product, category, store, supplier, customer) in one call.
   */
  async bulkAssignTaxes(assignments: AssignTaxDto[]) {
    const prisma = await this.tenantContext.getPrismaClient();
    const { clientId } = this.tenantContext.getTenantInfo() as { clientId: string };
    // Validate input: ensure all required fields are present
    if (
      !assignments ||
      !Array.isArray(assignments) ||
      assignments.length === 0
    ) {
      throw new BadRequestException('No assignments provided');
    }
    // Create all assignments in a single transaction
    return prisma.taxAssignment.createMany({
      data: assignments.map((a) => ({
        entityType: a.entityType,
        entityId: a.entityId,
        clientId,
        taxRateId: a.taxRateId,
        entity: a.entity,
        assignedAt: new Date(),
      })),
    });
  }

  /**
   * Bulk update tax assignments in a single transaction.
   * Each item must include the assignment id and fields to update.
   * Returns array of updated assignments.
   */
  async replaceAssignmentsByTaxRate(
    taxRateId: string,
    assignments: {
      entityType: EntityType;
      entityId: string;
      entity?: object;
      assignedAt?: Date;
    }[]
  ) {
    const prisma = await this.tenantContext.getPrismaClient();
    const { clientId } = this.tenantContext.getTenantInfo() as { clientId: string };

    if (!taxRateId || !Array.isArray(assignments) || assignments.length === 0) {
      throw new BadRequestException('Tax rate ID and assignments are required');
    }

    // Start transaction
    return await prisma.$transaction(async (tx) => {
      // Delete all existing assignments for the taxRateId
      await tx.taxAssignment.deleteMany({
        where: { taxRateId },
      });

      // Insert new assignments
      const newAssignments = assignments.map((a) => ({
        entityType: a.entityType,
        entityId: a.entityId,
        clientId,
        entity: a.entity || {},
        assignedAt: a.assignedAt || new Date(),
        taxRateId,
      }));

      return tx.taxAssignment.createMany({
        data: newAssignments,
      });
    });
  }

}
