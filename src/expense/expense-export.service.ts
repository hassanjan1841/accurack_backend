import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { TenantContextService } from 'src/tenant/tenant-context.service'; // Adjust path
import { ExportFormat } from './dto/expense-export.dto';
import * as fs from 'fs';
import * as path from 'path';
import { Parser } from 'json2csv';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExpenseExportService {
  constructor(private readonly tenantContext: TenantContextService) {}

  async export(sheetId: string, format: ExportFormat, user: any) {
    // Resolve PrismaClient
    const prisma = await this.tenantContext.getPrismaClient();

    // Validate user access and fetch sheet data
    const clientId = await this.getUserClientId(user);
    const sheet = await prisma.expenseSheet.findFirst({
      where: {
        id: sheetId,
        clientId,
        status: { not: 'DELETED' },
      },
      include: {
        columns: {
          orderBy: { orderIndex: 'asc' },
        },
        entries: {
          include: {
            values: {
              include: {
                column: true,
              },
            },
          },
        },
      },
    });

    if (!sheet) {
      throw new NotFoundException('Expense sheet not found');
    }

    // Prepare data for export
    const columns = sheet.columns.map((col) => col.name);
    const data = sheet.entries.map((entry) => {
      const row: Record<string, string> = {};
      entry.values.forEach((value) => {
        row[value.column.name] = value.value;
      });
      return row;
    });

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `expense-sheet-${sheetId}-${timestamp}.${format}`;
    const filePath = path.join(__dirname, '..', '..', 'uploads', filename);

    // Ensure Uploads directory exists
    const uploadDir = path.dirname(filePath);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate file based on format
    if (format === ExportFormat.CSV) {
      await this.generateCsvFile(data, columns, filePath);
    } else if (format === ExportFormat.XLSX) {
      await this.generateExcelFile(data, columns, filePath);
    }

    // Generate download URL (assuming a static file server)
    const downloadUrl = `/Uploads/${filename}`; // Adjust based on your file serving setup

    return {
      filename,
      downloadUrl,
    };
  }

  async exportDirect(sheetId: string, format: ExportFormat, user: any) {
    // Resolve PrismaClient
    const prisma = await this.tenantContext.getPrismaClient();

    // Validate user access and fetch sheet data
    const clientId = await this.getUserClientId(user);
    const sheet = await prisma.expenseSheet.findFirst({
      where: {
        id: sheetId,
        clientId,
        status: { not: 'DELETED' },
      },
      include: {
        columns: {
          orderBy: { orderIndex: 'asc' },
        },
        entries: {
          include: {
            values: {
              include: {
                column: true,
              },
            },
          },
        },
      },
    });

    if (!sheet) {
      throw new NotFoundException('Expense sheet not found');
    }

    // Prepare data for export with ordered values
    const columns = sheet.columns.map((col) => col.name);
    const data = sheet.entries.map((entry) => {
      const row: Record<string, string> = {};
      
      // Create a map of column values
      const valueMap: Record<string, string> = {};
      entry.values.forEach((value) => {
        valueMap[value.column.name] = value.value;
      });
      
      // Build ordered object based on column order
      columns.forEach((colName) => {
        row[colName] = valueMap[colName] || '';
      });
      
      return row;
    });

    // Generate file content based on format
    if (format === ExportFormat.CSV) {
      return this.generateCsvContent(data, columns);
    } else if (format === ExportFormat.XLSX) {
      return await this.generateExcelContent(data, columns);
    }

    throw new Error('Unsupported export format');
  }

  private async generateCsvFile(data: Record<string, string>[], fields: string[], filePath: string) {
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);
    await fs.promises.writeFile(filePath, csv);
  }

  private generateCsvContent(data: Record<string, string>[], fields: string[]): string {
    const json2csvParser = new Parser({ fields });
    return json2csvParser.parse(data);
  }

  private async generateExcelFile(data: Record<string, string>[], columns: string[], filePath: string) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Expense Sheet');

    // Add headers
    worksheet.columns = columns.map((col) => ({ header: col, key: col, width: 20 }));

    // Add data rows
    data.forEach((row) => {
      worksheet.addRow(row);
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDDDDDD' },
    };

    // Save file
    await workbook.xlsx.writeFile(filePath);
  }

  private async generateExcelContent(data: Record<string, string>[], columns: string[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Expense Sheet');

    // Add headers
    worksheet.columns = columns.map((col) => ({ header: col, key: col, width: 20 }));

    // Add data rows
    data.forEach((row) => {
      worksheet.addRow(row);
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDDDDDD' },
    };

    // Return buffer instead of saving to file
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async getUserClientId(user: any): Promise<string> {
    const prisma = await this.tenantContext.getPrismaClient();
    const userRecord = await prisma.users.findUnique({
      where: { id: user.id },
      select: { clientId: true },
    });

    if (!userRecord) {
      throw new NotFoundException('User not found');
    }

    return userRecord.clientId;
  }
}
