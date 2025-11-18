'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Link2, FileText, Send, Eye } from 'lucide-react';

interface DocuSignTemplate {
  id: string;
  name: string;
  description: string;
  documentType: string;
  lastUsed: string;
}

interface Envelope {
  id: string;
  templateName: string;
  recipients: number;
  status: 'sent' | 'delivered' | 'signed' | 'completed' | 'voided';
  sentDate: string;
  completedDate?: string;
}

export default function DocuSignIntegrationPage() {
  const [connected, setConnected] = useState(true);
  const [jwtKey, setJwtKey] = useState('');

  const templates: DocuSignTemplate[] = [
    { id: '1', name: 'Capital Call Notice', description: 'Standard capital call document', documentType: 'Capital Call', lastUsed: '2025-11-18T10:00:00Z' },
    { id: '2', name: 'Investor Agreement', description: 'LP subscription agreement', documentType: 'Legal', lastUsed: '2025-11-15T14:30:00Z' },
    { id: '3', name: 'Distribution Notice', description: 'Investor distribution notice', documentType: 'Distribution', lastUsed: '2025-11-10T09:00:00Z' },
  ];

  const envelopes: Envelope[] = [
    { id: '1', templateName: 'Capital Call Notice', recipients: 15, status: 'completed', sentDate: '2025-11-15T10:00:00Z', completedDate: '2025-11-17T16:30:00Z' },
    { id: '2', templateName: 'Investor Agreement', recipients: 3, status: 'signed', sentDate: '2025-11-16T09:00:00Z' },
    { id: '3', templateName: 'Distribution Notice', recipients: 25, status: 'delivered', sentDate: '2025-11-18T08:00:00Z' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'signed':
        return <Badge className="bg-blue-500">Signed</Badge>;
      case 'delivered':
        return <Badge className="bg-yellow-500">Delivered</Badge>;
      case 'sent':
        return <Badge variant="outline">Sent</Badge>;
      case 'voided':
        return <Badge variant="destructive">Voided</Badge>;
      default:
        return null;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          DocuSign Integration
        </h1>
        <p className="text-muted-foreground">
          Manage DocuSign templates and signature requests
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>DocuSign Connection</CardTitle>
                <CardDescription>
                  Manage your DocuSign integration
                </CardDescription>
              </div>
              {connected ? (
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
            {connected ? (
              <>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-muted-foreground">Account Name</Label>
                    <p className="font-medium mt-1">Clearway Capital Partners</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Account ID</Label>
                    <p className="font-mono text-sm mt-1">DS-987654321</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">API Version</Label>
                    <p className="text-sm mt-1">v2.1</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Authentication</Label>
                    <p className="text-sm mt-1">JWT (Service Integration)</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jwt-key">JWT Public Key</Label>
                  <Textarea
                    id="jwt-key"
                    placeholder="Paste your JWT public key here"
                    value={jwtKey}
                    onChange={(e) => setJwtKey(e.target.value)}
                    rows={4}
                    className="font-mono text-xs"
                  />
                  <p className="text-sm text-muted-foreground">
                    Used for service integration authentication
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    Disconnect
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Connect your DocuSign account to send documents for signature
                </p>
                <Button>
                  <Link2 className="w-4 h-4 mr-2" />
                  Connect DocuSign
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {connected && (
          <Tabs defaultValue="templates" className="space-y-6">
            <TabsList>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="envelopes">Signature Requests</TabsTrigger>
            </TabsList>

            <TabsContent value="templates">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>DocuSign Templates</CardTitle>
                      <CardDescription>
                        Manage and map your DocuSign templates
                      </CardDescription>
                    </div>
                    <Button size="sm" variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      Sync Templates
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Template Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Document Type</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {template.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{template.documentType}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDateTime(template.lastUsed)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              <Button size="sm" variant="outline">
                                <Send className="w-3 h-3 mr-1" />
                                Send
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="envelopes">
              <Card>
                <CardHeader>
                  <CardTitle>Signature Requests</CardTitle>
                  <CardDescription>
                    Track the status of sent envelopes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Template</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent Date</TableHead>
                        <TableHead>Completed Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {envelopes.map((envelope) => (
                        <TableRow key={envelope.id}>
                          <TableCell className="font-medium">{envelope.templateName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{envelope.recipients} recipients</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(envelope.status)}</TableCell>
                          <TableCell className="text-sm">
                            {formatDateTime(envelope.sentDate)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {envelope.completedDate ? formatDateTime(envelope.completedDate) : '-'}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
