import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { SaleReturnService } from './sale-return.service';
import { CustomerBalanceService } from './customer-balance.service';
import { SaleHistoryService } from './sale-history.service';
import { StatusManagementService } from './status-management.service';
import {
  OrderProcessingService,
  OrderProcessingUser,
} from './order-processing.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import {
  CreateSaleReturnDto,
  QueryReturnSalesDto,
} from './dto/create-sale-return.dto';
import {
  AddInitialBalanceDto,
  CreatePaymentDto,
} from './dto/create-payment.dto';
import { BulkAssignDriverDto } from './dto/bulk-assign-driver.dto';
import { ChangeSaleStatusDto } from './dto/change-sale-status.dto';
import { UpdateOrderProcessingDto } from './dto/update-order-processing.dto';
import { ValidateOrderProcessingDto } from './dto/validate-order-processing.dto';
import { QueryOrderProcessingDto } from './dto/query-order-processing.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { QuerySalesHistoryDto } from './dto/query-sales-history.dto';
import { SalesEndpoint } from './decorators/sales-endpoint.decorator';
import { ResponseService, BaseSaleController } from '../common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { SaleInventoryService } from './sale-inventory.service';
import { CancelOrderProcessingDto } from './dto/cancel-order-processing.dto';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SaleDraftService } from './sale-draft.service';

