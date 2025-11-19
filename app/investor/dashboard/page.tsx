'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DollarSign,
  TrendingUp,
  FileText,
  Bell,
  ArrowRight,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

export default function InvestorDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    capitalCalls: [],
    distributions: [],
    taxDocuments: [],
    announcements: [],
    performance: [],
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [capitalCalls, distributions, taxDocs, announcements, performance] =
        await Promise.all([
          fetch('/api/investor/capital-calls?status=PENDING').then((r) => r.json()),
          fetch('/api/investor/distributions').then((r) => r.json()),
          fetch('/api/investor/tax-documents').then((r) => r.json()),
          fetch('/api/investor/announcements').then((r) => r.json()),
          fetch('/api/investor/performance').then((r) => r.json()),
        ]);

      setData({
        capitalCalls: capitalCalls.capitalCalls || [],
        distributions: distributions.distributions || [],
        taxDocuments: taxDocs.documents || [],
        announcements: announcements.announcements || [],
        performance: performance.participations || [],
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    let totalCommitment = 0;
    let totalFunded = 0;
    let totalValue = 0;

    data.performance.forEach((p: any) => {
      totalCommitment += Number(p.commitmentAmount || 0);
      totalFunded += Number(p.fundedAmount || 0);
      if (p.performance?.currentValue) {
        totalValue += Number(p.performance.currentValue);
      }
    });

    return { totalCommitment, totalFunded, totalValue };
  };

  const { totalCommitment, totalFunded, totalValue } = calculateTotals();

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
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your investment portfolio</p>
      </div>

      {/* Pending Capital Calls Alert */}
      {data.capitalCalls.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <AlertDescription className="text-orange-800 ml-2">
            You have {data.capitalCalls.length} pending capital call
            {data.capitalCalls.length > 1 ? 's' : ''} requiring action.
            <Link href="/investor/capital-calls" className="ml-2 underline font-medium">
              View Details
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Commitment
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalCommitment.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Across {data.performance.length} fund{data.performance.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Funded
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalFunded.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {totalCommitment > 0
                ? `${((totalFunded / totalCommitment) * 100).toFixed(1)}% of commitment`
                : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Current Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {totalFunded > 0 && totalValue > 0
                ? `${((totalValue / totalFunded - 1) * 100).toFixed(1)}% return`
                : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Capital Calls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Capital Calls</CardTitle>
            <Link href="/investor/capital-calls">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.capitalCalls.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>No pending capital calls</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.capitalCalls.slice(0, 3).map((call: any) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <p className="font-medium">Call #{call.callNumber}</p>
                      <p className="text-sm text-gray-500">
                        Due: {new Date(call.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${Number(call.investorAmount).toLocaleString()}</p>
                      <Badge variant={call.status === 'OVERDUE' ? 'destructive' : 'default'}>
                        {call.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Distributions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Distributions</CardTitle>
            <Link href="/investor/distributions">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.distributions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No recent distributions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.distributions.slice(0, 3).map((dist: any) => (
                  <div
                    key={dist.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{dist.distributionType}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(dist.distributionDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        +${Number(dist.distributionAmount).toLocaleString()}
                      </p>
                      <Badge variant="outline">{dist.paymentStatus}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            <Bell className="inline h-5 w-5 mr-2" />
            Recent Announcements
          </CardTitle>
          <Link href="/investor/communications">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {data.announcements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No recent announcements</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.announcements.slice(0, 3).map((announcement: any) => (
                <div key={announcement.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{announcement.title}</p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {announcement.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(announcement.publishedDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge>{announcement.category}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/investor/tax-documents">
              <Button variant="outline" className="w-full h-auto flex flex-col items-center py-4">
                <FileText className="h-6 w-6 mb-2" />
                <span className="text-sm">Tax Documents</span>
                {data.taxDocuments.length > 0 && (
                  <Badge className="mt-1" variant="secondary">
                    {data.taxDocuments.length}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link href="/investor/performance">
              <Button variant="outline" className="w-full h-auto flex flex-col items-center py-4">
                <TrendingUp className="h-6 w-6 mb-2" />
                <span className="text-sm">Performance</span>
              </Button>
            </Link>
            <Link href="/investor/account">
              <Button variant="outline" className="w-full h-auto flex flex-col items-center py-4">
                <DollarSign className="h-6 w-6 mb-2" />
                <span className="text-sm">Bank Accounts</span>
              </Button>
            </Link>
            <Link href="/investor/communications">
              <Button variant="outline" className="w-full h-auto flex flex-col items-center py-4">
                <Bell className="h-6 w-6 mb-2" />
                <span className="text-sm">Support</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
