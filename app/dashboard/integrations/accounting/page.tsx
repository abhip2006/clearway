'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Link2, RefreshCw, Settings2 } from 'lucide-react';

interface AccountMapping {
  id: string;
  source: string;
  targetAccount: string;
  targetClass?: string;
}

interface SyncLog {
  id: string;
  timestamp: string;
  type: string;
  status: 'success' | 'failure';
  recordsSync: number;
}

export default function AccountingIntegrationsPage() {
  const [qbConnected, setQbConnected] = useState(true);
  const [xeroConnected, setXeroConnected] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [syncFrequency, setSyncFrequency] = useState('daily');

  const accountMappings: AccountMapping[] = [
    { id: '1', source: 'Capital Calls', targetAccount: '1200 - Accounts Receivable', targetClass: 'Fund Operations' },
    { id: '2', source: 'Distributions', targetAccount: '2100 - Accounts Payable', targetClass: 'Investor Relations' },
    { id: '3', source: 'Management Fees', targetAccount: '4100 - Revenue', targetClass: 'Fund Management' },
  ];

  const syncLogs: SyncLog[] = [
    { id: '1', timestamp: '2025-11-18T10:30:00Z', type: 'Capital Calls', status: 'success', recordsSync: 12 },
    { id: '2', timestamp: '2025-11-18T09:15:00Z', type: 'Invoices', status: 'success', recordsSync: 8 },
    { id: '3', timestamp: '2025-11-17T10:30:00Z', type: 'Payments', status: 'failure', recordsSync: 0 },
  ];

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Accounting Integrations
        </h1>
        <p className="text-muted-foreground">
          Connect and sync with QuickBooks and Xero
        </p>
      </div>

      <Tabs defaultValue="quickbooks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="quickbooks">QuickBooks</TabsTrigger>
          <TabsTrigger value="xero">Xero</TabsTrigger>
        </TabsList>

        <TabsContent value="quickbooks" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>QuickBooks Connection</CardTitle>
                  <CardDescription>
                    Manage your QuickBooks Online integration
                  </CardDescription>
                </div>
                {qbConnected ? (
                  <Badge className="bg-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="w-3 h-3 mr-1" />
                    Disconnected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {qbConnected ? (
                <>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <Label className="text-muted-foreground">Company Name</Label>
                      <p className="font-medium mt-1">Clearway Capital Partners</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Account ID</Label>
                      <p className="font-mono text-sm mt-1">QB-123456789</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Last Sync</Label>
                      <p className="text-sm mt-1">{formatDateTime('2025-11-18T10:30:00Z')}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Connected Since</Label>
                      <p className="text-sm mt-1">Oct 15, 2025</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-Sync</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically sync data with QuickBooks
                        </p>
                      </div>
                      <Switch checked={autoSync} onCheckedChange={setAutoSync} />
                    </div>

                    {autoSync && (
                      <div className="space-y-2">
                        <Label htmlFor="sync-freq">Sync Frequency</Label>
                        <Select value={syncFrequency} onValueChange={setSyncFrequency}>
                          <SelectTrigger id="sync-freq" className="w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Now
                    </Button>
                    <Button variant="outline" className="text-destructive hover:text-destructive">
                      Disconnect
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Connect your QuickBooks Online account to sync financial data
                  </p>
                  <Button>
                    <Link2 className="w-4 h-4 mr-2" />
                    Connect QuickBooks
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {qbConnected && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Account Mapping</CardTitle>
                  <CardDescription>
                    Map Clearway data to QuickBooks accounts and classes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>QuickBooks Account</TableHead>
                        <TableHead>QuickBooks Class</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accountMappings.map((mapping) => (
                        <TableRow key={mapping.id}>
                          <TableCell className="font-medium">{mapping.source}</TableCell>
                          <TableCell className="font-mono text-sm">{mapping.targetAccount}</TableCell>
                          <TableCell>{mapping.targetClass || '-'}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">
                              <Settings2 className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sync History</CardTitle>
                  <CardDescription>Recent synchronization activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Records</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                          <TableCell>{log.type}</TableCell>
                          <TableCell>
                            {log.status === 'success' ? (
                              <Badge className="bg-green-500">Success</Badge>
                            ) : (
                              <Badge variant="destructive">Failed</Badge>
                            )}
                          </TableCell>
                          <TableCell>{log.recordsSync}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="xero" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Xero Connection</CardTitle>
                  <CardDescription>
                    Manage your Xero integration
                  </CardDescription>
                </div>
                {xeroConnected ? (
                  <Badge className="bg-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="w-3 h-3 mr-1" />
                    Disconnected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Connect your Xero account to sync financial data
                </p>
                <Button>
                  <Link2 className="w-4 h-4 mr-2" />
                  Connect Xero
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
