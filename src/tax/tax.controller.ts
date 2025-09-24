import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
} from '@nestjs/common';
import { EntityType } from '@prisma/client';
import { TaxService } from './tax.service';
import { TaxCalculationService } from './services/tax-calculation.service';
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
  UpdateBulkTaxAssignmentsDto,
} from './dto';
import { UpdateTaxBundleDto } from './dto/update-tax-bundle.dto';
import { CalculateTaxByEntityDto, CalculateComprehensiveTaxDto } from './dto/calculate-tax.dto';
import { ResponseService, BaseAuthController, RequirePermissions, PermissionResource, PermissionAction, PermissionScope } from '../common';
import { ApiTags } from '@nestjs/swagger';
import { BulkAssignTaxDto } from './dto';
import { TaxEndpoint } from './decorators/tax-endpoint.decorator';

@ApiTags('tax')
@Controller('tax')
export class TaxController extends BaseAuthController {
  constructor(
    private readonly taxService: TaxService,
    private readonly taxCalculationService: TaxCalculationService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }

  // --- TaxType Endpoints ---
  @Post('type')
  @RequirePermissions(PermissionResource.TAX_TYPE, PermissionAction.CREATE, PermissionScope.STORE)
  async createTaxType(@Body() dto: CreateTaxTypeDto) {
    return this.handleServiceOperation(
      () => this.taxService.createTaxType(dto),
      'TaxType created successfully',
      201,
    );
  }

  @Get('type')
  @RequirePermissions(PermissionResource.TAX_TYPE, PermissionAction.READ, PermissionScope.STORE)
  async getAllTaxTypes() {
    return this.handleServiceOperation(
      () => this.taxService.getAllTaxTypes(),
      'TaxTypes retrieved successfully',
    );
  }

