# Analytics & Reporting Agent 📊

## Role
Specialized agent responsible for advanced analytics, interactive dashboards, custom reporting, data visualization, and business intelligence. Provides fund managers and investors with deep insights into capital call patterns, payment trends, and portfolio analytics.

## Primary Responsibilities

1. **Interactive Dashboards**
   - Real-time capital call dashboard
   - Payment trends and forecasting
   - Fund performance analytics
   - Investor activity heatmaps
   - Executive summary views

2. **Custom Report Builder**
   - Drag-and-drop report designer
   - Scheduled report generation
   - Multi-format export (PDF, Excel, CSV)
   - Email delivery automation
   - Report templates library

3. **Data Visualization**
   - Capital call timeline charts
   - Payment waterfall visualizations
   - Fund comparison matrices
   - Geographic distribution maps
   - Trend analysis graphs

4. **Predictive Analytics**
   - Payment timing predictions
   - Cashflow forecasting
   - Default risk scoring
   - Seasonal pattern detection
   - Anomaly detection

5. **Business Intelligence**
   - Drill-down analysis
   - Cohort analysis by fund vintage
   - Investor segmentation
   - Performance benchmarking
   - Custom metrics and KPIs

## Tech Stack

### Visualization Libraries
- **Recharts** for React charts
- **D3.js** for custom visualizations
- **Apache ECharts** for complex charts
- **Plotly.js** for interactive graphs

### Reporting Tools
- **Puppeteer** for PDF generation
- **ExcelJS** for Excel exports
- **jsPDF** for custom PDFs
- **React-PDF** for PDF templates

### Data Processing
- **Apache Druid** for OLAP analytics
- **ClickHouse** for analytics database
- **TimescaleDB** for time-series data
- **Redis** for real-time metrics

### BI Platform
- **Cube.js** for semantic layer
- **Metabase** for self-service BI
- **Apache Superset** for dashboards

## MVP Phase 2 Features

### Week 11-12: Interactive Dashboard System

**Task AN-001: Real-Time Capital Call Dashboard**
```typescript
// components/dashboard/capital-call-overview.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface DashboardMetrics {
  totalCapitalCalls: number;
  totalAmount: number;
  avgResponseTime: number; // hours
  paymentRate: number; // percentage
  overdueCount: number;
  upcomingCount: number;

  callsByMonth: Array<{
    month: string;
    count: number;
    amount: number;
  }>;

  callsByFund: Array<{
    fundName: string;
    count: number;
    totalAmount: number;
  }>;

  paymentStatusBreakdown: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

export function CapitalCallDashboard() {
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/dashboard');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      {/* Key Metrics Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Total Capital Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{metrics!.totalCapitalCalls}</div>
          <p className="text-sm text-muted-foreground">
            ${metrics!.totalAmount.toLocaleString()} total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avg Response Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{metrics!.avgResponseTime}h</div>
          <p className="text-sm text-muted-foreground">
            From notice to approval
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{metrics!.paymentRate}%</div>
          <p className="text-sm text-muted-foreground">
            Paid on time
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming / Overdue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            {metrics!.upcomingCount} / <span className="text-red-600">{metrics!.overdueCount}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Next 30 days / Overdue
          </p>
        </CardContent>
      </Card>

      {/* Capital Calls by Month */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Capital Calls Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart width={600} height={300} data={metrics!.callsByMonth}>
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="count" stroke="#8884d8" name="Count" />
            <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#82ca9d" name="Amount ($M)" />
          </LineChart>
        </CardContent>
      </Card>

      {/* Payment Status Breakdown */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <PieChart width={600} height={300}>
            <Pie
              data={metrics!.paymentStatusBreakdown}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              label={(entry) => `${entry.status}: ${entry.percentage}%`}
            />
            <Tooltip />
          </PieChart>
        </CardContent>
      </Card>

      {/* Top Funds by Volume */}
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Top Funds by Capital Call Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart width={1200} height={400} data={metrics!.callsByFund}>
            <XAxis dataKey="fundName" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="# of Calls" />
            <Bar yAxisId="right" dataKey="totalAmount" fill="#82ca9d" name="Total Amount ($M)" />
          </BarChart>
        </CardContent>
      </Card>
    </div>
  );
}
```