@Controller('sale')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController extends BaseSaleController {
  constructor(
    private readonly salesService: SalesService,
    private readonly saleReturnService: SaleReturnService,
    private readonly customerBalanceService: CustomerBalanceService,
    private readonly saleHistoryService: SaleHistoryService,
    private readonly inventoryService: SaleInventoryService,
    private readonly statusManagementService: StatusManagementService,
    private readonly orderProcessingService: OrderProcessingService,
    private readonly saleDraftService: SaleDraftService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }

  @Post('draft')
  async saveSaleDraft(@Req() req: any, @Res() res: any) {
    return this.handleSaleOperation(
      () => this.saleDraftService.saveDraftSale(req, res),
      'Sale Drafted Successfully',
    );
  }
  @Get('draft')
  async getDraftSales(@Req() req: any, @Res() res: any) {
    return this.handleSaleOperation(
      () => this.saleDraftService.getDraftSales(req, res),
      'Sale Drafted Successfully',
    );
  }
  @Delete('draft')
  async deleteDraftSale(
    @Query('storeId') storeId: string,
    @Query('draftId') draftId: string,
  ) {
    return this.handleSaleOperation(
      () => this.saleDraftService.deleteDraftSale(draftId, storeId, null),
      'Sale Drafted Successfully',
    );
  }

  @SalesEndpoint.CreateSale(CreateSaleDto)
  @Post('create')
  async createSale(
    @Body() createSaleDto: CreateSaleDto,
    @Req() req: any,
    @Query('draftId') draftId: string,
  ) {
    // console.log(createSaleDto , req.user.id);
    return this.handleSaleCreation(
      () => this.salesService.createSale(createSaleDto, req.user.id, draftId, ''),
      'Sale created successfully',
    );
  }

  @SalesEndpoint.CreateSaleReturn(CreateSaleReturnDto)
  @Post('returns')
  async createSaleReturn(
    @Body() createSaleReturnDto: CreateSaleReturnDto,
    @Req() req: any,
  ) {
    return this.handleReturnOperation(
      () =>
        this.saleReturnService.createSaleReturn(
          createSaleReturnDto,
          req.user.id,
        ),
      'Return processed successfully',
    );
  }

  @SalesEndpoint.GetAllSales()
  @Get()
  async getAllSales(@Query() queryDto: QuerySalesDto) {
    return this.handleSaleOperation(
      () => this.salesService.getAllSales(queryDto),
      'Sales retrieved successfully',
    );
  }

  @SalesEndpoint.GetReturnSales()
  @Get('returns')
  async getReturnSales(@Query() query: QueryReturnSalesDto) {
    return this.handleReturnOperation(
      () => this.saleReturnService.getReturnSales(query),
      'Returns retrieved successfully',
    );
  }

  @SalesEndpoint.CreatePayment(CreatePaymentDto)
  @Post('add-payment')
  async createPayment(@Body() createPaymentDto: CreatePaymentDto, @Req() req) {
    return this.handlePaymentOperation(
      () =>
        this.customerBalanceService.createPayment(createPaymentDto, req.user),
      'Payment recorded successfully',
    );
  }

  @SalesEndpoint.CreatePayment(CreatePaymentDto)
  @Post('add-initial-balance')
  async addInitialBalance(@Body() addInitialBalanceDto: AddInitialBalanceDto) {
    return this.handlePaymentOperation(
      () => this.customerBalanceService.addInitialBalance(addInitialBalanceDto),
      'Payment recorded successfully',
    );
  }

  @SalesEndpoint.GetSalesHistory()
  @Get('history')
  async getSalesHistory(
    @Query() queryDto: QuerySalesHistoryDto,
    @Req() req: any,
  ) {
    return this.handleSaleOperation(
      () =>
        this.saleHistoryService.getSalesHistory(
          queryDto,
          {
            id: req.user.id,
            role: req.user.role,
            clientId: req.user.clientId,
            stores: req.user.stores || [],
          },
          req.user.tenantId,
        ),
      'Sales history retrieved successfully',
    );
  }

  @SalesEndpoint.GetSaleById()
  @Get(':id')
  async getSaleById(
    @Param('id') id: string,
    @Query('storeId') storeId: string,
  ) {
    return this.handleSaleOperation(
      () => this.salesService.getSaleById(id, storeId),
      'Sale retrieved successfully',
    );
  }

  @SalesEndpoint.UpdateSale(UpdateSaleDto)
  @Patch(':id')
  async updateSale(
    @Param('id') id: string,
    @Body() updateSaleDto: UpdateSaleDto,
    @Query('storeId') storeId: string,
  ) {
    return this.handleSaleOperation(
      () => this.salesService.updateSale(id, updateSaleDto, storeId),
      'Sale updated successfully',
    );
  }

  @SalesEndpoint.DeleteSale()
  @Delete(':id')
  async deleteSale(@Param('id') id: string, @Query('storeId') storeId: string) {
    return this.handleSaleOperation(
      () => this.salesService.deleteSale(id, storeId),
      'Sale deleted successfully',
    );
  }

  @SalesEndpoint.GetCustomerBalance()
  @Get('balance/:customerId')
  async getCustomerBalance(@Param('customerId') customerId: string) {
    return this.handleCustomerOperation(
      () => this.customerBalanceService.getCustomerBalance(customerId),
      'Customer balance retrieved successfully',
    );
  }

  @SalesEndpoint.DeleteAllSales()
  @Delete()
  async deleteAllSales(@Query('storeId') storeId: string, @Query('clientId') clientId: string) {
    return this.handleSaleOperation(
      () => this.salesService.deleteAllSales(storeId, clientId),
      'All sales deleted successfully',
    );
  }

  // Status Management Endpoints
  @SalesEndpoint.ChangeSaleStatus()
  @Patch(':id/status')
  async changeSaleStatus(
    @Param('id') saleId: string,
    @Body() changeSaleStatusDto: ChangeSaleStatusDto,
    @Query('storeId') storeId: string,
    @Req() req: any,
  ) {
    const result = await this.statusManagementService.changeSaleStatus(
      saleId,
      changeSaleStatusDto,
      req.user.id,
      storeId,
    );
    return this.responseService.success(
      'Sale status changed successfully',
      result,
    );
  }

  @SalesEndpoint.GetStatusTransitions()
  @Get(':id/status/transitions')
  async getAvailableStatusTransitions(
    @Param('id') saleId: string,
    @Query('storeId') storeId: string,
  ) {
    return this.responseService.success(
      'Available status transitions retrieved successfully',
      await this.statusManagementService.getAvailableStatusTransitions(
        saleId,
        storeId,
      ),
    );
  }

  // Order Processing Endpoints
  @SalesEndpoint.GetAllOrderProcessing()
  @Get('order-processing/record')
  async getAllOrderProcessing(
    @Req() req: any,
    @Query() queryDto: QueryOrderProcessingDto,
  ) {
    console.log(queryDto);
    return this.responseService.success(
      'Order processing records retrieved successfully',
      await this.orderProcessingService.getAllOrderProcessing(queryDto, {
        id: req.user.id,
        role: req.user.role,
        stores: req.user.stores || [],
      }),
    );
  }

  @SalesEndpoint.UpdateOrderProcessing()
  @Patch('order-processing/:id')
  async updateOrderProcessing(
    @Param('id') orderProcessingId: string,
    @Body() updateOrderProcessingDto: UpdateOrderProcessingDto,
    @Req() req: any,
  ) {
    return this.responseService.success(
      'Order processing updated successfully',
      await this.orderProcessingService.updateOrderProcessing(
        orderProcessingId,
        updateOrderProcessingDto,
        req.user.id,
        {
          id: req.user.id,
          role: req.user.role,
          stores: req.user.stores || [],
        },
      ),
    );
  }

  @SalesEndpoint.ValidateOrderProcessing()
  @Patch('order-processing/:id/validate')
  async validateOrderProcessing(
    @Param('id') orderProcessingId: string,
    @Query('storeId') storeId: string,
    @Body() validateOrderProcessingDto: ValidateOrderProcessingDto,
    @Req() req: any,
  ) {
    return this.responseService.success(
      'Order processing validation completed successfully',
      await this.orderProcessingService.validateOrderProcessing(
        orderProcessingId,
        storeId,
        validateOrderProcessingDto,
        req.user.id,
        {
          id: req.user.id,
          role: req.user.role,
          stores: req.user.stores || [],
        },
      ),
    );
  }

  @SalesEndpoint.GetOrderProcessing()
  @Get('order-processing/:id')
  async getOrderProcessing(
    @Param('id') orderProcessingId: string,
    @Query('storeId') storeId: string,
    @Req() req: any,
  ) {
    return this.responseService.success(
      'Order processing details retrieved successfully',
      await this.orderProcessingService.getOrderProcessing(
        orderProcessingId,
        storeId,
      ),
    );
  }

  @SalesEndpoint.CancelOrderProcessing()
  @Patch('cancel-order/:id')
  async cancelOrderProcessing(
    @Param('id') orderProcessingId: string,
    @Query('storeId') storeId: string,
    @Body() cancelOrderProcessingDto: CancelOrderProcessingDto,
    @Req() req: any,
  ) {
    const user: OrderProcessingUser = {
      id: req.user.id,
      role: req.user.role,
      stores: req.user.stores || [],
    };

    return this.orderProcessingService.cancelOrderProcessing(
      orderProcessingId,
      storeId,
      req.user.id,
      user,
      this.responseService,
      this.inventoryService,
      cancelOrderProcessingDto,
    );
  }

  @SalesEndpoint.BulkAssignDriver(BulkAssignDriverDto)
  @Post('assign-driver')
  async bulkAssignDriver(
    @Body() bulkAssignDto: BulkAssignDriverDto,
    @Query('storeId') storeId: string,
    @Req() req: any,
  ) {
    return this.handleSaleOperation(
      () =>
        this.salesService.bulkAssignDriver(bulkAssignDto, req.user.id, storeId),
      'Sales assigned to driver successfully',
    );
  }

  @Post('/uploadsheet')
  @ApiOperation({
    summary: 'Upload inventory from Excel or CSV file',
    description:
      'Upload products inventory data from an Excel file (.xlsx, .xls) or CSV file (.csv)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'Excel (.xlsx, .xls) or CSV (.csv) file containing inventory data',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inventory uploaded successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file format or data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'File already uploaded',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadInventory(
    @Req() req,
    @UploadedFile()
    file: Express.Multer.File,
    @Query('storeId') storeId?: string,
  ) {
    // Custom validation for file types
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/html',
    ];
    const allowedExtensions = /\.(xlsx|xls|csv|html)$/i;
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
    const isValidExtension = allowedExtensions.test(file.originalname);

    if (!isValidMimeType && !isValidExtension) {
      throw new BadRequestException(
        `Invalid file type. Expected Excel (.xlsx, .xls .csv) and .html file. Received: ${file.mimetype}`,
      );
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }
    if (!storeId) {
      throw new BadRequestException('StoreId is required');
    }
    return this.handleSaleOperation(
      () => this.salesService.addSales(req.user, file, storeId),
      'Inventory uploaded successfully',
    );
  }
}
