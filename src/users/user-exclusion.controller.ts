import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AddExclusionDto, RemoveExclusionDto } from './dto/exclusion.dto';

import { PermissionsGuard } from '../guards/permissions.guard';
import { UsersService } from './users.service';

@ApiTags('user-exclusions')
@ApiBearerAuth()
@Controller('users/:id/exclusions')
@UseGuards(PermissionsGuard)
export class UserExclusionController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Add excluded features to a user' })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiBody({ type: AddExclusionDto })
  @ApiResponse({ status: 200, description: 'Exclusions added successfully' })
  @Post()
  async addExclusions(
    @Param('id') userId: string,
    @Body() dto: AddExclusionDto,
  ) {
    return this.usersService.addExclusions(userId, dto.features);
  }

  @ApiOperation({ summary: 'Remove excluded features from a user' })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiBody({ type: RemoveExclusionDto })
  @ApiResponse({ status: 200, description: 'Exclusions removed successfully' })
  @Delete()
  async removeExclusions(
    @Param('id') userId: string,
    @Body() dto: RemoveExclusionDto,
  ) {
    return this.usersService.removeExclusions(userId, dto.features);
  }

  @ApiOperation({ summary: 'Get all excluded features for a user' })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of excluded features' })
  @Get()
  async getExclusions(@Param('id') userId: string) {
    return this.usersService.getExclusions(userId);
  }
}
