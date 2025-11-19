// Distribution Agent - Distribution Dashboard
// Main dashboard for viewing and managing distributions

'use client';

import { useEffect, useState } from 'react';

interface Distribution {
  id: string;
  distributionDate: string;
  payableDate: string;
  totalAmount: string;
  currency: string;
  status: string;
  fund: {
    name: string;
  };
}

export default function DistributionDashboard() {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  useEffect(() => {
    fetchDistributions();
  }, [selectedFilter]);

  const fetchDistributions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedFilter !== 'ALL') {
        params.append('status', selectedFilter);
      }

      const response = await fetch(`/api/distributions?${params.toString()}`);
      const data = await response.json();
      setDistributions(data.distributions || []);
    } catch (error) {
      console.error('Error fetching distributions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'APPROVED':
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Distribution Management</h1>
        <p className="mt-2 text-gray-600">
          Manage fund distributions, track payments, and process reinvestments
        </p>
      </div>

      {/* Action Bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex space-x-2">
          {['ALL', 'DRAFT', 'APPROVED', 'COMPLETED'].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <button
          onClick={() => (window.location.href = '/distributions/create')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + New Distribution
        </button>
      </div>

      {/* Distribution List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading distributions...</p>
        </div>
      ) : distributions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600">No distributions found</p>
          <button
            onClick={() => (window.location.href = '/distributions/create')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create First Distribution
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fund
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distribution Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payable Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {distributions.map((dist) => (
                <tr key={dist.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{dist.fund.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {new Date(dist.distributionDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {new Date(dist.payableDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${parseFloat(dist.totalAmount).toLocaleString()} {dist.currency}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        dist.status
                      )}`}
                    >
                      {dist.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => (window.location.href = `/distributions/${dist.id}`)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Distributions</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {distributions.length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Amount</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            $
            {distributions
              .reduce((sum, d) => sum + parseFloat(d.totalAmount), 0)
              .toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="mt-2 text-2xl font-bold text-blue-600">
            {distributions.filter((d) => d.status === 'DRAFT' || d.status === 'APPROVED').length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="mt-2 text-2xl font-bold text-green-600">
            {distributions.filter((d) => d.status === 'COMPLETED').length}
          </div>
        </div>
      </div>
    </div>
  );
}
