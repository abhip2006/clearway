'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DollarSign, Download, Search, Filter, AlertCircle } from 'lucide-react';

export default function CapitalCallsPage() {
  const [loading, setLoading] = useState(true);
  const [capitalCalls, setCapitalCalls] = useState([]);
  const [filteredCalls, setFilteredCalls] = useState([]);
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    loadCapitalCalls();
  }, []);

  useEffect(() => {
    filterCalls();
  }, [capitalCalls, searchTerm, statusFilter]);

  const loadCapitalCalls = async () => {
    try {
      const response = await fetch('/api/investor/capital-calls');
      const data = await response.json();
      setCapitalCalls(data.capitalCalls || []);
    } catch (error) {
      console.error('Error loading capital calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCalls = () => {
    let filtered = capitalCalls;

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((call: any) => call.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (call: any) =>
          call.callNumber.toString().includes(searchTerm) ||
          call.fundId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredCalls(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'FUNDED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'WAIVED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'OVERDUE') {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Capital Calls</h1>
          <p className="text-gray-600 mt-1">Manage your capital call commitments</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by call number or fund..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="FUNDED">Funded</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                  <SelectItem value="WAIVED">Waived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                }}
                className="w-full"
              >
                <Filter className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capital Calls List */}
      <div className="space-y-4">
        {filteredCalls.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No capital calls found</p>
            </CardContent>
          </Card>
        ) : (
          filteredCalls.map((call: any) => (
            <Card
              key={call.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedCall(call)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">Capital Call #{call.callNumber}</h3>
                      <Badge className={getStatusColor(call.status)}>
                        {getStatusIcon(call.status)}
                        <span className="ml-1">{call.status}</span>
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Fund:</span> {call.fundId}
                      </div>
                      <div>
                        <span className="font-medium">Call Date:</span>{' '}
                        {new Date(call.callDate).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Due Date:</span>{' '}
                        <span
                          className={
                            call.status === 'OVERDUE' ? 'text-red-600 font-semibold' : ''
                          }
                        >
                          {new Date(call.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col md:items-end gap-2">
                    <div className="text-2xl font-bold text-gray-900">
                      ${Number(call.investorAmount).toLocaleString()}
                    </div>
                    {call.amountPaid > 0 && (
                      <div className="text-sm text-green-600">
                        Paid: ${Number(call.amountPaid).toLocaleString()}
                      </div>
                    )}
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Capital Call Detail Dialog */}
      <Dialog open={!!selectedCall} onOpenChange={(open) => !open && setSelectedCall(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Capital Call #{selectedCall?.callNumber}
            </DialogTitle>
            <DialogDescription>
              Complete details and payment instructions
            </DialogDescription>
          </DialogHeader>

          {selectedCall && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(selectedCall.status)} variant="outline">
                  {selectedCall.status}
                </Badge>
                {selectedCall.callType !== 'STANDARD' && (
                  <Badge variant="outline">{selectedCall.callType}</Badge>
                )}
              </div>

              {/* Amount Due */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Amount Due</p>
                    <p className="text-4xl font-bold text-blue-900">
                      ${Number(selectedCall.investorAmount).toLocaleString()}
                    </p>
                    {selectedCall.amountPaid > 0 && (
                      <p className="text-sm text-green-600 mt-2">
                        Paid: ${Number(selectedCall.amountPaid).toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Fund</p>
                  <p className="font-medium">{selectedCall.fundId}</p>
                </div>
                <div>
                  <p className="text-gray-600">Call Date</p>
                  <p className="font-medium">
                    {new Date(selectedCall.callDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Due Date</p>
                  <p className="font-medium">
                    {new Date(selectedCall.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Reference Code</p>
                  <p className="font-medium font-mono">{selectedCall.referenceCode || 'N/A'}</p>
                </div>
              </div>

              {/* Wire Instructions */}
              {selectedCall.wireInstructions && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Wire Instructions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded">
                      {selectedCall.wireInstructions}
                    </pre>
                    <Button className="mt-4 w-full" variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Download Instructions
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Payment Information */}
              {selectedCall.paymentDate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Date:</span>
                      <span className="font-medium">
                        {new Date(selectedCall.paymentDate).toLocaleDateString()}
                      </span>
                    </div>
                    {selectedCall.paymentMethod && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Method:</span>
                        <span className="font-medium">{selectedCall.paymentMethod}</span>
                      </div>
                    )}
                    {selectedCall.paymentReference && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reference:</span>
                        <span className="font-medium font-mono">
                          {selectedCall.paymentReference}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
