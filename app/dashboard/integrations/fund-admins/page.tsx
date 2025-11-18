'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Plus, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface FundAdminConnection {
  id: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSync: string;
  capitalCallsSynced: number;
  investorsSynced: number;
  distributionsSynced: number;
}

interface SyncLog {
  id: string;
  timestamp: string;
  type: string;
  status: 'success' | 'partial_failure' | 'failure';
  recordsSynced: number;
  errors: number;
}

export default function FundAdminsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  // Mock data - replace with actual API calls
  const connections: FundAdminConnection[] = [
    {
      id: '1',
      provider: 'SS&C Geneva',
      status: 'connected',
      lastSync: '2025-11-18T06:30:00Z',
      capitalCallsSynced: 45,
      investorsSynced: 128,
      distributionsSynced: 23,
    },
    {
      id: '2',
      provider: 'Carta',
      status: 'connected',
      lastSync: '2025-11-18T05:15:00Z',
      capitalCallsSynced: 32,
      investorsSynced: 94,
      distributionsSynced: 15,
    },
  ];

  const syncLogs: SyncLog[] = [
    {
      id: '1',
      timestamp: '2025-11-18T06:30:00Z',
      type: 'Capital Calls',
      status: 'success',
      recordsSynced: 12,
      errors: 0,
    },
    {
      id: '2',
      timestamp: '2025-11-18T05:15:00Z',
      type: 'Investors',
      status: 'success',
      recordsSynced: 8,
      errors: 0,
    },
    {
      id: '3',
      timestamp: '2025-11-18T04:00:00Z',
      type: 'Distributions',
      status: 'partial_failure',
      recordsSynced: 5,
      errors: 2,
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
      case 'disconnected':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Disconnected</Badge>;
      case 'syncing':
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1 animate-spin" />Syncing</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return null;
    }
  };

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Success</Badge>;
      case 'partial_failure':
        return <Badge className="bg-yellow-500">Partial</Badge>;
      case 'failure':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return null;
    }
  };

  const handleManualSync = async (connectionId: string) => {
    setIsSyncing(connectionId);
    // Simulate API call
    setTimeout(() => {
      setIsSyncing(null);
    }, 2000);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
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
            Fund Administrator Integrations
          </h1>
          <p className="text-muted-foreground">
            Connect and sync data from your fund administrator platforms
          </p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Connect Fund Administrator
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Connect Fund Administrator</DialogTitle>
              <DialogDescription>
                Select your fund administrator and configure the connection
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger id="provider">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ssc">SS&C Geneva</SelectItem>
                    <SelectItem value="carta">Carta</SelectItem>
                    <SelectItem value="juniper">Juniper Square</SelectItem>
                    <SelectItem value="altvia">Altvia</SelectItem>
                    <SelectItem value="allvue">Allvue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedProvider && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input id="api-key" type="password" placeholder="Enter your API key" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-secret">API Secret</Label>
                    <Input id="api-secret" type="password" placeholder="Enter your API secret" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="environment">Environment</Label>
                    <Select defaultValue="production">
                      <SelectTrigger id="environment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="sandbox">Sandbox</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsModalOpen(false)}>
                Connect
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Connected Fund Administrators */}
      <div className="grid gap-6 mb-8">
        {connections.map((connection) => (
          <Card key={connection.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{connection.provider}</CardTitle>
                  <CardDescription>
                    Last synced: {formatDateTime(connection.lastSync)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(connection.status)}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleManualSync(connection.id)}
                    disabled={isSyncing === connection.id}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing === connection.id ? 'animate-spin' : ''}`} />
                    Sync Now
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="text-2xl font-bold">{connection.capitalCallsSynced}</div>
                  <div className="text-sm text-muted-foreground">Capital Calls</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-2xl font-bold">{connection.investorsSynced}</div>
                  <div className="text-sm text-muted-foreground">Investors</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-2xl font-bold">{connection.distributionsSynced}</div>
                  <div className="text-sm text-muted-foreground">Distributions</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
          <CardDescription>
            Recent synchronization activity from your fund administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Records Synced</TableHead>
                <TableHead>Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {syncLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                  <TableCell>{log.type}</TableCell>
                  <TableCell>{getSyncStatusBadge(log.status)}</TableCell>
                  <TableCell>{log.recordsSynced}</TableCell>
                  <TableCell>
                    {log.errors > 0 ? (
                      <span className="text-red-600">{log.errors}</span>
                    ) : (
                      <span className="text-green-600">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
