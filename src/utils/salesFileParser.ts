import * as XLSX from 'xlsx';
import { BadRequestException } from '@nestjs/common';
import * as cheerio from 'cheerio';

// DTO aligned interfaces
export interface SaleItem {
  productId?: string;
  pluUpc?: string;
  quantity: number;
  allowance?: number;
  packType: string; // ITEM | BOX
  packId?: string;
  packOf?: number;
}

export interface ParsedSale {
  customerPhoneNumber?: string;
  customerName?: string;
  storeId: string;
  clientId: string;
  saleItems: SaleItem[];
  paymentMethod: string;
  source: string;
  totalAmount: number;
  subTotalAmount?: number;
  tax?: number;
  discount?: number;
  generateInvoice?: boolean;
  businessInfo?: boolean;
  cashierName?: string;
  description?: string;
  shippingAddress?: string;
  shippingCountry?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingStreet?: string;
  useCustomerAddress?: boolean;
}

export interface ParsedResult {
  sales: ParsedSale[];
  errors: {
    row: number;
    reason: string;
    rawData: any;
  }[];
}

// Helper: Extract sales table from HTML
// function extractSalesTable(html: string): string {
//   const $ = cheerio.load(html);

//   let targetTable: any = null;

//   $('table').each((_, el) => {
//     // collect first row texts (could be header row)
//     const headers = $(el)
//       .find('tr')
//       .first()
//       .find('td')
//       .map((i, td) => {
//         return $(td).text().replace(/\s+/g, ' ').trim();
//       })
//       .get();

//     console.log('Found headers:', headers);

//     if (headers.some((h) => h.includes('PLU Number'))) {
//       targetTable = el;
//       return false; // break loop
//     }
//   });

//   if (!targetTable) {
//     throw new BadRequestException('Could not find sales table in HTML');
//   }

//   return $.html(targetTable);
// }

function extractSalesTable(html: string): string {
  const $ = cheerio.load(html);

  let targetTable: any = null;

  // Keywords we expect in the header row
  const expectedHeaders = ['plu number', 'description', 'items', 'tot sales'];

  $('table').each((_, el) => {
    const rows = $(el).find('tr');

    rows.each((_, row) => {
      const headers = $(row)
        .find('td, th')
        .map((i, cell) =>
          $(cell).text().replace(/\s+/g, ' ').trim().toLowerCase(),
        )
        .get();

      if (headers.length === 0) return;

      // count matches with expected headers
      const matches = expectedHeaders.filter((h) =>
        headers.some((cell) => cell.includes(h)),
      );

      if (matches.length >= 2) {
        targetTable = el;
        return false; // break inner loop
      }
    });

    if (targetTable) return false; // break outer loop
  });

  if (!targetTable) {
    throw new BadRequestException('Could not find sales table in HTML');
  }

  return $.html(targetTable);
}