**API Endpoint for Dashboard Data**:
```typescript
// app/api/analytics/dashboard/route.ts

import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Fetch metrics
  const [
    totalCalls,
    callsByMonth,
    callsByFund,
    statusBreakdown,
    avgResponseTime,
    overdueCalls,
    upcomingCalls,
  ] = await Promise.all([
    // Total capital calls
    db.capitalCall.count({ where: { userId } }),

    // Calls by month (last 12 months)
    db.$queryRaw`
      SELECT
        TO_CHAR(DATE_TRUNC('month', "dueDate"), 'Mon YYYY') as month,
        COUNT(*)::int as count,
        SUM("amountDue")::float / 1000000 as amount
      FROM "CapitalCall"
      WHERE "userId" = ${userId}
        AND "dueDate" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', "dueDate")
      ORDER BY DATE_TRUNC('month', "dueDate")
    `,

    // Calls by fund
    db.capitalCall.groupBy({
      by: ['fundName'],
      where: { userId },
      _count: true,
      _sum: { amountDue: true },
      orderBy: { _count: { _all: 'desc' } },
      take: 10,
    }),

    // Status breakdown
    db.capitalCall.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    }),

    // Average response time
    db.$queryRaw<Array<{ avg_hours: number }>>`
      SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600)::float as avg_hours
      FROM "CapitalCall"
      WHERE "userId" = ${userId}
        AND status IN ('APPROVED', 'PAID')
    `,

    // Overdue calls
    db.capitalCall.count({
      where: {
        userId,
        status: 'APPROVED',
        dueDate: { lt: new Date() },
      },
    }),

    // Upcoming calls (next 30 days)
    db.capitalCall.count({
      where: {
        userId,
        status: 'APPROVED',
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  const totalAmount = await db.capitalCall.aggregate({
    where: { userId },
    _sum: { amountDue: true },
  });

  const paidOnTime = await db.capitalCall.count({
    where: {
      userId,
      status: 'PAID',
      paidAt: { lte: db.capitalCall.fields.dueDate },
    },
  });

  const totalPaid = await db.capitalCall.count({
    where: { userId, status: 'PAID' },
  });

  return Response.json({
    totalCapitalCalls: totalCalls,
    totalAmount: totalAmount._sum.amountDue?.toNumber() || 0,
    avgResponseTime: Math.round(avgResponseTime[0]?.avg_hours || 0),
    paymentRate: totalPaid > 0 ? Math.round((paidOnTime / totalPaid) * 100) : 0,
    overdueCount: overdueCalls,
    upcomingCount: upcomingCalls,
    callsByMonth,
    callsByFund: callsByFund.map(f => ({
      fundName: f.fundName,
      count: f._count,
      totalAmount: (f._sum.amountDue?.toNumber() || 0) / 1000000,
    })),
    paymentStatusBreakdown: statusBreakdown.map(s => ({
      status: s.status,
      count: s._count,
      percentage: Math.round((s._count / totalCalls) * 100),
    })),
  });
}
```

**Acceptance Criteria**:
- ✅ Real-time dashboard with 30-second refresh
- ✅ Key metrics cards (total calls, response time, payment rate)
- ✅ Interactive charts (line, bar, pie)
- ✅ Last 12 months trend analysis
- ✅ Top 10 funds by volume
- ✅ Payment status breakdown
- ✅ Responsive layout for mobile/tablet/desktop

---

