'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, Activity, Database, Clock } from 'lucide-react';

export default function PerformancePage() {
  // Mock performance data
  const apiResponseTimes = [
    { endpoint: '/api/capital-calls', p50: 45, p95: 120, p99: 250 },
    { endpoint: '/api/payments', p50: 38, p95: 95, p99: 180 },
    { endpoint: '/api/investors', p50: 52, p95: 140, p99: 320 },
    { endpoint: '/api/analytics', p50: 180, p95: 450, p99: 850 },
  ];

  const cacheMetrics = [
    { time: '00:00', hitRate: 92, missRate: 8 },
    { time: '04:00', hitRate: 94, missRate: 6 },
    { time: '08:00', hitRate: 89, missRate: 11 },
    { time: '12:00', hitRate: 91, missRate: 9 },
    { time: '16:00', hitRate: 93, missRate: 7 },
    { time: '20:00', hitRate: 95, missRate: 5 },
  ];

  const slowQueries = [
    { id: '1', query: 'SELECT * FROM capital_calls JOIN investors...', duration: 1250, calls: 45, table: 'capital_calls' },
    { id: '2', query: 'SELECT COUNT(*) FROM payments WHERE...', duration: 890, calls: 123, table: 'payments' },
    { id: '3', query: 'UPDATE investors SET last_sync...', duration: 720, calls: 28, table: 'investors' },
  ];

  const backgroundJobs = [
    { id: '1', name: 'Fund Admin Sync', status: 'running', progress: 65, started: '10:30 AM', eta: '10:45 AM' },
    { id: '2', name: 'Payment Reconciliation', status: 'completed', progress: 100, started: '09:15 AM', completed: '09:35 AM' },
    { id: '3', name: 'Analytics Refresh', status: 'queued', progress: 0, queued: '10:25 AM' },
    { id: '4', name: 'Email Notifications', status: 'failed', progress: 45, started: '08:00 AM', failed: '08:15 AM' },
  ];

  const materializedViews = [
    { name: 'capital_call_summary', lastRefresh: '2025-11-18T10:30:00Z', rowCount: 1250, size: '4.2 MB', status: 'current' },
    { name: 'investor_portfolio_view', lastRefresh: '2025-11-18T09:00:00Z', rowCount: 856, size: '2.8 MB', status: 'stale' },
    { name: 'payment_analytics_view', lastRefresh: '2025-11-18T10:15:00Z', rowCount: 3420, size: '8.5 MB', status: 'current' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-blue-500"><Activity className="w-3 h-3 mr-1 animate-pulse" />Running</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'queued':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Queued</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'current':
        return <Badge className="bg-green-500">Current</Badge>;
      case 'stale':
        return <Badge className="bg-yellow-500">Stale</Badge>;
      default:
        return null;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Performance Monitoring
          </h1>
          <p className="text-muted-foreground">
            Monitor system performance, cache metrics, and database health
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh All
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Cache Hit Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92.5%</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              +1.2% from yesterday
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78ms</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingDown className="w-3 h-3 mr-1" />
              -5ms from yesterday
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Database className="w-4 h-4" />
              DB Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12 / 100</div>
            <p className="text-xs text-muted-foreground mt-1">Active / Max</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground mt-1">3 queued</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api">API Performance</TabsTrigger>
          <TabsTrigger value="cache">Cache Metrics</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="jobs">Background Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Response Times (ms)</CardTitle>
              <CardDescription>
                Response time percentiles for key API endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={apiResponseTimes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="endpoint" angle={-15} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="p50" fill="#10b981" name="p50 (Median)" />
                  <Bar dataKey="p95" fill="#f59e0b" name="p95" />
                  <Bar dataKey="p99" fill="#ef4444" name="p99" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Redis Cache Hit Rate</CardTitle>
                <CardDescription>
                  Cache performance over the last 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cacheMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="hitRate" stroke="#10b981" strokeWidth={2} name="Hit Rate %" />
                    <Line type="monotone" dataKey="missRate" stroke="#ef4444" strokeWidth={2} name="Miss Rate %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Keys</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4,523</div>
                  <p className="text-xs text-muted-foreground mt-1">Cached keys</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Memory Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">142 MB</div>
                  <p className="text-xs text-muted-foreground mt-1">of 512 MB</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Evictions (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">23</div>
                  <p className="text-xs text-muted-foreground mt-1">LRU evictions</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear Cache
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="database">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Slow Queries</CardTitle>
                <CardDescription>
                  Database queries taking longer than 500ms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead>Duration (ms)</TableHead>
                      <TableHead>Calls (24h)</TableHead>
                      <TableHead>Table</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slowQueries.map((query) => (
                      <TableRow key={query.id}>
                        <TableCell className="font-mono text-xs max-w-[300px] truncate">
                          {query.query}
                        </TableCell>
                        <TableCell>
                          <Badge variant={query.duration > 1000 ? 'destructive' : 'outline'}>
                            {query.duration}ms
                          </Badge>
                        </TableCell>
                        <TableCell>{query.calls}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{query.table}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Materialized Views</CardTitle>
                <CardDescription>
                  Status and refresh times for materialized views
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>View Name</TableHead>
                      <TableHead>Last Refresh</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materializedViews.map((view) => (
                      <TableRow key={view.name}>
                        <TableCell className="font-mono text-sm">{view.name}</TableCell>
                        <TableCell>{formatDateTime(view.lastRefresh)}</TableCell>
                        <TableCell>{view.rowCount.toLocaleString()}</TableCell>
                        <TableCell>{view.size}</TableCell>
                        <TableCell>{getStatusBadge(view.status)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Refresh
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Background Jobs</CardTitle>
              <CardDescription>
                Monitor background job execution and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>ETA / Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backgroundJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.name}</TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${
                                job.status === 'completed' ? 'bg-green-500' :
                                job.status === 'failed' ? 'bg-red-500' :
                                'bg-blue-500'
                              }`}
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">{job.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{job.started || '-'}</TableCell>
                      <TableCell>
                        {job.eta || job.completed || (job.queued ? `Queued at ${job.queued}` : '-')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
