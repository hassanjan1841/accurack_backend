import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ExportFormat } from '../../expense/dto/expense-export.dto';

export const ExpenseEndpoint = {
  CreateSheet: (dtoType: any) =>
    applyDecorators(
      ApiTags('Expense Sheets'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Create a new expense sheet',
        description: 'Creates a new expense sheet with columns and optional initial entries'
      }),
      ApiResponse({ 
        status: 201, 
        description: 'Sheet created successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Sheet created successfully' },
            statusCode: { type: 'number', example: 201 },
          }
        }
      }),
      ApiResponse({ status: 400, description: 'Bad request - validation failed' }),
      ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' }),
      ApiResponse({ status: 404, description: 'Directory not found' }),
    ),

  GetAllSheets: () =>
    applyDecorators(
      ApiTags('Expense Sheets'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Get all expense sheets',
        description: 'Retrieves all expense sheets for the authenticated user, optionally filtered by directory'
      }),
      ApiQuery({ 
        name: 'directoryId', 
        required: false, 
        type: String,
        description: 'Filter sheets by directory ID'
      }),
      ApiResponse({ 
        status: 200, 
        description: 'Sheets retrieved successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Sheets retrieved successfully' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                }
              }
            },
            statusCode: { type: 'number', example: 200 },
          }
        }
      }),
      ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' }),
    ),

  GetSheetById: () =>
    applyDecorators(
      ApiTags('Expense Sheets'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Get expense sheet by ID with entries',
        description: 'Retrieves a specific expense sheet with all its entries, columns, and data. Supports pagination and status filtering.'
      }),
      ApiParam({ name: 'id', description: 'Expense sheet ID' }),
      ApiResponse({ 
        status: 200, 
        description: 'Sheet retrieved successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Sheet retrieved successfully' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                entries: { type: 'array' },
                pagination: {
                  type: 'object',
                  properties: {
                    currentPage: { type: 'number' },
                    limit: { type: 'number' },
                    totalEntries: { type: 'number' },
                    totalPages: { type: 'number' },
                    hasNextPage: { type: 'boolean' },
                    hasPreviousPage: { type: 'boolean' },
                  }
                }
              }
            },
            statusCode: { type: 'number', example: 200 },
          }
        }
      }),
      ApiResponse({ status: 404, description: 'Expense sheet not found' }),
      ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' }),
    ),

  UpdateSheet: (dtoType: any) =>
    applyDecorators(
      ApiTags('Expense Sheets'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Update an expense sheet',
        description: 'Updates an existing expense sheet including its columns and entries'
      }),
      ApiParam({ name: 'id', description: 'Expense sheet ID to update' }),
      ApiResponse({ 
        status: 200, 
        description: 'Sheet updated successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Sheet updated successfully' },
            statusCode: { type: 'number', example: 200 },
          }
        }
      }),
      ApiResponse({ status: 400, description: 'Bad request - validation failed' }),
      ApiResponse({ status: 404, description: 'Expense sheet not found' }),
      ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' }),
    ),

  AddRowsToSheet: (dtoType: any) =>
    applyDecorators(
      ApiTags('Expense Sheets'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Add rows to an expense sheet',
        description: 'Adds new rows/entries to an existing expense sheet. All rows must have SUBMITTED status.'
      }),
      ApiParam({ name: 'id', description: 'Expense sheet ID to add rows to' }),
      ApiResponse({ 
        status: 201, 
        description: 'Rows added successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Rows added successfully' },
            data: {
              type: 'object',
              properties: {
                added: { type: 'number', example: 5 }
              }
            },
            statusCode: { type: 'number', example: 201 },
          }
        }
      }),
      ApiResponse({ status: 400, description: 'Bad request - validation failed or rows not SUBMITTED' }),
      ApiResponse({ status: 404, description: 'Expense sheet not found' }),
      ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' }),
    ),

  AddDraftEntries: (dtoType: any) =>
    applyDecorators(
      ApiTags('Expense Sheets'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Add draft entries to expense sheets',
        description: 'Adds draft entries to one or multiple expense sheets'
      }),
      ApiResponse({ 
        status: 201, 
        description: 'Draft entries added successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Draft entries added successfully' },
            statusCode: { type: 'number', example: 201 },
          }
        }
      }),
      ApiResponse({ status: 400, description: 'Bad request - validation failed' }),
      ApiResponse({ status: 404, description: 'Expense sheet not found' }),
      ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' }),
    ),

  DeleteSheet: () =>
    applyDecorators(
      ApiTags('Expense Sheets'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Delete an expense sheet (soft delete)',
        description: 'Soft deletes an expense sheet by setting its status to DELETED'
      }),
      ApiParam({ name: 'id', description: 'Expense sheet ID to delete' }),
      ApiResponse({ 
        status: 200, 
        description: 'Sheet deleted successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Sheet deleted successfully' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'uuid-123' },
                name: { type: 'string', example: 'Monthly Expenses' },
                status: { type: 'string', example: 'DELETED' },
                deletedAt: { type: 'string', format: 'date-time' },
              }
            },
            statusCode: { type: 'number', example: 200 },
          }
        }
      }),
      ApiResponse({ 
        status: 404, 
        description: 'Expense sheet not found' 
      }),
      ApiResponse({ 
        status: 403, 
        description: 'Forbidden - insufficient permissions' 
      }),
    ),

  HardDeleteSheet: () =>
    applyDecorators(
      ApiTags('Expense Sheets'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Permanently delete an expense sheet',
        description: 'Permanently deletes an expense sheet and all its related data (entries, values, columns). This action cannot be undone.'
      }),
      ApiParam({ name: 'id', description: 'Expense sheet ID to permanently delete' }),
      ApiResponse({ 
        status: 200, 
        description: 'Sheet permanently deleted successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Sheet permanently deleted successfully' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'uuid-123' },
                name: { type: 'string', example: 'Monthly Expenses' },
                directory: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                  }
                },
                createdByUser: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    email: { type: 'string' },
                  }
                }
              }
            },
            statusCode: { type: 'number', example: 200 },
          }
        }
      }),
      ApiResponse({ 
        status: 404, 
        description: 'Expense sheet not found' 
      }),
      ApiResponse({ 
        status: 403, 
        description: 'Forbidden - insufficient permissions' 
      }),
    ),

  GetAutoSumTotals: () =>
    applyDecorators(
      ApiTags('Expense Sheets'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Get auto-sum totals for expense sheet',
        description: 'Calculates and returns the sum totals for all columns marked with hasAutoSum=true in the expense sheet. Only includes non-archived sheets.'
      }),
      ApiParam({ name: 'id', description: 'Expense sheet ID' }),
      ApiQuery({ 
        name: 'status', 
        required: false, 
        enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'],
        description: 'Filter entries by status before calculating totals. If not provided, all entries are included.'
      }),
      ApiResponse({ 
        status: 200, 
        description: 'Auto-sum totals calculated successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Auto-sum totals calculated successfully' },
            data: {
              type: 'object',
              properties: {
                sheetId: { type: 'string', example: 'uuid-123' },
                sheetName: { type: 'string', example: 'Monthly Expenses' },
                description: { type: 'string', example: 'Expense tracking for January' },
                filterStatus: { type: 'string', example: 'SUBMITTED' },
                totalEntries: { type: 'number', example: 25 },
                autoSumColumns: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      columnId: { type: 'string' },
                      columnName: { type: 'string', example: 'Amount' },
                      columnType: { type: 'string', example: 'CURRENCY' },
                      total: { type: 'number', example: 1250.75 },
                      entryCount: { type: 'number', example: 25 },
                      validEntries: { type: 'number', example: 23 },
                    }
                  }
                },
                grandTotal: { type: 'number', example: 1250.75 },
                calculatedAt: { type: 'string', format: 'date-time' },
              }
            },
            statusCode: { type: 'number', example: 200 },
          }
        }
      }),
      ApiResponse({ 
        status: 404, 
        description: 'Expense sheet not found' 
      }),
      ApiResponse({ 
        status: 403, 
        description: 'Forbidden - insufficient permissions' 
      }),
    ),

  GetStoreAutoSumTotals: () =>
    applyDecorators(
      ApiTags('Expense Sheets'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Get store-wide auto-sum totals',
        description: 'Calculates and returns the sum totals for all columns marked with hasAutoSum=true across all non-archived expense sheets in a store'
      }),
      ApiQuery({ 
        name: 'storeId', 
        required: false, 
        type: String,
        description: 'Store ID to calculate totals for. If not provided, uses user\'s associated store.'
      }),
      ApiQuery({ 
        name: 'status', 
        required: false, 
        enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'],
        description: 'Filter entries by status before calculating totals. If not provided, all entries are included.'
      }),
      ApiQuery({ 
        name: 'directoryId', 
        required: false, 
        type: String,
        description: 'Filter sheets by directory ID. If not provided, includes all directories.'
      }),
      ApiResponse({ 
        status: 200, 
        description: 'Store-wide auto-sum totals calculated successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Store totals calculated successfully' },
            data: {
              type: 'object',
              properties: {
                storeId: { type: 'string', example: 'store-uuid-123' },
                filterStatus: { type: 'string', example: 'SUBMITTED' },
                directoryFilter: { type: 'string', example: 'ALL' },
                totalSheets: { type: 'number', example: 15 },
                totalAutoSumColumns: { type: 'number', example: 3 },
                storeWideColumnTotals: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      columnName: { type: 'string', example: 'Amount' },
                      columnType: { type: 'string', example: 'CURRENCY' },
                      total: { type: 'number', example: 15750.25 },
                      entryCount: { type: 'number', example: 125 },
                      validEntries: { type: 'number', example: 120 },
                      sheetCount: { type: 'number', example: 15 },
                      sheets: { type: 'array', items: { type: 'string' } },
                    }
                  }
                },
                sheetBreakdown: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      sheetId: { type: 'string' },
                      sheetName: { type: 'string' },
                      directoryName: { type: 'string' },
                      columnTotals: { type: 'object' },
                      sheetTotal: { type: 'number' },
                    }
                  }
                },
                grandTotal: { type: 'number', example: 15750.25 },
                calculatedAt: { type: 'string', format: 'date-time' },
              }
            },
            statusCode: { type: 'number', example: 200 },
          }
        }
      }),
      ApiResponse({ 
        status: 400, 
        description: 'Bad request - Store ID required' 
      }),
      ApiResponse({ 
        status: 403, 
        description: 'Forbidden - insufficient permissions' 
      }),
    ),

  ExportSheet: () =>
    applyDecorators(
      ApiTags('Expense Sheets'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Export expense sheet as CSV or XLSX directly',
        description: 'Downloads expense sheet data as CSV or XLSX file directly to browser'
      }),
      ApiParam({ name: 'id', description: 'Expense sheet ID' }),
      ApiQuery({ 
        name: 'format', 
        required: false, 
        enum: ExportFormat,
        description: 'Export format: csv or xlsx (default: csv)'
      }),
      ApiResponse({ 
        status: 200, 
        description: 'File downloaded successfully',
        headers: {
          'Content-Type': {
            description: 'MIME type of the downloaded file',
            schema: { type: 'string' }
          },
          'Content-Disposition': {
            description: 'Attachment filename',
            schema: { type: 'string' }
          }
        }
      }),
      ApiResponse({ 
        status: 404, 
        description: 'Expense sheet not found' 
      }),
      ApiResponse({ 
        status: 500, 
        description: 'Failed to export expense sheet' 
      }),
    ),

  ExportSheetUrl: () =>
    applyDecorators(
      ApiTags('Expense Sheets'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Export expense sheet and get download URL',
        description: 'Generates expense sheet file and returns download URL'
      }),
      ApiParam({ name: 'id', description: 'Expense sheet ID' }),
      ApiQuery({ 
        name: 'format', 
        required: false, 
        enum: ExportFormat,
        description: 'Export format: csv or xlsx (default: csv)'
      }),
      ApiResponse({ 
        status: 200, 
        description: 'Sheet exported successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Sheet exported successfully' },
            data: {
              type: 'object',
              properties: {
                filename: { type: 'string', example: 'expense-sheet-123-2024-12-20.csv' },
                downloadUrl: { type: 'string', example: '/Uploads/expense-sheet-123-2024-12-20.csv' },
              }
            },
            statusCode: { type: 'number', example: 200 },
          }
        }
      }),
      ApiResponse({ 
        status: 404, 
        description: 'Expense sheet not found' 
      }),
    ),
};
