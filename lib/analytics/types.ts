// Analytics Type Definitions
// Analytics & Reporting Agent - Week 11-12

export interface DashboardMetrics {
  totalCapitalCalls: number;
  totalAmount: number;
  avgResponseTime: number;
  paymentRate: number;
  overdueCount: number;
  upcomingCount: number;
  callsByMonth: MonthlyMetric[];
  callsByFund: FundMetric[];
  paymentStatusBreakdown: StatusMetric[];
}

export interface MonthlyMetric {
  month: string;
  count: number;
  amount: number;
}

export interface FundMetric {
  fundName: string;
  count: number;
  totalAmount: number;
}

export interface StatusMetric {
  status: string;
  count: number;
  percentage: number;
}

export interface PaymentPrediction {
  predictedDate: Date;
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface CashflowForecast {
  months: MonthlyForecast[];
}

export interface MonthlyForecast {
  month: string;
  expectedInflows: number;
  expectedOutflows: number;
  netCashflow: number;
  confidence: number;
}

export interface SeasonalPattern {
  month: string;
  avgAmount: number;
  callCount: number;
  peakActivity: boolean;
}

export interface ScheduledReportParams {
  userId: string;
  reportConfig: ReportConfig;
  schedule: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  recipients: string[];
}

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
