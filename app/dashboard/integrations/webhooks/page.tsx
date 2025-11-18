'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, CheckCircle, XCircle, RefreshCw, Send, Copy } from 'lucide-react';

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'disabled';
  createdAt: string;
}

interface WebhookDelivery {
  id: string;
  event: string;
  endpoint: string;
  status: 'success' | 'failed' | 'pending';
  attempts: number;
  timestamp: string;
  responseCode?: number;
}

const WEBHOOK_EVENTS = [
  { id: 'capital_call.created', name: 'Capital Call Created', category: 'Capital Calls' },
  { id: 'capital_call.approved', name: 'Capital Call Approved', category: 'Capital Calls' },
  { id: 'capital_call.rejected', name: 'Capital Call Rejected', category: 'Capital Calls' },
  { id: 'payment.received', name: 'Payment Received', category: 'Payments' },
  { id: 'payment.matched', name: 'Payment Matched', category: 'Payments' },
  { id: 'payment.failed', name: 'Payment Failed', category: 'Payments' },
  { id: 'investor.created', name: 'Investor Created', category: 'Investors' },
  { id: 'investor.updated', name: 'Investor Updated', category: 'Investors' },
  { id: 'document.uploaded', name: 'Document Uploaded', category: 'Documents' },
  { id: 'document.signed', name: 'Document Signed', category: 'Documents' },
  { id: 'integration.connected', name: 'Integration Connected', category: 'Integrations' },
  { id: 'integration.sync_completed', name: 'Sync Completed', category: 'Integrations' },
];