**Task AN-002: Custom Report Builder**
```typescript
// lib/reporting/report-builder.ts

import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import { db } from '@/lib/db';

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

  private async fetchReportData(config: ReportConfig, userId: string) {
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

  private async generateExcel(data: any[], config: ReportConfig): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(config.name);

    // Add title
    worksheet.addRow([config.name]);
    worksheet.addRow([`Generated: ${new Date().toLocaleString()}`]);
    worksheet.addRow([`Period: ${config.dateRange.start.toLocaleDateString()} - ${config.dateRange.end.toLocaleDateString()}`]);
    worksheet.addRow([]);

    // Add headers
    const headers = config.columns.map(col => this.getColumnLabel(col));
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    for (const item of data) {
      const row = config.columns.map(col => this.getColumnValue(item, col));
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
      if (header.includes('amount') || header.includes('Amount')) {
        column.numFmt = '$#,##0.00';
      }
      if (header.includes('date') || header.includes('Date')) {
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

  private async generatePDF(data: any[], config: ReportConfig): Promise<Buffer> {
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
              ${config.columns.map(col => `<th>${this.getColumnLabel(col)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(item => `
              <tr>
                ${config.columns.map(col => `<td>${this.getColumnValue(item, col)}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <p>Total Records: ${data.length}</p>
          <p>Total Amount: $${this.sumColumn(data, 'amountDue').toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    // Use Puppeteer to generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html);

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });

    await browser.close();

    return pdf;
  }

  private async generateCSV(data: any[], config: ReportConfig): Promise<Buffer> {
    const csvRows: string[] = [];

    // Add headers
    csvRows.push(config.columns.map(col => this.getColumnLabel(col)).join(','));

    // Add data rows
    for (const item of data) {
      const row = config.columns.map(col => {
        const value = this.getColumnValue(item, col);
        return typeof value === 'string' && value.includes(',')
          ? `"${value}"`
          : value;
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
    };
    return labels[column] || column;
  }

  private getColumnValue(item: any, column: string): any {
    const value = item[column];

    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    if (typeof value === 'number') {
      return value.toLocaleString();
    }

    return value || '';
  }

  private sumColumn(data: any[], column: string): number {
    return data.reduce((sum, item) => {
      const value = item[column];
      return sum + (typeof value === 'number' ? value : value?.toNumber?.() || 0);
    }, 0);
  }
}

// Scheduled report service
export class ScheduledReportService {
  async createScheduledReport(params: {
    userId: string;
    reportConfig: ReportConfig;
    schedule: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    recipients: string[];
  }) {
    const scheduledReport = await db.scheduledReport.create({
      data: {
        userId: params.userId,
        name: params.reportConfig.name,
        config: params.reportConfig as any,
        schedule: params.schedule,
        recipients: params.recipients,
        active: true,
      },
    });

    // Schedule with cron
    // Daily: 0 9 * * * (9 AM daily)
    // Weekly: 0 9 * * 1 (9 AM Monday)
    // Monthly: 0 9 1 * * (9 AM 1st of month)
    const cronSchedule = {
      DAILY: '0 9 * * *',
      WEEKLY: '0 9 * * 1',
      MONTHLY: '0 9 1 * *',
    }[params.schedule];

    await inngest.send({
      name: 'reports.schedule',
      data: {
        scheduledReportId: scheduledReport.id,
        cronSchedule,
      },
    });

    return scheduledReport;
  }

  async executeScheduledReport(scheduledReportId: string) {
    const scheduled = await db.scheduledReport.findUnique({
      where: { id: scheduledReportId },
    });

    if (!scheduled || !scheduled.active) {
      return;
    }

    // Generate report
    const builder = new ReportBuilder();
    const reportBuffer = await builder.generateReport(
      scheduled.config as any,
      scheduled.userId
    );

    // Email to recipients
    const attachmentName = `${scheduled.name}_${new Date().toISOString().split('T')[0]}.${
      (scheduled.config as any).format.toLowerCase()
    }`;

    for (const recipient of scheduled.recipients) {
      await resend.emails.send({
        from: 'Clearway Reports <reports@clearway.com>',
        to: recipient,
        subject: `Scheduled Report: ${scheduled.name}`,
        text: `Please find attached your scheduled report.`,
        attachments: [
          {
            filename: attachmentName,
            content: reportBuffer.toString('base64'),
          },
        ],
      });
    }

    // Log execution
    await db.reportExecution.create({
      data: {
        scheduledReportId: scheduled.id,
        executedAt: new Date(),
        recipientCount: scheduled.recipients.length,
      },
    });
  }
}
```

**Acceptance Criteria**:
- ✅ Custom report builder with flexible filtering
- ✅ Excel export with formatting and summary
- ✅ PDF generation with Puppeteer
- ✅ CSV export
- ✅ Scheduled reports (daily/weekly/monthly)
- ✅ Email delivery with attachments
- ✅ Report execution tracking

---

**Task AN-003: Predictive Analytics Engine**
```typescript
// lib/analytics/predictive.ts

import * as tf from '@tensorflow/tfjs-node';

export class PaymentPredictionEngine {
  private model: tf.LayersModel | null = null;

  async train(historicalData: Array<{
    dueDate: Date;
    amountDue: number;
    fundName: string;
    paidAt: Date | null;
    status: string;
  }>) {
    // Prepare training data
    const features: number[][] = [];
    const labels: number[] = [];

    for (const record of historicalData) {
      if (record.paidAt) {
        // Features: day of week, day of month, amount (log scale), fund (encoded)
        features.push([
          record.dueDate.getDay(),
          record.dueDate.getDate(),
          Math.log(record.amountDue),
          this.encodeFund(record.fundName),
        ]);

        // Label: days from due date to payment (negative = early, positive = late)
        const daysToPayment = Math.floor(
          (record.paidAt.getTime() - record.dueDate.getTime()) / (24 * 60 * 60 * 1000)
        );
        labels.push(daysToPayment);
      }
    }

    // Create tensors
    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels, [labels.length, 1]);

    // Build model
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [4], units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 1 }),
      ],
    });

    // Compile
    this.model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'meanSquaredError',
      metrics: ['mae'],
    });

    // Train
    await this.model.fit(xs, ys, {
      epochs: 100,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch}: loss = ${logs?.loss}`);
        },
      },
    });

    // Save model
    await this.model.save('file://./models/payment-prediction');
  }

  async predictPaymentDate(capitalCall: {
    dueDate: Date;
    amountDue: number;
    fundName: string;
  }): Promise<{
    predictedDate: Date;
    confidence: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }> {
    if (!this.model) {
      await this.loadModel();
    }

    // Prepare features
    const features = tf.tensor2d([[
      capitalCall.dueDate.getDay(),
      capitalCall.dueDate.getDate(),
      Math.log(capitalCall.amountDue),
      this.encodeFund(capitalCall.fundName),
    ]]);

    // Predict days to payment
    const prediction = this.model!.predict(features) as tf.Tensor;
    const daysToPayment = (await prediction.data())[0];

    // Calculate predicted date
    const predictedDate = new Date(
      capitalCall.dueDate.getTime() + daysToPayment * 24 * 60 * 60 * 1000
    );

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    if (daysToPayment <= 0) {
      riskLevel = 'LOW'; // Paid early
    } else if (daysToPayment <= 7) {
      riskLevel = 'MEDIUM'; // Paid within a week after due
    } else {
      riskLevel = 'HIGH'; // Paid more than a week late
    }

    // Confidence based on model variance (simplified)
    const confidence = 1 - Math.min(Math.abs(daysToPayment) / 30, 1);

    return {
      predictedDate,
      confidence,
      riskLevel,
    };
  }

  private async loadModel() {
    this.model = await tf.loadLayersModel('file://./models/payment-prediction/model.json');
  }

  private encodeFund(fundName: string): number {
    // Simple hash-based encoding
    let hash = 0;
    for (let i = 0; i < fundName.length; i++) {
      hash = (hash << 5) - hash + fundName.charCodeAt(i);
    }
    return Math.abs(hash % 100);
  }
}

// Cashflow forecasting
export class CashflowForecastService {
  async forecastNextQuarter(userId: string): Promise<{
    months: Array<{
      month: string;
      expectedInflows: number;
      expectedOutflows: number;
      netCashflow: number;
      confidence: number;
    }>;
  }> {
    // Get historical data
    const historical = await db.capitalCall.findMany({
      where: {
        userId,
        dueDate: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
        },
      },
    });

    // Analyze seasonal patterns
    const monthlyAverages = this.calculateMonthlyAverages(historical);

    // Forecast next 3 months
    const forecast = [];
    for (let i = 0; i < 3; i++) {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + i + 1);
      const month = futureDate.getMonth();

      forecast.push({
        month: futureDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        expectedInflows: monthlyAverages[month] || 0,
        expectedOutflows: 0, // Would calculate distributions
        netCashflow: monthlyAverages[month] || 0,
        confidence: this.calculateConfidence(historical, month),
      });
    }

    return { months: forecast };
  }

  private calculateMonthlyAverages(data: any[]): Record<number, number> {
    const monthlyTotals: Record<number, number[]> = {};

    for (const call of data) {
      const month = new Date(call.dueDate).getMonth();
      if (!monthlyTotals[month]) {
        monthlyTotals[month] = [];
      }
      monthlyTotals[month].push(call.amountDue.toNumber());
    }

    const averages: Record<number, number> = {};
    for (const month in monthlyTotals) {
      const amounts = monthlyTotals[month];
      averages[month] = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    }

    return averages;
  }

  private calculateConfidence(data: any[], month: number): number {
    const monthData = data.filter(d => new Date(d.dueDate).getMonth() === month);
    return Math.min(monthData.length / 10, 1); // More data = higher confidence
  }
}
```

**Acceptance Criteria**:
- ✅ ML model for payment timing prediction
- ✅ Risk scoring (low/medium/high)
- ✅ Cashflow forecasting by month
- ✅ Seasonal pattern detection
- ✅ Confidence scoring
- ✅ Model training on historical data

---

## Database Schema Additions

```prisma
model ScheduledReport {
  id          String   @id @default(cuid())
  userId      String
  user        User @relation(fields: [userId], references: [id])

  name        String
  config      Json
  schedule    String   // DAILY, WEEKLY, MONTHLY
  recipients  String[]

  active      Boolean  @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  executions  ReportExecution[]

  @@index([userId])
}

model ReportExecution {
  id                 String   @id @default(cuid())
  scheduledReportId  String
  scheduledReport    ScheduledReport @relation(fields: [scheduledReportId], references: [id])

  executedAt         DateTime @default(now())
  recipientCount     Int

  @@index([scheduledReportId])
  @@index([executedAt(sort: Desc)])
}
```

---

**Analytics & Reporting Agent ready to provide deep insights and business intelligence for capital call management.**
