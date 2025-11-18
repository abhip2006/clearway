'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Download, Trash2, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface DSARRequest {
  id: string;
  userEmail: string;
  requestType: 'ACCESS' | 'EXPORT' | 'DELETE' | 'RECTIFY';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: string;
  completedAt?: string;
  notes?: string;
}

export default function GDPRPage() {
  const [userEmail, setUserEmail] = useState('');
  const [requestType, setRequestType] = useState<string>('');
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  // Mock data
  const dsarRequests: DSARRequest[] = [
    {
      id: '1',
      userEmail: 'john.doe@example.com',
      requestType: 'ACCESS',
      status: 'completed',
      requestedAt: '2025-11-15T10:30:00Z',
      completedAt: '2025-11-15T12:45:00Z',
      notes: 'Data access request fulfilled',
    },
    {
      id: '2',
      userEmail: 'jane.smith@example.com',
      requestType: 'EXPORT',
      status: 'processing',
      requestedAt: '2025-11-17T14:20:00Z',
    },
    {
      id: '3',
      userEmail: 'bob.wilson@example.com',
      requestType: 'DELETE',
      status: 'pending',
      requestedAt: '2025-11-18T09:00:00Z',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  const getRequestTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      ACCESS: 'bg-blue-500',
      EXPORT: 'bg-green-500',
      DELETE: 'bg-red-500',
      RECTIFY: 'bg-yellow-500',
    };
    return <Badge className={colors[type]}>{type}</Badge>;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSubmitDSAR = (e: React.FormEvent) => {
    e.preventDefault();
    // Submit DSAR request
    console.log('Submitting DSAR:', { userEmail, requestType });
    setUserEmail('');
    setRequestType('');
  };

  const handleExportUserData = async () => {
    // Simulate data export
    const userData = {
      email: userEmail,
      exportedAt: new Date().toISOString(),
      data: {
        profile: { name: 'User Name', email: userEmail },
        capitalCalls: [],
        documents: [],
        auditLogs: [],
      },
    };

    const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-data-${userEmail}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleDeleteRequest = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting delete request:', { deleteEmail, deleteReason });
    setDeleteEmail('');
    setDeleteReason('');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
          <Shield className="w-8 h-8" />
          GDPR Data Management
        </h1>
        <p className="text-muted-foreground">
          Manage data subject access requests and ensure GDPR compliance
        </p>
      </div>

      {/* Compliance Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total DSAR Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dsarRequests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {dsarRequests.filter(r => r.status === 'pending' || r.status === 'processing').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">2.5 hours</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dsar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dsar">Data Subject Access Requests</TabsTrigger>
          <TabsTrigger value="export">Export User Data</TabsTrigger>
          <TabsTrigger value="delete">Right to be Forgotten</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Status</TabsTrigger>
        </TabsList>

        {/* DSAR Tab */}
        <TabsContent value="dsar">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Submit New DSAR Request</CardTitle>
                <CardDescription>
                  Create a new Data Subject Access Request for a user
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitDSAR} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="user-email">User Email</Label>
                      <Input
                        id="user-email"
                        type="email"
                        placeholder="user@example.com"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="request-type">Request Type</Label>
                      <Select value={requestType} onValueChange={setRequestType} required>
                        <SelectTrigger id="request-type">
                          <SelectValue placeholder="Select request type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACCESS">Data Access</SelectItem>
                          <SelectItem value="EXPORT">Data Export</SelectItem>
                          <SelectItem value="DELETE">Data Deletion</SelectItem>
                          <SelectItem value="RECTIFY">Data Rectification</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit">
                    <FileText className="w-4 h-4 mr-2" />
                    Submit Request
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>DSAR Request History</CardTitle>
                <CardDescription>
                  All data subject access requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Email</TableHead>
                      <TableHead>Request Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested At</TableHead>
                      <TableHead>Completed At</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dsarRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.userEmail}</TableCell>
                        <TableCell>{getRequestTypeBadge(request.requestType)}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{formatDateTime(request.requestedAt)}</TableCell>
                        <TableCell>
                          {request.completedAt ? formatDateTime(request.completedAt) : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {request.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Export User Data</CardTitle>
              <CardDescription>
                Download all data associated with a user account in JSON format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="export-email">User Email</Label>
                  <Input
                    id="export-email"
                    type="email"
                    placeholder="user@example.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Exported Data Includes:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>User profile information</li>
                    <li>Capital call history</li>
                    <li>Document uploads and downloads</li>
                    <li>Audit logs and activity history</li>
                    <li>Payment records</li>
                    <li>Integration connections</li>
                  </ul>
                </div>
                <Button onClick={handleExportUserData} disabled={!userEmail}>
                  <Download className="w-4 h-4 mr-2" />
                  Export User Data as JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delete Tab */}
        <TabsContent value="delete">
          <Card>
            <CardHeader>
              <CardTitle>Right to be Forgotten</CardTitle>
              <CardDescription>
                Submit a request to permanently delete user data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900 mb-1">Warning: Irreversible Action</h4>
                    <p className="text-sm text-red-800">
                      This action will permanently delete all user data and cannot be undone.
                      Ensure you have proper authorization before proceeding.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleDeleteRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="delete-email">User Email</Label>
                  <Input
                    id="delete-email"
                    type="email"
                    placeholder="user@example.com"
                    value={deleteEmail}
                    onChange={(e) => setDeleteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delete-reason">Reason for Deletion</Label>
                  <Input
                    id="delete-reason"
                    placeholder="User requested account deletion"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Submit Deletion Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>GDPR Compliance Status</CardTitle>
                <CardDescription>
                  Current compliance status and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Data Processing Records</h4>
                      <p className="text-sm text-muted-foreground">Article 30 compliance</p>
                    </div>
                    <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Compliant</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Data Subject Rights</h4>
                      <p className="text-sm text-muted-foreground">Access, export, and deletion</p>
                    </div>
                    <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Compliant</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Data Encryption</h4>
                      <p className="text-sm text-muted-foreground">At-rest and in-transit</p>
                    </div>
                    <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Compliant</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Audit Logging</h4>
                      <p className="text-sm text-muted-foreground">Complete activity tracking</p>
                    </div>
                    <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Compliant</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Data Retention Policy</h4>
                      <p className="text-sm text-muted-foreground">Automated data cleanup</p>
                    </div>
                    <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Compliant</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Protection Officer</CardTitle>
                <CardDescription>
                  Contact information for GDPR compliance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <Label>Name</Label>
                    <p className="mt-1">Jane Compliance</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="mt-1">dpo@clearway.com</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="mt-1">+1 (555) 123-4567</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