export default function WebhooksPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEndpointUrl, setNewEndpointUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [hmacKey] = useState('whsec_' + Math.random().toString(36).substring(2, 15));

  const endpoints: WebhookEndpoint[] = [
    {
      id: '1',
      url: 'https://api.example.com/webhooks/clearway',
      events: ['capital_call.created', 'payment.received', 'investor.created'],
      status: 'active',
      createdAt: '2025-11-01T10:00:00Z',
    },
    {
      id: '2',
      url: 'https://hooks.example.com/clearway',
      events: ['payment.matched', 'document.signed'],
      status: 'active',
      createdAt: '2025-11-10T14:30:00Z',
    },
  ];

  const deliveries: WebhookDelivery[] = [
    { id: '1', event: 'capital_call.created', endpoint: 'https://api.example.com/webhooks/clearway', status: 'success', attempts: 1, timestamp: '2025-11-18T10:30:00Z', responseCode: 200 },
    { id: '2', event: 'payment.received', endpoint: 'https://api.example.com/webhooks/clearway', status: 'success', attempts: 1, timestamp: '2025-11-18T09:15:00Z', responseCode: 200 },
    { id: '3', event: 'investor.created', endpoint: 'https://hooks.example.com/clearway', status: 'failed', attempts: 3, timestamp: '2025-11-18T08:45:00Z', responseCode: 500 },
    { id: '4', event: 'payment.matched', endpoint: 'https://hooks.example.com/clearway', status: 'pending', attempts: 0, timestamp: '2025-11-18T08:30:00Z' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'disabled':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Disabled</Badge>;
      case 'success':
        return <Badge className="bg-green-500">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
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

  const handleToggleEvent = (eventId: string) => {
    if (selectedEvents.includes(eventId)) {
      setSelectedEvents(selectedEvents.filter(e => e !== eventId));
    } else {
      setSelectedEvents([...selectedEvents, eventId]);
    }
  };

  const handleAddEndpoint = () => {
    console.log('Adding endpoint:', { url: newEndpointUrl, events: selectedEvents });
    setIsAddModalOpen(false);
    setNewEndpointUrl('');
    setSelectedEvents([]);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(hmacKey);
  };

  const handleTestWebhook = (endpointId: string) => {
    console.log('Testing webhook:', endpointId);
  };

  const handleRetry = (deliveryId: string) => {
    console.log('Retrying delivery:', deliveryId);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Webhook Marketplace
          </h1>
          <p className="text-muted-foreground">
            Subscribe to events and manage webhook endpoints
          </p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Endpoint
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add Webhook Endpoint</DialogTitle>
              <DialogDescription>
                Subscribe to events and configure your webhook endpoint
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="endpoint-url">Endpoint URL</Label>
                <Input
                  id="endpoint-url"
                  placeholder="https://your-api.com/webhooks/clearway"
                  value={newEndpointUrl}
                  onChange={(e) => setNewEndpointUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Subscribe to Events</Label>
                <div className="max-h-[300px] overflow-y-auto border rounded-lg p-4 space-y-3">
                  {Object.entries(
                    WEBHOOK_EVENTS.reduce((acc, event) => {
                      if (!acc[event.category]) acc[event.category] = [];
                      acc[event.category].push(event);
                      return acc;
                    }, {} as Record<string, typeof WEBHOOK_EVENTS>)
                  ).map(([category, events]) => (
                    <div key={category}>
                      <h4 className="font-medium text-sm mb-2">{category}</h4>
                      <div className="space-y-2 ml-4">
                        {events.map((event) => (
                          <div key={event.id} className="flex items-center space-x-2">
                            <Switch
                              checked={selectedEvents.includes(event.id)}
                              onCheckedChange={() => handleToggleEvent(event.id)}
                            />
                            <Label className="text-sm cursor-pointer" onClick={() => handleToggleEvent(event.id)}>
                              {event.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddEndpoint} disabled={!newEndpointUrl || selectedEvents.length === 0}>
                Add Endpoint
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* HMAC Signature Key */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>HMAC Signature Key</CardTitle>
          <CardDescription>
            Use this key to verify webhook signatures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input value={hmacKey} readOnly className="font-mono text-sm" />
            <Button size="icon" variant="outline" onClick={handleCopyKey}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            All webhook requests include an HMAC signature in the X-Clearway-Signature header
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="endpoints" className="space-y-6">
        <TabsList>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="deliveries">Delivery Log</TabsTrigger>
          <TabsTrigger value="events">Available Events</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Endpoints</CardTitle>
              <CardDescription>
                Manage your webhook endpoints and subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint URL</TableHead>
                    <TableHead>Subscribed Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpoints.map((endpoint) => (
                    <TableRow key={endpoint.id}>
                      <TableCell className="font-mono text-sm">{endpoint.url}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{endpoint.events.length} events</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(endpoint.status)}</TableCell>
                      <TableCell>{formatDateTime(endpoint.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleTestWebhook(endpoint.id)}>
                            <Send className="w-3 h-3 mr-1" />
                            Test
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
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

        <TabsContent value="deliveries">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Delivery Log</CardTitle>
              <CardDescription>
                Track webhook delivery status and retry failed deliveries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        <Badge variant="outline">{delivery.event}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">
                        {delivery.endpoint}
                      </TableCell>
                      <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                      <TableCell>{delivery.attempts}</TableCell>
                      <TableCell>
                        {delivery.responseCode ? (
                          <Badge variant={delivery.responseCode >= 200 && delivery.responseCode < 300 ? 'outline' : 'destructive'}>
                            {delivery.responseCode}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{formatDateTime(delivery.timestamp)}</TableCell>
                      <TableCell>
                        {delivery.status === 'failed' && (
                          <Button size="sm" variant="outline" onClick={() => handleRetry(delivery.id)}>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Retry
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Available Webhook Events</CardTitle>
              <CardDescription>
                All events you can subscribe to in your webhooks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(
                  WEBHOOK_EVENTS.reduce((acc, event) => {
                    if (!acc[event.category]) acc[event.category] = [];
                    acc[event.category].push(event);
                    return acc;
                  }, {} as Record<string, typeof WEBHOOK_EVENTS>)
                ).map(([category, events]) => (
                  <div key={category}>
                    <h3 className="font-semibold text-lg mb-3">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {events.map((event) => (
                        <div key={event.id} className="p-4 border rounded-lg">
                          <p className="font-medium">{event.name}</p>
                          <p className="text-sm text-muted-foreground font-mono mt-1">{event.id}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
