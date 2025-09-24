import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
  Delete,
  HttpCode,
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import {
  businessInfoDto,
  CreateInvoiceDto,
  UpdateBusinessInfoDto,
  UpdateInvoiceDto,
} from './dto/invoice.dto';
import { Invoice } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ResponseService } from '../common';
import { BaseInvoiceController } from '../common/decorators/base-invoice.controller';
import { InvoiceEndpoint } from '../common/decorators/invoice-endpoint.decorator';

@ApiTags('invoice')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('invoice')
export class InvoiceController extends BaseInvoiceController {
  constructor(
    private invoiceService: InvoiceService,
    protected responseService: ResponseService,
  ) {
    super(responseService);
  }

  @InvoiceEndpoint.setBusinessInfo(businessInfoDto)
  @Post('set-business/details')
  async setBusinessInfo(
    @Param('storeId') storeId: string,
    @Body() dto: businessInfoDto,
    @Req() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.invoiceService.setBusinessInfo(storeId, dto, req.user),
      'Business information operation completed',
    );
  }

  @InvoiceEndpoint.getBusinessInfo()
  @Get('get-business/details')
  async getBusinessInfo(@Req() req: any) {
    return this.handleServiceOperation(
      () => this.invoiceService.getBusinessInfo(req.user),
      'Business information operation completed',
    );
  }

  @InvoiceEndpoint.updateBusinessInfo(UpdateBusinessInfoDto)
  @Put('update-business/details')
  async updateBusinessInfo(
    @Body() dto: UpdateBusinessInfoDto,
    @Req() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.invoiceService.updateBusinessInfo(dto, req.user),
      'Business information updated successfully',
    );
  }

  @InvoiceEndpoint.CreateInvoice(CreateInvoiceDto)
  @Post()
  async createInvoice(
    @Body() dto: CreateInvoiceDto,
    @Req() req: any,
  ): Promise<Invoice> {
    const user = req.user;
    // console.log("createinvice",dto)
    return this.handleServiceOperation(
      () => this.invoiceService.createInvoice(dto, user),
      'Invoice created successfully',
      201,
    );
  }

  @InvoiceEndpoint.UpdateInvoice(UpdateInvoiceDto)
  @Put(':id')
  async updateInvoice(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @Req() req: any,
  ): Promise<Invoice> {
    const user = req.user;
    // console.log("createinvice",dto)
    return this.handleServiceOperation(
      () => this.invoiceService.updateInvoice(user, id, dto),
      'Invoice updated successfully',
    );
  }

  @InvoiceEndpoint.GetInvoice()
  @Get(':id')
  async getInvoice(@Param('id') id: string): Promise<Invoice> {
    return this.handleServiceOperation(
      () => this.invoiceService.getInvoice(id),
      'Invoice retrieved successfully',
    );
  }


  @InvoiceEndpoint.GenerateInvoiceNumber()
  @Get('/generate-invoice-number/:storeId')
  async getInvoiceNumber(@Param('storeId') storeId: string) {
    return this.handleServiceOperation(
      () => this.invoiceService.generateInvoiceNumber(storeId),
      'Invoice number generated successfully',
    );
  }

  @InvoiceEndpoint.GetInvoicesByStore()
  @Get('store/:storeId')
  async getInvoicesByStore(
    @Param('storeId') storeId: string,
  ): Promise<Invoice[]> {
    return this.handleServiceOperation(
      () => this.invoiceService.getInvoicesByStore(storeId),
      'Invoices retrieved successfully',
    );
  }

  @InvoiceEndpoint.DeleteInvoice()
  @Delete(':id')
  @HttpCode(200)
  async softDeleteInvoice(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.invoiceService.softDeleteInvoice(id),
      'Invoice soft deleted successfully',
    );
  }
}
