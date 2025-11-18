// Analytics Dashboard Page - Enhanced with Phase 2 ML Features
// Task AN-001: Real-Time Capital Call Dashboard

'use client';

import { useState } from 'react';
import { CapitalCallDashboard } from '@/components/dashboard/capital-call-overview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d');

  // Mock ML prediction data
  const paymentPredictions = [
    { date: '2025-11', predicted: 1250000, actual: 1180000, confidence: 0.95 },
    { date: '2025-12', predicted: 1380000, actual: 1420000, confidence: 0.92 },
    { date: '2026-01', predicted: 1520000, actual: null, confidence: 0.89 },
    { date: '2026-02', predicted: 1450000, actual: null, confidence: 0.87 },
    { date: '2026-03', predicted: 1680000, actual: null, confidence: 0.85 },
  ];

  // Mock cashflow forecast data
  const cashflowForecast = [
    { month: 'Nov', inflow: 850000, outflow: 620000, net: 230000 },
    { month: 'Dec', inflow: 920000, outflow: 680000, net: 240000 },
    { month: 'Jan', inflow: 1050000, outflow: 720000, net: 330000 },
    { month: 'Feb', inflow: 980000, outflow: 650000, net: 330000 },
    { month: 'Mar', inflow: 1120000, outflow: 780000, net: 340000 },
    { month: 'Apr', inflow: 1180000, outflow: 820000, net: 360000 },
  ];

  // Mock anomaly alerts
  const anomalies = [
    { id: '1', type: 'payment_delay', severity: 'medium', message: 'Unusual payment delay detected for Apollo Fund XI', date: '2025-11-18' },
    { id: '2', type: 'amount_variance', severity: 'low', message: 'Payment amount 15% higher than historical average', date: '2025-11-17' },
    { id: '3', type: 'new_pattern', severity: 'info', message: 'New payment pattern detected: quarterly clustering', date: '2025-11-16' },
  ];

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-blue-500',
      info: 'bg-gray-500',
    };
    return `inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white ${colors[severity]}`;
  };

  const handleExportChart = (chartName: string) => {
    console.log(`Exporting ${chartName} chart`);
    // Implementation would use html2canvas or similar
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="mt-2 text-sm text-gray-600">
                Real-time insights, ML predictions, and metrics for your capital calls
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="predictions">ML Predictions</TabsTrigger>
              <TabsTrigger value="forecast">Cashflow Forecast</TabsTrigger>
              <TabsTrigger value="anomalies">Anomaly Detection</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <CapitalCallDashboard />
            </TabsContent>

            <TabsContent value="predictions" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Prediction Accuracy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">91.5%</div>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +2.3% from last month
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Next Month Forecast</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$1.52M</div>
                    <p className="text-xs text-muted-foreground mt-1">89% confidence</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Model Version</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">v2.1.0</div>
                    <p className="text-xs text-muted-foreground mt-1">Last trained: Nov 15</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Payment Predictions vs Actuals</CardTitle>
                      <CardDescription>
                        ML-powered payment predictions with confidence intervals
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportChart('predictions')}>
                      <Download className="w-4 h-4 mr-2" />
                      Export PNG
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={paymentPredictions}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`} />
                      <Legend />
                      <Line type="monotone" dataKey="predicted" stroke="#8b5cf6" strokeWidth={2} name="Predicted" />
                      <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} name="Actual" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="forecast" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>6-Month Cashflow Forecast</CardTitle>
                      <CardDescription>
                        Projected inflows and outflows based on historical patterns
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportChart('cashflow')}>
                      <Download className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={cashflowForecast}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`} />
                      <Legend />
                      <Bar dataKey="inflow" fill="#10b981" name="Inflow" />
                      <Bar dataKey="outflow" fill="#ef4444" name="Outflow" />
                      <Bar dataKey="net" fill="#3b82f6" name="Net" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg Monthly Inflow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">$1.02M</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg Monthly Outflow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">$712K</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg Net Cashflow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">$305K</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="anomalies" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Anomaly Detection Alerts</CardTitle>
                  <CardDescription>
                    AI-powered detection of unusual patterns and behaviors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {anomalies.map((anomaly) => (
                      <div key={anomaly.id} className="flex items-start gap-4 p-4 border rounded-lg">
                        <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          anomaly.severity === 'high' ? 'text-red-500' :
                          anomaly.severity === 'medium' ? 'text-yellow-500' :
                          anomaly.severity === 'low' ? 'text-blue-500' :
                          'text-gray-500'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium">{anomaly.message}</h4>
                            <span className={getSeverityBadge(anomaly.severity)}>
                              {anomaly.severity.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {new Date(anomaly.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Anomalies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{anomalies.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Critical Alerts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {anomalies.filter(a => a.severity === 'high').length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Detection Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">98.2%</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