  @Get('type/:id')
  @RequirePermissions(PermissionResource.TAX_TYPE, PermissionAction.READ, PermissionScope.STORE)
  async getTaxTypeById(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.getTaxTypeById(id),
      'TaxType retrieved successfully',
    );
  }

  @Put('type/:id')
  @RequirePermissions(PermissionResource.TAX_TYPE, PermissionAction.UPDATE, PermissionScope.STORE)
  async updateTaxType(@Param('id') id: string, @Body() dto: UpdateTaxTypeDto) {
    return this.handleServiceOperation(
      () => this.taxService.updateTaxType(id, dto),
      'TaxType updated successfully',
    );
  }

  @Delete('type/:id')
  @RequirePermissions(PermissionResource.TAX_TYPE, PermissionAction.DELETE, PermissionScope.STORE)
  async deleteTaxType(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.deleteTaxType(id),
      'TaxType deleted successfully',
    );
  }

  // --- TaxCode Endpoints ---
  @Post('code')
  @RequirePermissions(PermissionResource.TAX_CODE, PermissionAction.CREATE, PermissionScope.STORE)
  async createTaxCode(@Body() dto: CreateTaxCodeDto) {
    return this.handleServiceOperation(
      () => this.taxService.createTaxCode(dto),
      'TaxCode created successfully',
      201,
    );
  }

  @Get('code')
  @RequirePermissions(PermissionResource.TAX_CODE, PermissionAction.READ, PermissionScope.STORE)
  async getAllTaxCodes() {
    return this.handleServiceOperation(
      () => this.taxService.getAllTaxCodes(),
      'TaxCodes retrieved successfully',
    );
  }

  @Get('code/:id')
  @RequirePermissions(PermissionResource.TAX_CODE, PermissionAction.READ, PermissionScope.STORE)
  async getTaxCodeById(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.getTaxCodeById(id),
      'TaxCode retrieved successfully',
    );
  }

  @Put('code/:id')
  @RequirePermissions(PermissionResource.TAX_CODE, PermissionAction.UPDATE, PermissionScope.STORE)
  async updateTaxCode(@Param('id') id: string, @Body() dto: UpdateTaxCodeDto) {
    return this.handleServiceOperation(
      () => this.taxService.updateTaxCode(id, dto),
      'TaxCode updated successfully',
    );
  }

  @Delete('code/:id')
  @RequirePermissions(PermissionResource.TAX_CODE, PermissionAction.DELETE, PermissionScope.STORE)
  async deleteTaxCode(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.deleteTaxCode(id),
      'TaxCode deleted successfully',
    );
  }

  // --- Region Endpoints ---
  @Post('region')
  @RequirePermissions(PermissionResource.REGION, PermissionAction.CREATE, PermissionScope.STORE)
  async createRegion(@Body() dto: CreateRegionDto) {
    return this.handleServiceOperation(
      () => this.taxService.createRegion(dto),
      'Region created successfully',
      201,
    );
  }

  @Get('region')
  @RequirePermissions(PermissionResource.REGION, PermissionAction.READ, PermissionScope.STORE)
  async getAllRegions() {
    return this.handleServiceOperation(
      () => this.taxService.getAllRegions(),
      'Regions retrieved successfully',
    );
  }

  @Get('region/:id')
  @RequirePermissions(PermissionResource.REGION, PermissionAction.READ, PermissionScope.STORE)
  async getRegionById(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.getRegionById(id),
      'Region retrieved successfully',
    );
  }

  @Put('region/:id')
  @RequirePermissions(PermissionResource.REGION, PermissionAction.UPDATE, PermissionScope.STORE)
  async updateRegion(@Param('id') id: string, @Body() dto: UpdateRegionDto) {
    return this.handleServiceOperation(
      () => this.taxService.updateRegion(id, dto),
      'Region updated successfully',
    );
  }

  @Delete('region/:id')
  @RequirePermissions(PermissionResource.REGION, PermissionAction.DELETE, PermissionScope.STORE)
  async deleteRegion(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.deleteRegion(id),
      'Region deleted successfully',
    );
  }

  // --- TaxRate Endpoints ---
  @Post('rate')
  @RequirePermissions(PermissionResource.TAX_RATE, PermissionAction.CREATE, PermissionScope.STORE)
  async createTaxRate(@Body() dto: CreateTaxRateDto) {
    return this.handleServiceOperation(
      () => this.taxService.createTaxRate(dto),
      'TaxRate created successfully',
      201,
    );
  }

  @Get('rate')
  @RequirePermissions(PermissionResource.TAX_RATE, PermissionAction.READ, PermissionScope.STORE)
  async getAllTaxRates() {
    return this.handleServiceOperation(
      () => this.taxService.getAllTaxRates(),
      'TaxRates retrieved successfully',
    );
  }

  @Get('rate/:id')
  @RequirePermissions(PermissionResource.TAX_RATE, PermissionAction.READ, PermissionScope.STORE)
  async getTaxRateById(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.getTaxRateById(id),
      'TaxRate retrieved successfully',
    );
  }

  @Put('rate/:id')
  @RequirePermissions(PermissionResource.TAX_RATE, PermissionAction.UPDATE, PermissionScope.STORE)
  async updateTaxRate(@Param('id') id: string, @Body() dto: UpdateTaxRateDto) {
    return this.handleServiceOperation(
      () => this.taxService.updateTaxRate(id, dto),
      'TaxRate updated successfully',
    );
  }

  @Delete('rate/:id')
  @RequirePermissions(PermissionResource.TAX_RATE, PermissionAction.DELETE, PermissionScope.STORE)
  async deleteTaxRate(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.deleteTaxRate(id),
      'TaxRate deleted successfully',
    );
  }

  // --- TaxAssignment Endpoints ---
  @Post('assignment')
  @RequirePermissions(PermissionResource.TAX_ASSIGNMENT, PermissionAction.CREATE, PermissionScope.STORE)
  async createTaxAssignment(@Body() dto: CreateTaxAssignmentDto) {
    return this.handleServiceOperation(
      () => this.taxService.createTaxAssignment(dto),
      'TaxAssignment created successfully',
      201,
    );
  }

  @Get('assignment')
  @RequirePermissions(PermissionResource.TAX_ASSIGNMENT, PermissionAction.READ, PermissionScope.STORE)
  async getAllTaxAssignments() {
    return this.handleServiceOperation(
      () => this.taxService.getAllTaxAssignments(),
      'TaxAssignments retrieved successfully',
    );
  }

  @Get('assignment/:id')
  @RequirePermissions(PermissionResource.TAX_ASSIGNMENT, PermissionAction.READ, PermissionScope.STORE)
  async getTaxAssignmentById(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.getTaxAssignmentById(id),
      'TaxAssignment retrieved successfully',
    );
  }

  @Put('assignment/:id')
  @RequirePermissions(PermissionResource.TAX_ASSIGNMENT, PermissionAction.UPDATE, PermissionScope.STORE)
  async updateTaxAssignment(
    @Param('id') id: string,
    @Body() dto: UpdateTaxAssignmentDto,
  ) {
    return this.handleServiceOperation(
      () => this.taxService.updateTaxAssignment(id, dto),
      'TaxAssignment updated successfully',
    );
  }

  @Delete('assignment/:id')
  @RequirePermissions(PermissionResource.TAX_ASSIGNMENT, PermissionAction.DELETE, PermissionScope.STORE)
  async deleteTaxAssignment(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.deleteTaxAssignment(id),
      'TaxAssignment deleted successfully',
    );
  }

  // --- TaxBundle Endpoints ---
  @Post('bundle')
  @RequirePermissions(PermissionResource.TAX_BUNDLE, PermissionAction.CREATE, PermissionScope.STORE)
  async createTaxBundle(@Body() dto: CreateTaxBundleDto) {
    return this.handleServiceOperation(
      () => this.taxService.createTaxBundle(dto),
      'Tax bundle created successfully',
      201,
    );
  }

  @Put('bundle/:taxCodeId')
  @RequirePermissions(PermissionResource.TAX_BUNDLE, PermissionAction.UPDATE, PermissionScope.STORE)
  async updateTaxBundle(
    @Param('taxCodeId') taxCodeId: string,
    @Body() dto: UpdateTaxBundleDto,
  ) {
    return this.handleServiceOperation(
      () => this.taxService.updateTaxBundle(taxCodeId, dto),
      'Tax bundle updated successfully',
    );
  }

  @Delete('bundle/:taxCodeId')
  @RequirePermissions(PermissionResource.TAX_BUNDLE, PermissionAction.DELETE, PermissionScope.STORE)
  async deleteTaxBundle(@Param('taxCodeId') taxCodeId: string) {
    return this.handleServiceOperation(
      () => this.taxService.deleteTaxBundle(taxCodeId),
      'Tax bundle deleted successfully',
    );
  }

  /**
   * Bulk assign taxes to multiple entities (product, category, store, supplier) in one call.
   */
  @Post('assign/bulk')
  @RequirePermissions(PermissionResource.TAX_ASSIGNMENT, PermissionAction.CREATE, PermissionScope.STORE)
  async bulkAssignTaxes(@Body() dto: BulkAssignTaxDto) {
    // Swagger: Bulk create assignments
    // Each assignment should NOT include id
    return this.handleServiceOperation(
      () => this.taxService.bulkAssignTaxes(dto.assignments),
      'Taxes assigned successfully',
      201,
    );
  }

  @Put('assign/bulk-by-taxrate')
  @RequirePermissions(PermissionResource.TAX_ASSIGNMENT, PermissionAction.UPDATE, PermissionScope.STORE)
  async bulkReplaceAssignmentsForTaxRate(@Body() dto: UpdateBulkTaxAssignmentsDto) {
    return this.handleServiceOperation(
      () => this.taxService.replaceAssignmentsByTaxRate(dto.taxRateId, dto.assignments),
      'Assignments replaced successfully'
    );
  }

  // --- Tax Calculation Endpoints ---
  @TaxEndpoint.CalculateByEntity(CalculateTaxByEntityDto)
  @Post('calculate/entity')
  @RequirePermissions(PermissionResource.TAX_CALCULATION, PermissionAction.READ, PermissionScope.STORE)
  async calculateTaxByEntity(@Body() dto: CalculateTaxByEntityDto) {
    return this.handleServiceOperation(
      () => this.taxCalculationService.calculateTaxByEntity(dto),
      'Tax calculated successfully',
    );
  }

  @TaxEndpoint.CalculateComprehensive(CalculateComprehensiveTaxDto)
  @Post('calculate/comprehensive')
  @RequirePermissions(PermissionResource.TAX_CALCULATION, PermissionAction.READ, PermissionScope.STORE)
  async calculateComprehensiveTax(@Body() dto: CalculateComprehensiveTaxDto) {
    return this.handleServiceOperation(
      () => this.taxCalculationService.calculateComprehensiveTax(dto),
      'Tax calculated successfully',
    );
  }

  @TaxEndpoint.GetTaxAssignments()
  @Get('assignments/:entityType/:entityId')
  @RequirePermissions(PermissionResource.TAX_CALCULATION, PermissionAction.READ, PermissionScope.STORE)
  async getTaxAssignmentsByEntity(
    @Param('entityType') entityType: EntityType,
    @Param('entityId') entityId: string,
  ) {
    return this.handleServiceOperation(
      () => this.taxCalculationService.getTaxAssignmentsByEntity(entityType, entityId),
      'Tax assignments retrieved successfully',
    );
  }
}
