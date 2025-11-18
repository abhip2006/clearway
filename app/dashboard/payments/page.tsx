'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Download, Link2, FileText, CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react';

interface Payment {
  id: string;
  date: string;
  amount: number;
  currency: string;
  wireReference: string;
  status: 'matched' | 'unmatched' | 'pending' | 'failed';
  confidence: number;
  capitalCallId?: string;
  capitalCallName?: string;
  investorName: string;
  method: 'SWIFT' | 'ACH' | 'WIRE';
}

interface SwiftMessage {
  id: string;
  messageType: string;
  sender: string;
  receiver: string;
  reference: string;
  amount: number;
  currency: string;
  valueDate: string;
  details: string;
}

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isSwiftModalOpen, setIsSwiftModalOpen] = useState(false);
  const [selectedSwift, setSelectedSwift] = useState<SwiftMessage | null>(null);

  // Mock data
  const payments: Payment[] = [
    {
      id: '1',
      date: '2025-11-18T10:30:00Z',
      amount: 250000,
      currency: 'USD',
      wireReference: 'WIRE-2025-001234',
      status: 'matched',
      confidence: 98,
      capitalCallId: 'CC-001',
      capitalCallName: 'Apollo Fund XI - Call #5',
      investorName: 'Acme Capital Partners',
      method: 'SWIFT',
    },
    {
      id: '2',
      date: '2025-11-18T09:15:00Z',
      amount: 180000,
      currency: 'USD',
      wireReference: 'ACH-2025-005678',
      status: 'matched',
      confidence: 95,
      capitalCallId: 'CC-002',
      capitalCallName: 'Blackstone Fund VIII - Call #3',
      investorName: 'Beta Investments LLC',
      method: 'ACH',
    },
    {
      id: '3',
      date: '2025-11-18T08:45:00Z',
      amount: 125000,
      currency: 'USD',
      wireReference: 'WIRE-2025-001235',
      status: 'unmatched',
      confidence: 45,
      investorName: 'Unknown Investor',
      method: 'SWIFT',
    },
    {
      id: '4',
      date: '2025-11-17T16:20:00Z',
      amount: 320000,
      currency: 'USD',
      wireReference: 'WIRE-2025-001233',
      status: 'pending',
      confidence: 72,
      investorName: 'Gamma Ventures',
      method: 'WIRE',
    },
  ];

  const swiftMessages: SwiftMessage[] = [
    {
      id: '1',
      messageType: 'MT103',
      sender: 'CHASUS33XXX',
      receiver: 'BOFAUS3NXXX',
      reference: 'WIRE-2025-001234',
      amount: 250000,
      currency: 'USD',
      valueDate: '2025-11-18',
      details: '/BNF/ACME CAPITAL PARTNERS\n/REF/APOLLO FUND XI CALL 5',
    },
    {
      id: '2',
      messageType: 'MT103',
      sender: 'CITIUS33XXX',
      receiver: 'BOFAUS3NXXX',
      reference: 'WIRE-2025-001235',
      amount: 125000,
      currency: 'USD',
      valueDate: '2025-11-18',
      details: '/BNF/INVESTMENT ACCOUNT\n/REF/CAPITAL CONTRIBUTION',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Matched</Badge>;
      case 'unmatched':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Unmatched</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return null;
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) {
      return <Badge className="bg-green-500">{confidence}% High</Badge>;
    } else if (confidence >= 70) {
      return <Badge className="bg-yellow-500">{confidence}% Medium</Badge>;
    } else {
      return <Badge variant="destructive">{confidence}% Low</Badge>;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
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

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.wireReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.investorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.amount.toString().includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewSwift = (payment: Payment) => {
    const swift = swiftMessages.find(s => s.reference === payment.wireReference);
    if (swift) {
      setSelectedSwift(swift);
      setIsSwiftModalOpen(true);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Payment Reconciliation
        </h1>
        <p className="text-muted-foreground">
          Match and reconcile payments with capital calls
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Matched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {payments.filter(p => p.status === 'matched').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unmatched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {payments.filter(p => p.status === 'unmatched').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {payments.filter(p => p.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>
                View and reconcile payment transactions
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by reference, investor, or amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="matched">Matched</SelectItem>
                <SelectItem value="unmatched">Unmatched</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="payments" className="w-full">
            <TabsList>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="swift">SWIFT Messages</TabsTrigger>
              <TabsTrigger value="ach">ACH Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="payments" className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Investor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Capital Call</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDateTime(payment.date)}</TableCell>
                      <TableCell className="font-mono text-sm">{payment.wireReference}</TableCell>
                      <TableCell>{payment.investorName}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.method}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>{getConfidenceBadge(payment.confidence)}</TableCell>
                      <TableCell>
                        {payment.capitalCallName ? (
                          <span className="text-sm">{payment.capitalCallName}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {payment.method === 'SWIFT' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewSwift(payment)}
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          )}
                          {payment.status === 'unmatched' && (
                            <Button size="sm" variant="outline">
                              <Link2 className="w-3 h-3 mr-1" />
                              Match
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="swift" className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Message Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>Receiver</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Value Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {swiftMessages.map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell><Badge variant="outline">{msg.messageType}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{msg.reference}</TableCell>
                      <TableCell className="font-mono text-xs">{msg.sender}</TableCell>
                      <TableCell className="font-mono text-xs">{msg.receiver}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(msg.amount, msg.currency)}
                      </TableCell>
                      <TableCell>{msg.valueDate}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSwift(msg);
                            setIsSwiftModalOpen(true);
                          }}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="ach" className="mt-6">
              <div className="text-center py-12 text-muted-foreground">
                <p>No ACH transactions available</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* SWIFT Message Modal */}
      <Dialog open={isSwiftModalOpen} onOpenChange={setIsSwiftModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>SWIFT Message Details</DialogTitle>
            <DialogDescription>
              {selectedSwift?.messageType} - {selectedSwift?.reference}
            </DialogDescription>
          </DialogHeader>
          {selectedSwift && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Sender BIC</Label>
                  <p className="font-mono text-sm mt-1">{selectedSwift.sender}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Receiver BIC</Label>
                  <p className="font-mono text-sm mt-1">{selectedSwift.receiver}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className="font-semibold mt-1">
                    {formatCurrency(selectedSwift.amount, selectedSwift.currency)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Value Date</Label>
                  <p className="mt-1">{selectedSwift.valueDate}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Message Details</Label>
                <pre className="mt-2 p-4 bg-muted rounded-md text-sm font-mono whitespace-pre-wrap">
                  {selectedSwift.details}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
