'use client';

// Task AN-001: Real-Time Capital Call Dashboard
// Analytics & Reporting Agent - Week 11-12

import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      ))}
    </div>
  );
}

export function CapitalCallDashboard() {
  const { data: metrics, isLoading, error } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard metrics');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">Failed to load dashboard metrics. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      {/* Key Metrics Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">Total Capital Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{metrics.totalCapitalCalls}</div>
          <p className="text-sm text-gray-500 mt-2">
            ${metrics.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">Avg Response Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{metrics.avgResponseTime}h</div>
          <p className="text-sm text-gray-500 mt-2">
            From notice to approval
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">Payment Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{metrics.paymentRate}%</div>
          <p className="text-sm text-gray-500 mt-2">
            Paid on time
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">Upcoming / Overdue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            {metrics.upcomingCount} / <span className="text-red-600">{metrics.overdueCount}</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Next 30 days / Overdue
          </p>
        </CardContent>
      </Card>

      {/* Capital Calls by Month */}
      <Card className="col-span-full lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Capital Calls Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.callsByMonth}>
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="count"
                stroke="#8884d8"
                name="Count"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="amount"
                stroke="#82ca9d"
                name="Amount ($M)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Payment Status Breakdown */}
      <Card className="col-span-full lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={metrics.paymentStatusBreakdown}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.status}: ${entry.percentage}%`}
              >
                {metrics.paymentStatusBreakdown.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Funds by Volume */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="text-lg">Top Funds by Capital Call Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={metrics.callsByFund}>
              <XAxis dataKey="fundName" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="# of Calls" />
              <Bar yAxisId="right" dataKey="totalAmount" fill="#82ca9d" name="Total Amount ($M)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
