'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, ChevronLeft, ChevronRight, AlertTriangle, Shield, Info } from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  userAgent: string;
  securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata: Record<string, any>;
  success: boolean;
}

const SECURITY_LEVELS = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const ACTION_TYPES = [
  'ALL',
  'USER_LOGIN',
  'USER_LOGOUT',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DELETED',
  'CAPITAL_CALL_CREATED',
  'CAPITAL_CALL_APPROVED',
  'CAPITAL_CALL_REJECTED',
  'DOCUMENT_UPLOADED',
  'DOCUMENT_DELETED',
  'INTEGRATION_CONNECTED',
  'INTEGRATION_DISCONNECTED',
  'PAYMENT_PROCESSED',
  'EXPORT_GENERATED',
  'SSO_LOGIN',
  'MFA_ENABLED',
  'MFA_DISABLED',
  'PASSWORD_CHANGED',
  'API_KEY_CREATED',
  'API_KEY_REVOKED',
  'SETTINGS_UPDATED',
];

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [securityFilter, setSecurityFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 100;

  // Mock data
  const auditLogs: AuditLog[] = [
    {
      id: '1',
      timestamp: '2025-11-18T10:30:00Z',
      userId: 'user_123',
      userName: 'John Doe',
      action: 'USER_LOGIN',
      resourceType: 'User',
      resourceId: 'user_123',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      securityLevel: 'LOW',
      metadata: { method: 'email', mfaUsed: true },
      success: true,
    },
    {
      id: '2',
      timestamp: '2025-11-18T10:15:00Z',
      userId: 'user_456',
      userName: 'Jane Smith',
      action: 'CAPITAL_CALL_APPROVED',
      resourceType: 'CapitalCall',
      resourceId: 'cc_789',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      securityLevel: 'HIGH',
      metadata: { capitalCallId: 'cc_789', fundName: 'Apollo Fund XI', amount: 250000 },
      success: true,
    },
    {
      id: '3',
      timestamp: '2025-11-18T09:45:00Z',
      userId: 'user_789',
      userName: 'Admin User',
      action: 'USER_DELETED',
      resourceType: 'User',
      resourceId: 'user_999',
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
      securityLevel: 'CRITICAL',
      metadata: { deletedUser: 'old_user@example.com', reason: 'Account closure' },
      success: true,
    },
    {
      id: '4',
      timestamp: '2025-11-18T09:30:00Z',
      userId: 'user_123',
      userName: 'John Doe',
      action: 'DOCUMENT_UPLOADED',
      resourceType: 'Document',
      resourceId: 'doc_456',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      securityLevel: 'MEDIUM',
      metadata: { fileName: 'capital-call-2025-q4.pdf', fileSize: 2048000 },
      success: true,
    },
    {
      id: '5',
      timestamp: '2025-11-18T09:00:00Z',
      userId: 'user_456',
      userName: 'Jane Smith',
      action: 'API_KEY_CREATED',
      resourceType: 'ApiKey',
      resourceId: 'key_123',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      securityLevel: 'HIGH',
      metadata: { keyName: 'Production API Key', expiresAt: '2026-11-18' },
      success: true,
    },
    {
      id: '6',
      timestamp: '2025-11-18T08:45:00Z',
      userId: 'user_999',
      userName: 'Unknown User',
      action: 'USER_LOGIN',
      resourceType: 'User',
      resourceId: 'user_999',
      ipAddress: '185.220.101.45',
      userAgent: 'curl/7.68.0',
      securityLevel: 'CRITICAL',
      metadata: { method: 'password', mfaUsed: false, failedAttempts: 5 },
      success: false,
    },
  ];

  const getSecurityBadge = (level: string) => {
    switch (level) {
      case 'LOW':
        return <Badge className="bg-blue-500"><Info className="w-3 h-3 mr-1" />Low</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-500"><Shield className="w-3 h-3 mr-1" />Medium</Badge>;
      case 'HIGH':
        return <Badge className="bg-orange-500"><AlertTriangle className="w-3 h-3 mr-1" />High</Badge>;
      case 'CRITICAL':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Critical</Badge>;
      default:
        return null;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress.includes(searchTerm);

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesSecurity = securityFilter === 'ALL' || log.securityLevel === securityFilter;

    return matchesSearch && matchesAction && matchesSecurity;
  });

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const endIndex = startIndex + logsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  const handleExport = () => {
    // Generate CSV
    const headers = ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'Security Level', 'Success'];
    const rows = filteredLogs.map(log => [
      log.timestamp,
      log.userName,
      log.action,
      log.resourceType,
      log.resourceId,
      log.ipAddress,
      log.securityLevel,
      log.success.toString(),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Security Audit Logs
          </h1>
          <p className="text-muted-foreground">
            Monitor and track all security-related activities in your organization
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export to CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLogs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {filteredLogs.filter(l => l.securityLevel === 'CRITICAL').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {filteredLogs.filter(l => !l.success).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(filteredLogs.map(l => l.userId)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Log Entries</CardTitle>
          <CardDescription>
            Showing {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, action, or IP address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map(action => (
                  <SelectItem key={action} value={action}>{action.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={securityFilter} onValueChange={setSecurityFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Security level" />
              </SelectTrigger>
              <SelectContent>
                {SECURITY_LEVELS.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Security Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">{formatDateTime(log.timestamp)}</TableCell>
                  <TableCell>{log.userName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.action.replace(/_/g, ' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.resourceType}
                    <br />
                    <span className="text-muted-foreground text-xs">{log.resourceId}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.ipAddress}</TableCell>
                  <TableCell>{getSecurityBadge(log.securityLevel)}</TableCell>
                  <TableCell>
                    {log.success ? (
                      <Badge className="bg-green-500">Success</Badge>
                    ) : (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(log)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Event ID: {selectedLog?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="font-mono text-sm mt-1">{formatDateTime(selectedLog.timestamp)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User</p>
                  <p className="mt-1">{selectedLog.userName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Action</p>
                  <p className="mt-1">{selectedLog.action.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Security Level</p>
                  <div className="mt-1">{getSecurityBadge(selectedLog.securityLevel)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resource Type</p>
                  <p className="mt-1">{selectedLog.resourceType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resource ID</p>
                  <p className="font-mono text-sm mt-1">{selectedLog.resourceId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IP Address</p>
                  <p className="font-mono text-sm mt-1">{selectedLog.ipAddress}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">
                    {selectedLog.success ? (
                      <Badge className="bg-green-500">Success</Badge>
                    ) : (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">User Agent</p>
                <p className="font-mono text-xs p-3 bg-muted rounded">{selectedLog.userAgent}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Metadata</p>
                <pre className="p-3 bg-muted rounded text-xs font-mono overflow-auto">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
