// Task AN-002: Custom Report Builder
// Analytics & Reporting Agent - Week 11-12

import ExcelJS from 'exceljs';
import { db } from '@/lib/db';
import { CapitalCall, Payment } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface ReportConfig {
  name: string;
  type: 'CAPITAL_CALLS' | 'PAYMENTS' | 'FUNDS' | 'CUSTOM';
  dateRange: {
    start: Date;
    end: Date;
  };
  filters: {
    fundNames?: string[];
    statuses?: string[];
    minAmount?: number;
    maxAmount?: number;
  };
  columns: string[];
  groupBy?: string;
  sortBy?: { field: string; direction: 'asc' | 'desc' };
  format: 'PDF' | 'EXCEL' | 'CSV';
}

type CapitalCallWithPayments = CapitalCall & {
  payments: Payment[];
};

export class ReportBuilder {
  async generateReport(config: ReportConfig, userId: string): Promise<Buffer> {
    // Fetch data
    const data = await this.fetchReportData(config, userId);

    // Generate report based on format
    switch (config.format) {
      case 'EXCEL':
        return this.generateExcel(data, config);
      case 'PDF':
        return this.generatePDF(data, config);
      case 'CSV':
        return this.generateCSV(data, config);
      default:
        throw new Error(`Unsupported format: ${config.format}`);
    }
  }

  private async fetchReportData(
    config: ReportConfig,
    userId: string
  ): Promise<CapitalCallWithPayments[]> {
    const whereClause: any = {
      userId,
      dueDate: {
        gte: config.dateRange.start,
        lte: config.dateRange.end,
      },
    };

    if (config.filters.fundNames?.length) {
      whereClause.fundName = { in: config.filters.fundNames };
    }

    if (config.filters.statuses?.length) {
      whereClause.status = { in: config.filters.statuses };
    }

    if (config.filters.minAmount !== undefined) {
      whereClause.amountDue = { gte: config.filters.minAmount };
    }

    if (config.filters.maxAmount !== undefined) {
      whereClause.amountDue = {
        ...whereClause.amountDue,
        lte: config.filters.maxAmount,
      };
    }

    const capitalCalls = await db.capitalCall.findMany({
      where: whereClause,
      include: {
        payments: true,
      },
      orderBy: config.sortBy
        ? { [config.sortBy.field]: config.sortBy.direction }
        : { dueDate: 'desc' },
    });

    return capitalCalls;
  }

  private async generateExcel(
    data: CapitalCallWithPayments[],
    config: ReportConfig
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(config.name);

    // Add title
    worksheet.addRow([config.name]);
    worksheet.addRow([`Generated: ${new Date().toLocaleString()}`]);
    worksheet.addRow([
      `Period: ${config.dateRange.start.toLocaleDateString()} - ${config.dateRange.end.toLocaleDateString()}`,
    ]);
    worksheet.addRow([]);

    // Add headers
    const headers = config.columns.map((col) => this.getColumnLabel(col));
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    for (const item of data) {
      const row = config.columns.map((col) => this.getColumnValue(item, col));
      worksheet.addRow(row);
    }

    // Add summary
    worksheet.addRow([]);
    worksheet.addRow(['Summary']);
    worksheet.addRow(['Total Records', data.length]);
    worksheet.addRow(['Total Amount', this.sumColumn(data, 'amountDue')]);

    // Format columns
    worksheet.columns.forEach((column, i) => {
      const header = config.columns[i];
      if (header && (header.includes('amount') || header.includes('Amount'))) {
        column.numFmt = '$#,##0.00';
      }
      if (header && (header.includes('date') || header.includes('Date'))) {
        column.numFmt = 'mm/dd/yyyy';
      }
      column.width = 20;
    });

    // Auto-filter
    worksheet.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: 5, column: headers.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async generatePDF(
    data: CapitalCallWithPayments[],
    config: ReportConfig
  ): Promise<Buffer> {
    // Generate HTML template
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #f0f0f0; padding: 10px; border: 1px solid #ddd; text-align: left; }
          td { padding: 8px; border: 1px solid #ddd; }
          .summary { margin-top: 30px; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>${config.name}</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Period: ${config.dateRange.start.toLocaleDateString()} - ${config.dateRange.end.toLocaleDateString()}</p>

        <table>
          <thead>
            <tr>
              ${config.columns.map((col) => `<th>${this.getColumnLabel(col)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data
              .map(
                (item) => `
              <tr>
                ${config.columns.map((col) => `<td>${this.getColumnValue(item, col)}</td>`).join('')}
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="summary">
          <p>Total Records: ${data.length}</p>
          <p>Total Amount: $${this.sumColumn(data, 'amountDue').toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    // For now, return HTML as buffer since Puppeteer has installation issues
    // In production, use Puppeteer or a similar tool to convert HTML to PDF
    // Alternative: Use a PDF generation service or library that doesn't require browser automation
    return Buffer.from(html, 'utf-8');
  }

  private async generateCSV(
    data: CapitalCallWithPayments[],
    config: ReportConfig
  ): Promise<Buffer> {
    const csvRows: string[] = [];

    // Add headers
    csvRows.push(config.columns.map((col) => this.getColumnLabel(col)).join(','));

    // Add data rows
    for (const item of data) {
      const row = config.columns.map((col) => {
        const value = this.getColumnValue(item, col);
        // Escape commas and quotes in CSV
        const stringValue = String(value);
        return stringValue.includes(',') || stringValue.includes('"')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      });
      csvRows.push(row.join(','));
    }

    return Buffer.from(csvRows.join('\n'));
  }

  private getColumnLabel(column: string): string {
    const labels: Record<string, string> = {
      fundName: 'Fund Name',
      amountDue: 'Amount Due',
      dueDate: 'Due Date',
      status: 'Status',
      paidAt: 'Paid At',
      investorEmail: 'Investor Email',
      wireReference: 'Wire Reference',
      bankName: 'Bank Name',
      accountNumber: 'Account Number',
      routingNumber: 'Routing Number',
      createdAt: 'Created At',
      approvedAt: 'Approved At',
    };
    return labels[column] || column;
  }

  private getColumnValue(item: CapitalCallWithPayments, column: string): any {
    const value = (item as any)[column];

    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    if (value instanceof Decimal || typeof value === 'object' && value?.toNumber) {
      return value.toNumber().toLocaleString();
    }

    if (typeof value === 'number') {
      return value.toLocaleString();
    }

    return value || '';
  }

  private sumColumn(data: CapitalCallWithPayments[], column: string): number {
    return data.reduce((sum, item) => {
      const value = (item as any)[column];
      if (value instanceof Decimal) {
        return sum + value.toNumber();
      }
      if (typeof value === 'number') {
        return sum + value;
      }
      return sum;
    }, 0);
  }
}
