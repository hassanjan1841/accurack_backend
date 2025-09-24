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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { ExpenseSheetService } from '../expense-sheet.service';
import { ExpenseExportService } from '../expense-export.service';
import { CreateExpenseSheetDto } from '../dto/expense-sheet.dto';
import { UpdateExpenseSheetDto } from '../dto/expense-sheet.dto';
import { ExportFormat } from '../dto/expense-export.dto';
import { ExpenseEndpoint } from '../../common';
import { AddRowsDto } from '../dto/add-rows.dto';

@ApiTags('Expense Sheets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expense/sheets')
export class ExpenseSheetController {
  constructor(
    private readonly expenseSheetService: ExpenseSheetService,
    private readonly expenseExportService: ExpenseExportService,
  ) { }

  @ExpenseEndpoint.CreateSheet(CreateExpenseSheetDto)
  @Post()
  async createSheet(@Request() req: any, @Body() dto: CreateExpenseSheetDto) {
    return this.handleServiceOperation(
      () => this.expenseSheetService.createWithData(dto, req.user),
      'Sheet created successfully',
      201,
    );
  }

  @ExpenseEndpoint.GetAllSheets()
  @Get()
  async getSheets(
    @Request() req: any,
    @Query('directoryId') directoryId?: string,
  ) {
    return this.handleServiceOperation(
      () => this.expenseSheetService.findAll(req.user, directoryId),
      'Sheets retrieved successfully',
      200,
    );
  }

  @ExpenseEndpoint.GetSheetById()
  @Get(':id')
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'],
    description: 'Filter entries by status. Default is SUBMITTED.'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination. Default is 1.',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of entries per page. Default is 20, max is 100.',
    example: 20
  })
  async getSheet(
    @Param('id') id: string,
    @Request() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 20;
    
    return this.handleServiceOperation(
      () => this.expenseSheetService.findOneWithData(id, req.user, status, pageNumber, limitNumber),
      'Sheet retrieved successfully',
      200,
    );
  }

  @ExpenseEndpoint.UpdateSheet(UpdateExpenseSheetDto)
  @Put(':id')
  async updateSheet(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateExpenseSheetDto,
  ) {
    return this.handleServiceOperation(
      () => this.expenseSheetService.updateWithData(id, dto, req.user),
      'Sheet updated successfully',
      200,
    );
  }

  @ExpenseEndpoint.AddDraftEntries(AddRowsDto)
  @Post('/entries/draft')
  async addDraftEntriesToSheet(
    @Request() req: any,
    @Body() dto: AddRowsDto,
  ) {
    return this.handleServiceOperation(
      () => {
        // For multi-sheet, find the correct sheet by id
        const sheet = dto.sheets?.find(s => s.sheetId === req.body.sheetId || s.sheetId);
        const rows = sheet ? sheet.rows : [];
        return this.expenseSheetService.addDraftEntries(req.body.sheetId || (sheet ? sheet.sheetId : undefined), rows, req.user);
      },
      'Draft entries added successfully',
      201,
    );
  }

  @ExpenseEndpoint.GetStoreAutoSumTotals()
  @Get('store/totals')
  async getStoreAutoSumTotals(
    @Request() req: any,
    @Query('storeId') storeId?: string,
    @Query('status') status?: string,
    @Query('directoryId') directoryId?: string,
  ) {
    return this.handleServiceOperation(
      () => this.expenseSheetService.getStoreAutoSumTotals(req.user, storeId, status, directoryId),
      'Store totals calculated successfully',
      200,
    );
  }

  @ExpenseEndpoint.GetAutoSumTotals()
  @Get(':id/totals')
  async getAutoSumTotals(
    @Param('id') id: string,
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    return this.handleServiceOperation(
      () => this.expenseSheetService.getAutoSumTotals(id, req.user, status),
      'Auto-sum totals calculated successfully',
      200,
    );
  }

  @ExpenseEndpoint.ExportSheet()
  @Get(':id/export/download')
  async exportSheetDirect(
    @Param('id') id: string,
    @Query('format') format: string = ExportFormat.CSV,
    @Request() req: any,
    @Res() res: Response,
  ) {
    // Convert string to enum
    const exportFormat =
      format === ExportFormat.XLSX ? ExportFormat.XLSX : ExportFormat.CSV;

    try {
      const result = await this.expenseExportService.exportDirect(id, exportFormat, req.user);

      // Set appropriate headers
      if (exportFormat === ExportFormat.CSV) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="expense-sheet.csv"`,
        );
      } else {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="expense-sheet.xlsx"`,
        );
      }

      res.send(result);
    } catch (error) {
      console.error('Export Error:', error);
      res.status(500).send('Failed to export expense sheet');
    }
  }


  @ExpenseEndpoint.DeleteSheet()
  @Delete(':id')
  async deleteSheet(@Param('id') id: string, @Request() req: any) {
    return this.handleServiceOperation(
      () => this.expenseSheetService.delete(id, req.user),
      'Sheet deleted successfully',
      200,
    );
  }

  @ExpenseEndpoint.HardDeleteSheet()
  @Delete(':id/permanent')
  async hardDeleteSheet(@Param('id') id: string, @Request() req: any) {
    return this.handleServiceOperation(
      () => this.expenseSheetService.hardDelete(id, req.user),
      'Sheet permanently deleted successfully',
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

  /**
   * Add new rows to an existing expense sheet
   */
  @ExpenseEndpoint.AddRowsToSheet(AddRowsDto)
  @Post(':id/rows')
  async addRowsToSheet(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: AddRowsDto,
  ) {
    return this.handleServiceOperation(
      () => {
        const sheet = dto.sheets?.find(s => s.sheetId === id);
        const rows = sheet ? sheet.rows : [];
        return this.expenseSheetService.addRows(id, rows, req.user);
      },
      'Rows added successfully',
      201,
    );
  }
}