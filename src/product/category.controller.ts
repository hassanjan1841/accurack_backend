import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ResponseService, BaseAuthController } from '../common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PermissionResource, PermissionAction } from '../permissions/enums/permission.enum';

@ApiTags('product-category')
@Controller('product-category')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CategoryController extends BaseAuthController {
  constructor(
    private readonly categoryService: CategoryService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search categories by query' })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search term (category name or code)',
  })
  @RequirePermissions(PermissionResource.CATEGORY, PermissionAction.SEARCH)
  async searchCategories(@Query('q') q: string) {
    return this.handleServiceOperation(
      () => this.categoryService.searchCategories(q),
      'Categories search results',
    );
  }

  @Post()
  @RequirePermissions(PermissionResource.CATEGORY, PermissionAction.CREATE)
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.handleServiceOperation(
      () => this.categoryService.createCategory(dto),
      'Category created successfully',
      201,
    );
  }

  @Get()
  @RequirePermissions(PermissionResource.CATEGORY, PermissionAction.READ)
  async getAllCategories() {
    return this.handleServiceOperation(
      () => this.categoryService.getAllCategories(),
      'Categories retrieved successfully',
    );
  }

  @Get(':id')
  @RequirePermissions(PermissionResource.CATEGORY, PermissionAction.READ)
  async getCategoryById(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.categoryService.getCategoryById(id),
      'Category retrieved successfully',
    );
  }

  @Put(':id')
  @RequirePermissions(PermissionResource.CATEGORY, PermissionAction.UPDATE)
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.handleServiceOperation(
      () => this.categoryService.updateCategory(id, dto),
      'Category updated successfully',
    );
  }

  @Delete(':id')
  @RequirePermissions(PermissionResource.CATEGORY, PermissionAction.DELETE)
  async deleteCategory(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.categoryService.deleteCategory(id),
      'Category deleted successfully',
    );
  }

  @Get(':id/products')
  @RequirePermissions(PermissionResource.CATEGORY, PermissionAction.READ)
  async getProductsByCategory(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.categoryService.getProductsByCategory(id),
      'Products for category retrieved successfully',
    );
  }
}
