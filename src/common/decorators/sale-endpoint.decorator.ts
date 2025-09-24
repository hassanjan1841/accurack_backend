import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import {
  PermissionResource,
  PermissionAction,
  PermissionScope,
} from '../../permissions/enums/permission.enum';

// Standard response schemas
const successResponseSchema = (message: string, dataExample?: any) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: message },
    data: dataExample
      ? { type: 'object', example: dataExample }
      : { type: 'object' },
    status: { type: 'number', example: 200 },
    timestamp: { type: 'string', example: '2025-06-25T10:20:00.000Z' },
  },
});

const createdResponseSchema = (message: string, dataExample?: any) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: message },
    data: dataExample
      ? { type: 'object', example: dataExample }
      : { type: 'object' },
    status: { type: 'number', example: 201 },
    timestamp: { type: 'string', example: '2025-06-25T10:20:00.000Z' },
  },
});

const errorResponseSchema = (status: number, message: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string', example: message },
    data: { type: 'null' },
    status: { type: 'number', example: status },
    timestamp: { type: 'string', example: '2025-06-25T10:20:00.000Z' },
  },
});

const standardErrorResponses = () => [
  ApiResponse({
    status: 400,
    description: 'Bad Request',
    schema: errorResponseSchema(400, 'Validation failed or invalid request'),
  }),
  ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: errorResponseSchema(401, 'Authentication required'),
  }),
  ApiResponse({
    status: 403,
    description: 'Forbidden',
    schema: errorResponseSchema(403, 'Insufficient permissions'),
  }),
  ApiResponse({
    status: 404,
    description: 'Not Found',
    schema: errorResponseSchema(404, 'Resource not found'),
  }),
  ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    schema: errorResponseSchema(500, 'Internal server error'),
  }),
];

export const CustomerEndpoint = {
  // Customer Management Endpoints
  CreateCustomer: (dtoType: any) =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Create a new customer',
        description:
          'Creates a new customer record with automatic balance sheet initialization',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Customer created successfully',
        schema: createdResponseSchema('Customer created successfully', {
          id: 'uuid',
          customerName: 'John Doe',
          phoneNumber: '+1234567890',
          customerAddress: '123 Main St',
          storeId: 'store-uuid',
          clientId: 'client-uuid',
          createdAt: '2025-06-25T10:20:00.000Z',
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(
        PermissionResource.CUSTOMER,
        PermissionAction.CREATE,
        PermissionScope.STORE,
      ),
    ),

  FindCustomerByPhone: () =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Find customer by phone number',
        description:
          'Retrieves customer information and current balance by phone number',
      }),
      ApiParam({ name: 'phoneNumber', description: 'Customer phone number' }),
      ApiResponse({
        status: 200,
        description: 'Customer found successfully',
        schema: successResponseSchema('Customer found successfully', {
          id: 'uuid',
          customerName: 'John Doe',
          phoneNumber: '+1234567890',
          balanceSheets: [{ remainingAmount: 150.0 }],
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(
        PermissionResource.CUSTOMER,
        PermissionAction.READ,
        PermissionScope.STORE,
      ),
    ),

  UpdateCustomer: (dtoType: any) =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Update customer information',
        description: 'Updates customer details (name, address, contact info)',
      }),
      ApiParam({ name: 'customerId', description: 'Customer ID' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Customer updated successfully',
        schema: successResponseSchema('Customer updated successfully'),
      }),
      ...standardErrorResponses(),
      RequirePermissions(
        PermissionResource.CUSTOMER,
        PermissionAction.UPDATE,
        PermissionScope.STORE,
      ),
    ),

  DeleteCustomer: () =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Delete customer and associated balance sheet',
        description:
          'Deletes customer record and associated balance sheet, restoring inventory if applicable',
      }),
      ApiParam({ name: 'customerId', description: 'Customer ID' }),
      ApiResponse({
        status: 200,
        description: 'Customer deleted successfully',
        schema: successResponseSchema('Customer deleted successfully'),
      }),
      ...standardErrorResponses(),
      RequirePermissions(
        PermissionResource.CUSTOMER,
        PermissionAction.DELETE,
        PermissionScope.STORE,
      ),
    ),

  GetCustomers: () =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Get all customers for a store',
        description:
          'Retrieves paginated list of customers with balance information',
      }),
      ApiQuery({ name: 'storeId', description: 'Store ID' }),
      ApiQuery({ name: 'page', description: 'Page number', required: false }),
      ApiQuery({
        name: 'limit',
        description: 'Items per page',
        required: false,
      }),
      ApiQuery({
        name: 'search',
        description: 'Search query',
        required: false,
      }),
      ApiResponse({
        status: 200,
        description: 'Customers retrieved successfully',
        schema: successResponseSchema('Customers retrieved successfully', {
          customers: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(
        PermissionResource.CUSTOMER,
        PermissionAction.READ,
        PermissionScope.STORE,
      ),
    ),

  GetCustomerBalance: () =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Get customer balance and payment history',
        description: 'Retrieves customer balance sheet and payment history',
      }),
      ApiParam({ name: 'customerId', description: 'Customer ID' }),
      ApiResponse({
        status: 200,
        description: 'Balance retrieved successfully',
        schema: successResponseSchema('Balance retrieved successfully', {
          customer: { id: 'uuid', customerName: 'John Doe' },
          currentBalance: 150.0,
          totalPaid: 850.0,
          balanceHistory: [],
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(
        PermissionResource.CUSTOMER,
        PermissionAction.READ,
        PermissionScope.STORE,
      ),
    ),

};
