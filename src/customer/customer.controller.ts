import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
} from './dto/customer.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { BaseSaleController, CustomerEndpoint, ResponseService } from '../common';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomerController extends BaseSaleController {
  constructor(
    private readonly CustomerService: CustomerService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }

  // Customer endpoints
  @CustomerEndpoint.CreateCustomer(CreateCustomerDto)
  @Post('customers')
  async createCustomer(@Body() dto: CreateCustomerDto) {
    return this.handleCustomerOperation(
      () => this.CustomerService.createCustomer(dto),
      'Customer created successfully',
      201,
    );
  }

  @CustomerEndpoint.FindCustomerByPhone()
  @Get('customers/phone/:phoneNumber')
  async findCustomerByPhone(@Param('phoneNumber') phoneNumber: string) {
    return this.handleCustomerOperation(
      () => this.CustomerService.findCustomerByPhone(phoneNumber),
      'Customer found successfully',
    );
  }

  @CustomerEndpoint.UpdateCustomer(UpdateCustomerDto)
  @Put('customers/:customerId')
  async updateCustomer(
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.handleCustomerOperation(
      () => this.CustomerService.updateCustomer(customerId, dto),
      'Customer updated successfully',
    );
  }

  @CustomerEndpoint.DeleteCustomer()
  @Delete('customers/:customerId')
  async deleteCustomer(@Param('customerId') customerId: string) {
    return this.handleCustomerOperation(
      () => this.CustomerService.deleteCustomer(customerId),
      'Customer deleted successfully',
    );
  }

  @CustomerEndpoint.GetCustomers()
  @Get('customers')
  async getCustomers(
    @Request() req: any,
    @Query('storeId') storeId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
  ) {
    return this.handleSaleOperation(
      () =>
        this.CustomerService.getCustomers(
          req.user,
          storeId,
          parseInt(page),
          parseInt(limit),
          search,
        ),
      'Customers retrieved successfully',
    );
  }

  @CustomerEndpoint.GetCustomerBalance()
  @Get('customers/:customerId/balance')
  async getCustomerBalance(@Param('customerId') customerId: string) {
    return this.handleCustomerOperation(
      () => this.CustomerService.getCustomerBalance(customerId),
      'Balance retrieved successfully',
    );
  }

}
