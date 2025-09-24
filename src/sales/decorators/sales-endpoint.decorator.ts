import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Version } from '@nestjs/common';
import {
  PermissionAction,
  PermissionResource,
  PermissionScope,
  RequirePermissions,
} from 'src/common';

const standardErrorResponses = () => [
  ApiResponse({ status: 400, description: 'Bad request - validation failed' }),
  ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  }),
  ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  }),
  ApiResponse({ status: 404, description: 'Not found' }),
  ApiResponse({ status: 500, description: 'Internal server error' }),
];

export const SalesEndpoint = {
  CreateSale: (dtoType: any) =>
    applyDecorators(
      ApiTags('sales'),
      ApiOperation({
        summary: 'Create a new sale',
        description:
          'Creates a new sale with inventory updates, customer management, optional shipping address, driver assignment, and invoice generation. Validates minimum selling quantities and handles complex product variants and packs. Can optionally assign to driver for immediate delivery.',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Sale created successfully',
        schema: {
          example: {
            success: true,
            message: 'Sale created successfully',
            data: {
              id: 'sale-uuid',
              customer: { id: 'customer-uuid', customerName: 'John Doe' },
              totalAmount: 150.0,
              profitAmount: 45.0,
              status: 'COMPLETED',
            },
            status: 201,
            timestamp: '2025-07-22T10:30:00Z',
          },
        },
      }),
      ...standardErrorResponses(),
      ApiBearerAuth(),
      Version('1'),
    ),

  GetAllSales: () =>
    applyDecorators(
      ApiTags('sales'),
      ApiOperation({
        summary: 'Get all sales with filters',
        description:
          'Retrieves all sales for a store with optional filtering by customer, status, payment method, and date range. Supports pagination.',
      }),
      ApiQuery({
        name: 'storeId',
        required: true,
        description: 'Store ID to filter sales',
      }),
      ApiQuery({
        name: 'page',
        required: false,
        description: 'Page number (default: 1)',
      }),
      ApiQuery({
        name: 'limit',
        required: false,
        description: 'Items per page (default: 20)',
      }),
      ApiQuery({
        name: 'customerId',
        required: false,
        description: 'Filter by customer ID',
      }),
      ApiQuery({
        name: 'status',
        required: false,
        description: 'Filter by sale status',
      }),
      ApiQuery({
        name: 'paymentMethod',
        required: false,
        description: 'Filter by payment method',
      }),
      ApiQuery({
        name: 'dateFrom',
        required: false,
        description: 'Filter from date (ISO string)',
      }),
      ApiQuery({
        name: 'dateTo',
        required: false,
        description: 'Filter to date (ISO string)',
      }),
      ApiResponse({ status: 200, description: 'Sales retrieved successfully' }),
      ...standardErrorResponses(),
      ApiBearerAuth(),
      Version('1'),
    ),

  GetSaleById: () =>
    applyDecorators(
      ApiTags('sales'),
      ApiOperation({
        summary: 'Get sale by ID',
        description:
          'Retrieves detailed information about a specific sale including customer, items, invoices, and returns.',
      }),
      ApiParam({ name: 'id', description: 'Sale ID' }),
      ApiQuery({
        name: 'storeId',
        required: true,
        description: 'Store ID to verify ownership',
      }),
      ApiResponse({ status: 200, description: 'Sale retrieved successfully' }),
      ...standardErrorResponses(),
      ApiBearerAuth(),
      Version('1'),
    ),

  UpdateSale: (dtoType: any) =>
    applyDecorators(
      ApiTags('sales'),
      ApiOperation({
        summary: 'Update sale details',
        description:
          'Updates sale information including status, items, and payment details. Automatically adjusts inventory for item changes.',
      }),
      ApiParam({ name: 'id', description: 'Sale ID to update' }),
      ApiBody({ type: dtoType }),
      ApiResponse({ status: 200, description: 'Sale updated successfully' }),
      ...standardErrorResponses(),
      ApiBearerAuth(),
      Version('1'),
    ),

  DeleteSale: () =>
    applyDecorators(
      ApiTags('sales'),
      ApiOperation({
        summary: 'Cancel/delete sale',
        description:
          'Cancels a sale and restores all inventory. Removes associated invoices and balance sheet entries.',
      }),
      ApiParam({ name: 'id', description: 'Sale ID to delete' }),
      ApiQuery({
        name: 'storeId',
        required: true,
        description: 'Store ID to verify ownership',
      }),
      ApiResponse({ status: 200, description: 'Sale deleted successfully' }),
      ...standardErrorResponses(),
      ApiBearerAuth(),
      Version('1'),
    ),

  CreateSaleReturn: (dtoType: any) =>
    applyDecorators(
      ApiTags('sales'),
      ApiOperation({
        summary: 'Create sale return',
        description:
          'Processes returns for sold items. Handles inventory restoration based on return category (SALEABLE, SCRAP, NON_SALEABLE) and issues refunds.',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Return processed successfully',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth(),
      Version('1'),
    ),

  GetReturnSales: () =>
    applyDecorators(
      ApiTags('sales'),
      ApiOperation({
        summary: 'Get all returns',
        description:
          'Retrieves all return records for a store with sale and customer details.',
      }),
      ApiQuery({
        name: 'storeId',
        required: true,
        description: 'Store ID to filter returns',
      }),
      ApiResponse({
        status: 200,
        description: 'Returns retrieved successfully',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth(),
      Version('1'),
    ),

  CreatePayment: (dtoType: any) =>
    applyDecorators(
      ApiTags('sales'),
      ApiOperation({
        summary: 'Record customer payment',
        description:
          'Records a payment from customer and updates their balance. Can be linked to specific sale or general payment.',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Payment recorded successfully',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth(),
      Version('1'),
    ),

  GetCustomerBalance: () =>
    applyDecorators(
      ApiTags('sales'),
      ApiOperation({
        summary: 'Get customer balance and payment history',
        description:
          'Retrieves customer balance information including total owed, payments made, and recent transaction history.',
      }),
      ApiParam({ name: 'customerId', description: 'Customer ID' }),
      ApiResponse({
        status: 200,
        description: 'Customer balance retrieved successfully',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth(),
      Version('1'),
    ),

  DeleteAllSales: () =>
    applyDecorators(
      ApiTags('sales'),
      ApiOperation({
        summary: 'Delete all sales (Admin only)',
        description:
          'Deletes all sales for a store and restores inventory. This is an administrative function for testing or cleanup purposes.',
      }),
      ApiQuery({
        name: 'storeId',
        required: true,
        description: 'Store ID to delete all sales from',
      }),
      ApiResponse({
        status: 200,
        description: 'All sales deleted successfully',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth(),
      Version('1'),
    ),

  GetSalesHistory: () =>
    applyDecorators(
      ApiTags('sales'),
      ApiOperation({
        summary: 'Get sales history and activity log',
        description:
          'Retrieves comprehensive sales history with advanced filtering, search, and pagination. Restricted to super admin and store admin. Shows all sales activities, changes, and transactions for the current store only.',
      }),
      ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number (default: 1)',
      }),
      ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Records per page (default: 20, max: 100)',
      }),
      ApiQuery({
        name: 'search',
        required: false,
        type: String,
        description: 'Search in sale ID, customer name, or action description',
      }),
      ApiQuery({
        name: 'saleId',
        required: false,
        type: String,
        description: 'Filter by specific sale ID',
      }),
      ApiQuery({
        name: 'userId',
        required: false,
        type: String,
        description: 'Filter by user who performed the action',
      }),
      ApiQuery({
        name: 'action',
        required: false,
        enum: [
          'SALE_CREATED',
          'SALE_UPDATED',
          'SALE_CANCELLED',
          'SALE_COMPLETED',
          'SALE_RETURNED',
          'SALE_PARTIAL_RETURN',
          'INVENTORY_UPDATED',
          'PAYMENT_PROCESSED',
          'PAYMENT_REFUNDED',
          'STATUS_CHANGED',
          'ORDER_PROCESSED',
          'ITEM_ADDED',
          'ITEM_REMOVED',
          'CUSTOMER_UPDATED',
          'NOTE_ADDED',
        ],
        description: 'Filter by action type',
      }),
      ApiQuery({
        name: 'startDate',
        required: false,
        type: String,
        description: 'Start date filter (ISO string)',
      }),
      ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
        description: 'End date filter (ISO string)',
      }),
      ApiQuery({
        name: 'sortBy',
        required: false,
        enum: ['createdAt', 'action', 'saleId'],
        description: 'Sort field (default: createdAt)',
      }),
      ApiQuery({
        name: 'sortOrder',
        required: false,
        enum: ['asc', 'desc'],
        description: 'Sort order (default: desc)',
      }),
      ApiResponse({
        status: 200,
        description: 'Sales history retrieved successfully',
        schema: {
          example: {
            success: true,
            message: 'Sales history retrieved successfully',
            data: {
              data: [
                {
                  id: 'history-uuid',
                  saleId: 'sale-uuid',
                  action: 'SALE_CREATED',
                  description: 'Sale created with total amount: $150.00',
                  user: {
                    id: 'user-uuid',
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    role: 'admin',
                  },
                  store: {
                    id: 'store-uuid',
                    name: 'Main Store',
                  },
                  sale: {
                    id: 'sale-uuid',
                    totalAmount: 150.0,
                    status: 'COMPLETED',
                    paymentMethod: 'CASH',
                    customer: {
                      id: 'customer-uuid',
                      firstName: 'Jane',
                      lastName: 'Smith',
                      email: 'jane@example.com',
                    },
                  },
                  newData: {
                    totalAmount: 150.0,
                    items: ['product1', 'product2'],
                  },
                  createdAt: '2025-07-25T14:30:00Z',
                },
              ],
              pagination: {
                page: 1,
                limit: 20,
                total: 50,
                totalPages: 3,
                hasNext: true,
                hasPrev: false,
              },
            },
            status: 200,
            timestamp: '2025-07-25T14:30:00Z',
          },
        },
      }),
      ApiResponse({
        status: 403,
        description:
          'Forbidden - Only super admin and store admin can access sales history',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
    ),

  ChangeSaleStatus: () =>
    applyDecorators(
      ApiTags('sales'),
      ApiOperation({
        summary: 'Change sale status',
        description:
          'Change the status of a sale with order flow validation. Supports structured transitions from PENDING to DELIVERED.',
      }),
      ApiParam({ name: 'id', description: 'Sale ID' }),
      ApiResponse({
        status: 200,
        description: 'Sale status changed successfully',
        schema: {
          example: {
            data: {
              sale: { id: 'uuid', status: 'CONFIRMED', totalAmount: 150.0 },
              previousStatus: 'PENDING',
              newStatus: 'CONFIRMED',
              message:
                'Sale status successfully changed from PENDING to CONFIRMED',
            },
          },
        },
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
    ),

  GetStatusTransitions: () =>
    applyDecorators(
      ApiTags('sales'),
      ApiOperation({
        summary: 'Get available status transitions',
        description:
          'Get the available status transitions for a specific sale based on current status.',
      }),
      ApiParam({ name: 'id', description: 'Sale ID' }),
      ApiResponse({
        status: 200,
        description: 'Available status transitions retrieved successfully',
        schema: {
          example: {
            data: {
              currentStatus: 'PENDING',
              availableTransitions: ['CONFIRMED', 'CANCELLED'],
              saleId: 'uuid',
              customerName: 'John Doe',
            },
          },
        },
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
    ),

  UpdateOrderProcessing: () =>
    applyDecorators(
      ApiTags('sales'),
      ApiOperation({
        summary: 'Update order processing',
        description:
          'Update order processing details by driver. Used for tracking delivery progress and updating payment information.',
      }),
      ApiParam({ name: 'id', description: 'Order Processing ID' }),
      ApiResponse({
        status: 200,
        description: 'Order processing updated successfully',
        schema: {
          example: {
            data: {
              orderProcessing: {
                id: 'uuid',
                status: 'DELIVERED',
                paymentAmount: 150.0,
              },
              message: 'Order processing updated successfully',
              updatedFields: ['status', 'paymentAmount'],
            },
          },
        },
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
    ),

  ValidateOrderProcessing: () =>
    applyDecorators(
      ApiTags('sales'),
      ApiOperation({
        summary: 'Validate order processing',
        description:
          'Validate/approve or reject order processing. Only accessible to admin and super admin roles.',
      }),
      ApiParam({ name: 'id', description: 'Order Processing ID' }),
      ApiResponse({
        status: 200,
        description: 'Order processing validation completed successfully',
        schema: {
          example: {
            data: {
              orderProcessing: {
                id: 'uuid',
                isValidated: true,
                validatorId: 'uuid',
              },
              message: 'Order validated and approved successfully',
              isValidated: true,
            },
          },
        },
      }),
      ApiResponse({
        status: 403,
        description:
          'Forbidden - Only admin and super admin can validate orders',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
    ),

  GetOrderProcessing: () =>
    applyDecorators(
      ApiTags('sales'),
      ApiOperation({
        summary: 'Get order processing details',
        description:
          'Retrieve detailed information about a specific order processing record.',
      }),
      ApiParam({ name: 'id', description: 'Order Processing ID' }),
      ApiResponse({
        status: 200,
        description: 'Order processing details retrieved successfully',
        schema: {
          example: {
            data: {
              id: 'uuid',
              status: 'SHIPPED',
              customer: { customerName: 'John Doe' },
              driver: { firstName: 'Jane', lastName: 'Driver' },
              paymentAmount: 150.0,
            },
          },
        },
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
    ),

  GetAllOrderProcessing: () =>
    applyDecorators(
      RequirePermissions(
        PermissionResource.ORDER,
        PermissionAction.READ || PermissionAction.ALL,
        PermissionScope.STORE,
      ),
      ApiTags('sales'),
      ApiOperation({
        summary: 'Get all order processing records',
        description:
          'Retrieve paginated list of order processing records with comprehensive filtering options including store, status, payment method, date range, and search functionality.',
      }),
      ApiQuery({
        name: 'storeId',
        required: false,
        description:
          'Store ID to filter orders (optional - will filter by user accessible stores if not provided)',
      }),
      ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number (default: 1)',
      }),
      ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Records per page (default: 20, max: 100)',
      }),
      ApiQuery({
        name: 'status',
        required: false,
        description: 'Filter by order processing status',
        enum: [
          'SENT_FOR_VALIDATION',
          'PENDING_VALIDATION',
          'VALIDATED',
          'PICKED',
          'PACKED',
          'SHIPPED',
          'DELIVERED',
          'CANCELLED',
        ],
      }),
      ApiQuery({
        name: 'paymentMethod',
        required: false,
        description: 'Filter by payment method',
        enum: ['CASH', 'CARD', 'BANK_TRANSFER', 'UPI', 'CHEQUE'],
      }),
      ApiQuery({
        name: 'search',
        required: false,
        description:
          'Search query to find orders by customer name or driver name',
      }),
      ApiQuery({
        name: 'dateFrom',
        required: false,
        description: 'Filter orders from this date (ISO string)',
      }),
      ApiQuery({
        name: 'dateTo',
        required: false,
        description: 'Filter orders to this date (ISO string)',
      }),
      ApiQuery({
        name: 'customerId',
        required: false,
        description: 'Filter by customer ID',
      }),
      ApiQuery({
        name: 'driverId',
        required: false,
        description: 'Filter by driver ID',
      }),
      ApiQuery({
        name: 'validatorId',
        required: false,
        description: 'Filter by validator ID',
      }),
      ApiQuery({
        name: 'isValidated',
        required: false,
        type: Boolean,
        description: 'Filter by validation status',
      }),
      ApiResponse({
        status: 200,
        description: 'Order processing records retrieved successfully',
        schema: {
          example: {
            data: {
              data: [
                {
                  id: 'uuid',
                  status: 'SHIPPED',
                  paymentAmount: 150.0,
                  paymentMethod: 'CASH',
                  isValidated: true,
                  customer: {
                    id: 'uuid',
                    customerName: 'John Doe',
                    customerMail: 'john@example.com',
                  },
                  driver: {
                    id: 'uuid',
                    firstName: 'Jane',
                    lastName: 'Driver',
                    email: 'jane@example.com',
                  },
                  store: { id: 'uuid', name: 'Main Store' },
                },
              ],
              pagination: {
                page: 1,
                limit: 20,
                total: 1,
                totalPages: 1,
                hasNext: false,
                hasPrev: false,
              },
              filters: {
                storeId: 'store-123',
                status: 'SHIPPED',
                search: 'john',
              },
            },
          },
        },
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
    ),

  BulkAssignDriver: (dtoType: any) =>
    applyDecorators(
      ApiTags('sales'),
      ApiOperation({
        summary: 'Bulk assign sales to driver',
        description:
          'Assign multiple sales to a driver for delivery. Creates OrderProcessing records and updates sale status to SHIPPED.',
      }),
      ApiBody({ type: dtoType }),
      ApiQuery({ name: 'storeId', description: 'Store ID', required: true }),
      ApiResponse({
        status: 200,
        description: 'Sales assigned to driver successfully',
        schema: {
          example: {
            success: true,
            message: 'Sales assigned to driver successfully',
            data: {
              assignedSales: 3,
              driverAssigned: 'John Smith',
              saleIds: ['sale-1', 'sale-2', 'sale-3'],
              newStatus: 'SHIPPED',
              message: 'Successfully assigned 3 sales to driver John Smith',
            },
            status: 200,
            timestamp: '2025-07-25T14:30:00Z',
          },
        },
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
    ),

  CancelOrderProcessing: () =>
    applyDecorators(
      ApiTags('sales'),
      ApiOperation({
        summary: 'Cancel order processing',
        description:
          'Cancels an order processing record and restores inventory. Only admin and super admin can perform this action.',
      }),
      ApiParam({ name: 'id', description: 'Order Processing ID' }),
      ApiQuery({
        name: 'storeId',
        required: true,
        description: 'Store ID to verify ownership',
      }),
      ApiResponse({
        status: 200,
        description: 'Order and sale cancelled successfully',
      }),
      ApiResponse({
        status: 403,
        description: 'Forbidden - insufficient permissions',
      }),
      ApiResponse({ status: 404, description: 'Order processing not found' }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),
};
