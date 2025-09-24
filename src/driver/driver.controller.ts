import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Get,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DriverService } from './driver.service';
import {
  CreateOrderDto,
  PaginationDto,
  UpdateOrderDto,
} from './dto/driver.dto';
import {
  BaseDriverController,
  DriverEndpoint,
  PermissionsGuard,
  ResponseService,
} from '../common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@ApiTags('driver')
@Controller('driver')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DriverController extends BaseDriverController {
  constructor(
    private readonly driverService: DriverService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }



  @DriverEndpoint.GetDrivers()
  @Get('drivers')
  async getDrivers(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Query() pagination: PaginationDto,
  ) {
    console.log(storeId);
    return this.handleServiceOperation(
      () => this.driverService.getDrivers(req.user, storeId, pagination),
      'Drivers retrieved successfully',
    );
  }
}