export function parseExcelOrHTML(
  file: {
    buffer: Buffer;
    originalname: string;
  },
  storeId: string,
  clientId: string,
): ParsedResult {
  try {
    if (!file.originalname.match(/\.(xlsx|xls|csv|html)$/)) {
      throw new BadRequestException(
        'Only Excel and HTML files (.xlsx, .xls, .csv, .html) are allowed',
      );
    }

    let workbook: XLSX.WorkBook;

    if (file.originalname.endsWith('.html')) {
      const html = file.buffer.toString();
      const salesTableHtml = extractSalesTable(html);
      workbook = XLSX.read(salesTableHtml, { type: 'string' });
    } else {
      workbook = XLSX.read(file.buffer, { type: 'buffer' });
    }

    if (workbook.SheetNames.length === 0) {
      throw new BadRequestException('File is empty');
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (rawData.length === 0) {
      throw new BadRequestException('No data found in file');
    }

    const parsedResult: ParsedResult = {
      sales: [],
      errors: [],
    };

    rawData.forEach((row: any, index: number) => {
      try {
        let pluUpc =
          row['PLU/UPC']?.toString().trim() ||
          row['plu/upc*']?.toString() ||
          row['PLU Number']?.toString() ||
          row.PLU?.toString().trim() ||
          undefined;

        if (pluUpc && pluUpc.includes('/')) {
          pluUpc = pluUpc.substring(0, pluUpc.indexOf('/'));
        }

        const quantity = Number(
          row['quantity*'] ||
            row.Quantity ||
            row.Items ||
            row.items ||
            row.IndividualItemQuantity ||
            row.Cust || // sometimes Cust means quantity
            0,
        );

        if (!pluUpc || !quantity || isNaN(quantity) || quantity <= 0) {
          parsedResult.errors.push({
            row: index + 1,
            reason: !pluUpc
              ? 'PLU Number is missing'
              : 'Quantity is missing or invalid',
            rawData: row,
          });
          return;
        }

        const sale: ParsedSale = {
          customerName:
            row.CustomerName?.toString().trim() ||
            row['customer name']?.toString() ||
            undefined,
          customerPhoneNumber:
            row.CustomerPhoneNumber?.toString().trim() ||
            row.CustomerPhone?.toString().trim() ||
            row['customer phone number']?.toString() ||
            undefined,
          storeId,
          clientId,
          cashierName: row.CashierName?.toString().trim() || undefined,
          description:
            row.Description?.toString().trim() ||
            row['Description'] ||
            row['description']?.toString() ||
            undefined,

          totalAmount: Number(
            row['total amount*'] ||
              row.TotalAmount ||
              row.TotalPrice ||
              row.Price ||
              0,
          ),
          subTotalAmount: row.SubTotalAmount
            ? Number(row.SubTotalAmount)
            : undefined,
          tax: row.tax ? Number(row.tax) : undefined,
          discount: row.discount ? Number(row.discount) : undefined,

          generateInvoice:
            row.GenerateInvoice === 'true' || row.GenerateInvoice === true,
          businessInfo:
            row.BusinessInfo === 'true' || row.BusinessInfo === true,
          useCustomerAddress:
            row.UseCustomerAddress === 'true' ||
            row.UseCustomerAddress === true,

          shippingAddress:
            row.ShippingAddress?.toString().trim() ||
            row['shipping address']?.toString() ||
            undefined,
          shippingCountry:
            row.ShippingCountry?.toString().trim() ||
            row['shipping country']?.toString() ||
            undefined,
          shippingCity:
            row.ShippingCity?.toString().trim() ||
            row['shipping city']?.toString() ||
            undefined,
          shippingState:
            row.ShippingState?.toString().trim() ||
            row['shipping state']?.toString() ||
            undefined,
          shippingZipCode:
            row.ShippingZipCode?.toString().trim() ||
            row['shipping zipCode']?.toString() ||
            undefined,
          shippingStreet:
            row.ShippingStreet?.toString().trim() ||
            row['shipping street']?.toString() ||
            undefined,

          paymentMethod: row.PaymentMethod?.toString().trim() || 'CASH',
          source: row.Source?.toString().toLowerCase() || 'manual',

          saleItems: [
            {
              productId: row.ProductId?.toString().trim() || undefined,
              pluUpc,
              quantity,
              allowance: row.allowance ? Number(row.allowance) : undefined,
              packType:
                row.PackType?.toString().toUpperCase().trim() ||
                row['unit(ITEM/BOX)']?.toString().toUpperCase().trim() ||
                row.Unit?.toString().toUpperCase().trim() ||
                'ITEM',
              packId: row.PackId?.toString().trim() || undefined,
              packOf: row.packOf || row['box of'] || undefined,
            },
          ],
        };

        parsedResult.sales.push(sale);
      } catch (e) {
        parsedResult.errors.push({
          row: index + 1,
          reason: `Unexpected error: ${e.message}`,
          rawData: row,
        });
      }
    });

    console.log("parsedResult",parsedResult)
    return parsedResult;
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException(`Failed to parse file: ${error.message}`);
  }
}
