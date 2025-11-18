# Analytics & Reporting - Quick Start Guide

## Getting Started

### 1. View the Analytics Dashboard

Navigate to `/dashboard/analytics` to see the real-time capital call dashboard.

The dashboard automatically refreshes every 30 seconds and displays:
- Total capital calls and aggregate amounts
- Average response time metrics
- Payment rate statistics
- Upcoming and overdue capital calls
- Monthly trends (last 12 months)
- Payment status breakdown
- Top 10 funds by volume

### 2. Generate a Custom Report

#### Via API

```typescript
// Example: Generate Excel report for Q4 2024
const response = await fetch('/api/reports/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Q4 2024 Capital Calls',
    type: 'CAPITAL_CALLS',
    dateRange: {
      start: '2024-10-01',
      end: '2024-12-31',
    },
    filters: {
      statuses: ['PAID', 'APPROVED'],
      minAmount: 50000,
    },
    columns: ['fundName', 'amountDue', 'dueDate', 'status', 'paidAt'],
    sortBy: { field: 'dueDate', direction: 'desc' },
    format: 'EXCEL',
  }),
});

// Download the file
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'Q4_2024_Report.xlsx';
a.click();
```

### 3. Schedule Automated Reports

```typescript
// Create a weekly scheduled report
const response = await fetch('/api/reports/schedule', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reportConfig: {
      name: 'Weekly Capital Call Summary',
      type: 'CAPITAL_CALLS',
      dateRange: {
        start: new Date(),
        end: new Date(),
      },
      columns: ['fundName', 'amountDue', 'dueDate', 'status'],
      format: 'EXCEL',
    },
    schedule: 'WEEKLY',
    recipients: ['manager@fund.com', 'cfo@fund.com'],
  }),
});

const scheduledReport = await response.json();
```

### 4. Get Payment Predictions

```typescript
// Predict when a capital call will be paid
const response = await fetch('/api/analytics/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capitalCallId: 'cc_abc123',
  }),
});

const prediction = await response.json();
// {
//   predictedDate: '2024-12-15T00:00:00.000Z',
//   confidence: 0.85,
//   riskLevel: 'LOW'
// }
```

### 5. Forecast Cashflow

```typescript
// Get 3-month cashflow forecast
const response = await fetch('/api/analytics/forecast');
const forecast = await response.json();

// {
//   months: [
//     {
//       month: 'January 2025',
//       expectedInflows: 2500000,
//       expectedOutflows: 0,
//       netCashflow: 2500000,
//       confidence: 0.78
//     },
//     ...
//   ]
// }
```

### 6. Analyze Seasonal Patterns

```typescript
// Detect seasonal patterns in capital calls
const response = await fetch('/api/analytics/patterns');
const patterns = await response.json();

// {
//   patterns: [
//     {
//       month: 'January',
//       avgAmount: 1500000,
//       callCount: 12,
//       peakActivity: true
//     },
//     ...
//   ]
// }
```

## Component Usage

### Embed the Dashboard

```tsx
import { CapitalCallDashboard } from '@/components/dashboard/capital-call-overview';

export default function MyPage() {
  return (
    <div>
      <h1>Analytics</h1>
      <CapitalCallDashboard />
    </div>
  );
}
```

## Report Configuration Options

### Available Columns
- `fundName` - Fund Name
- `amountDue` - Amount Due
- `dueDate` - Due Date
- `status` - Status
- `paidAt` - Paid At
- `investorEmail` - Investor Email
- `wireReference` - Wire Reference
- `bankName` - Bank Name
- `accountNumber` - Account Number
- `routingNumber` - Routing Number
- `createdAt` - Created At
- `approvedAt` - Approved At

### Filter Options
- `fundNames` - Array of fund names to include
- `statuses` - Array of statuses (PENDING_REVIEW, APPROVED, PAID, REJECTED)
- `minAmount` - Minimum amount (number)
- `maxAmount` - Maximum amount (number)

### Format Options
- `EXCEL` - Excel spreadsheet with formatting
- `CSV` - Comma-separated values
- `PDF` - PDF document (HTML template)

### Schedule Options
- `DAILY` - Execute at 9 AM daily
- `WEEKLY` - Execute at 9 AM every Monday
- `MONTHLY` - Execute at 9 AM on the 1st of each month

## API Response Types

### Dashboard Metrics
```typescript
interface DashboardMetrics {
  totalCapitalCalls: number;
  totalAmount: number;
  avgResponseTime: number;
  paymentRate: number;
  overdueCount: number;
  upcomingCount: number;
  callsByMonth: Array<{ month: string; count: number; amount: number }>;
  callsByFund: Array<{ fundName: string; count: number; totalAmount: number }>;
  paymentStatusBreakdown: Array<{ status: string; count: number; percentage: number }>;
}
```

### Payment Prediction
```typescript
interface PaymentPrediction {
  predictedDate: Date;
  confidence: number; // 0-1
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}
```

### Cashflow Forecast
```typescript
interface CashflowForecast {
  months: Array<{
    month: string;
    expectedInflows: number;
    expectedOutflows: number;
    netCashflow: number;
    confidence: number; // 0-1
  }>;
}
```

## Error Handling

All API endpoints return appropriate HTTP status codes:
- `200` - Success
- `400` - Bad request (invalid parameters)
- `401` - Unauthorized (not authenticated)
- `404` - Not found (resource doesn't exist)
- `500` - Internal server error

Example error response:
```json
{
  "error": "Insufficient historical data",
  "message": "Need at least 10 paid capital calls to make predictions"
}
```

## Performance Tips

1. **Dashboard Refresh**: The dashboard auto-refreshes every 30 seconds. Adjust the `refetchInterval` in the component if needed.

2. **Report Generation**: Large reports (1000+ records) may take a few seconds. Consider adding a loading indicator.

3. **ML Predictions**: Requires at least 10 historical paid capital calls. More data improves accuracy.

4. **Caching**: React Query automatically caches dashboard data. Manually invalidate if needed:
   ```typescript
   queryClient.invalidateQueries(['dashboard-metrics']);
   ```

## Database Setup

After schema changes, run:
```bash
npx prisma generate
npx prisma db push
```

## Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `RESEND_API_KEY` - Resend API key for email delivery
- `CLERK_SECRET_KEY` - Clerk authentication key

## Troubleshooting

### Dashboard not loading
- Check database connection
- Verify user authentication
- Check browser console for errors

### Report generation fails
- Verify date range is valid
- Check filter parameters
- Ensure user has capital calls in the date range

### ML predictions not working
- Ensure at least 10 paid capital calls exist
- Check that historical data has `paidAt` dates
- Verify capital call status is 'PAID'

### Scheduled reports not executing
- Verify Inngest is properly configured
- Check scheduled report is active
- Review execution logs in `ReportExecution` table

## Support

For issues or questions, refer to:
- Full documentation: `/ANALYTICS_AGENT_REPORT.md`
- Agent specification: `/agents/phase-2/analytics-reporting-agent.md`
- Type definitions: `/lib/analytics/types.ts`
