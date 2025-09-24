import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { ExpenseDirectoryService } from '../expense-directory.service';
import { CreateExpenseDirectoryDto } from '../dto/create-expense-directory.dto';
import { UpdateExpenseDirectoryDto } from '../dto/update-expense-directory.dto';

@ApiTags('Expense Directories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expense/directories')
export class ExpenseDirectoryController {
  constructor(
    private readonly expenseDirectoryService: ExpenseDirectoryService,
  ) { }

  @Get()
  @ApiOperation({ summary: 'Get first level directories for a store' })
  @ApiQuery({ name: 'storeId', description: 'Store ID to get directories for', type: 'string' })
  @ApiResponse({ status: 200, description: 'First level directories retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async getFirstLevelDirectories(@Query('storeId') storeId: string, @Request() req: any) {
    return this.handleServiceOperation(
      () => this.expenseDirectoryService.getFirstLevelFolder(storeId, req.user),
      'First level directories retrieved successfully',
      200,
    );
  }

  @Get('hierarchy')
  @ApiOperation({ 
    summary: 'Get complete directory hierarchy with sheets and columns for a store',
    description: 'Returns all expense directories in hierarchical structure including subdirectories, sheets, and sheet columns'
  })
  @ApiQuery({ name: 'storeId', description: 'Store ID to get complete hierarchy for', type: 'string' })
  @ApiResponse({ 
    status: 200, 
    description: 'Complete directory hierarchy retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              level: { type: 'number' },
              status: { type: 'string' },
              children: {
                type: 'array',
                description: 'Subdirectories (recursive structure)'
              },
              sheets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    columns: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          columnType: { type: 'string' },
                          order: { type: 'number' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        statusCode: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async getCompleteHierarchy(@Query('storeId') storeId: string, @Request() req: any) {
    return this.handleServiceOperation(
      () => this.expenseDirectoryService.getCompleteHierarchy(storeId, req.user),
      'Complete directory hierarchy retrieved successfully',
      200,
    );
  } 

  @Get(':id')
  @ApiOperation({ summary: 'Get directory children and sheets by directory ID' })
  @ApiResponse({ status: 200, description: 'Directories retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Directory not found' })
  async getDirectoriesById(@Param('id') id: string, @Request() req: any) {
    return this.handleServiceOperation(
      () => this.expenseDirectoryService.getDirectoryChildren(id),
      'Directories retrieved successfully',
      200,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a new expense directory' })
  @ApiResponse({ status: 201, description: 'Directory created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - maximum levels exceeded or hierarchy rules violated' })
  async createDirectory(
    @Request() req: any,
    @Body() dto: CreateExpenseDirectoryDto,
  ) {
    return this.handleServiceOperation(
      () => this.expenseDirectoryService.create(dto, req.user),
      'Directory created successfully',
      201,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update expense directory details' })
  @ApiResponse({ status: 200, description: 'Directory updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Directory not found' })
  async updateDirectory(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateExpenseDirectoryDto,
  ) {
    return this.handleServiceOperation(
      () => this.expenseDirectoryService.update(id, dto, req.user),
      'Directory updated successfully',
      200,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete expense directory (move to trash)' })
  @ApiResponse({ status: 200, description: 'Directory moved to trash' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - directory contains children or sheets' })
  @ApiResponse({ status: 404, description: 'Directory not found' })
  async deleteDirectory(@Param('id') id: string, @Request() req: any) {
    return this.handleServiceOperation(
      () => this.expenseDirectoryService.delete(id, req.user),
      'Directory moved to trash',
      200,
    );
  }

  private async handleServiceOperation(
    operation: () => Promise<any>,
    successMessage: string,
    statusCode: number,
  ) {
    try {
      const result = await operation();
      return {
        success: true,
        message: successMessage,
        data: result,
        statusCode,
      };
    } catch (error) {
      throw error;
    }
  }
}