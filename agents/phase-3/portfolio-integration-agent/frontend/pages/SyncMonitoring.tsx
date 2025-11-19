/**
 * Sync Monitoring Dashboard
 * Real-time monitoring of synchronization operations
 */

import React, { useState, useEffect } from 'react';

interface SyncMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncTime: string;
  lastSyncTime: Date | null;
}

interface ConnectionHealth {
  total: number;
  healthy: number;
  warning: number;
  error: number;
}

interface SyncOperation {
  id: string;
  connectionId: string;
  platform: string;
  dataType: string;
  status: string;
  startedAt: Date;
  completedAt?: Date;
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsFailed: number;
  successRate: number;
}

export const SyncMonitoringPage: React.FC = () => {
  const [overallStatus, setOverallStatus] = useState<string>('HEALTHY');
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({
    total: 0,
    healthy: 0,
    warning: 0,
    error: 0
  });
  const [syncMetrics, setSyncMetrics] = useState<SyncMetrics>({
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageSyncTime: 'N/A',
    lastSyncTime: null
  });
  const [recentOperations, setRecentOperations] = useState<SyncOperation[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<SyncOperation | null>(null);

  useEffect(() => {
    fetchSyncStatus();
    fetchRecentOperations();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchSyncStatus();
      fetchRecentOperations();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/v1/sync-status');
      const data = await response.json();

      setOverallStatus(data.overallStatus);
      setConnectionHealth(data.connections);
      setSyncMetrics(data.syncMetrics);
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  };

  const fetchRecentOperations = async () => {
    try {
      const response = await fetch('/api/v1/sync-operations?hours=24');
      const data = await response.json();
      setRecentOperations(data.operations);
    } catch (error) {
      console.error('Failed to fetch operations:', error);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'HEALTHY': return 'bg-green-100 text-green-800';
      case 'WARNING': return 'bg-yellow-100 text-yellow-800';
      case 'UNHEALTHY': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Sync Monitoring</h1>
        <p className="mt-2 text-gray-600">
          Real-time monitoring of portfolio data synchronization
        </p>
      </div>

      {/* Overall Status */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Overall Status</h2>
            <p className="text-gray-600">Last updated: {new Date().toLocaleString()}</p>
          </div>
          <span className={`px-4 py-2 rounded-full font-semibold ${getStatusColor(overallStatus)}`}>
            {overallStatus}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Connection Health */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Connections</h3>
          <p className="text-3xl font-bold text-gray-900">{connectionHealth.total}</p>
          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-green-600">Healthy:</span>
              <span className="font-medium">{connectionHealth.healthy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-600">Warning:</span>
              <span className="font-medium">{connectionHealth.warning}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600">Error:</span>
              <span className="font-medium">{connectionHealth.error}</span>
            </div>
          </div>
        </div>

        {/* Sync Success Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Success Rate (24h)</h3>
          <p className="text-3xl font-bold text-gray-900">
            {syncMetrics.totalSyncs > 0
              ? `${((syncMetrics.successfulSyncs / syncMetrics.totalSyncs) * 100).toFixed(1)}%`
              : 'N/A'}
          </p>
          <div className="mt-4 text-sm text-gray-600">
            <div>{syncMetrics.successfulSyncs} successful</div>
            <div>{syncMetrics.failedSyncs} failed</div>
          </div>
        </div>

        {/* Average Sync Time */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Sync Time</h3>
          <p className="text-3xl font-bold text-gray-900">{syncMetrics.averageSyncTime}</p>
          <div className="mt-4 text-sm text-gray-600">
            Across {syncMetrics.totalSyncs} operations
          </div>
        </div>

        {/* Last Sync */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Last Sync</h3>
          <p className="text-lg font-bold text-gray-900">
            {syncMetrics.lastSyncTime
              ? new Date(syncMetrics.lastSyncTime).toLocaleTimeString()
              : 'Never'}
          </p>
          <div className="mt-4 text-sm text-gray-600">
            {syncMetrics.lastSyncTime
              ? new Date(syncMetrics.lastSyncTime).toLocaleDateString()
              : 'No syncs recorded'}
          </div>
        </div>
      </div>

      {/* Recent Operations */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Recent Sync Operations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Started
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Data Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Records
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOperations.map((operation) => (
                <tr key={operation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(operation.startedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operation.platform}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operation.dataType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        operation.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : operation.status === 'FAILED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {operation.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operation.recordsProcessed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(operation.successRate * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedOperation(operation)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operation Details Modal */}
      {selectedOperation && (
        <OperationDetailsModal
          operation={selectedOperation}
          onClose={() => setSelectedOperation(null)}
        />
      )}
    </div>
  );
};

const OperationDetailsModal: React.FC<{
  operation: SyncOperation;
  onClose: () => void;
}> = ({ operation, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-6">Sync Operation Details</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Operation ID</h3>
              <p className="mt-1 text-sm text-gray-900">{operation.id}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <p className="mt-1 text-sm text-gray-900">{operation.status}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Started At</h3>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(operation.startedAt).toLocaleString()}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Completed At</h3>
              <p className="mt-1 text-sm text-gray-900">
                {operation.completedAt
                  ? new Date(operation.completedAt).toLocaleString()
                  : 'In Progress'}
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Processed</h4>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {operation.recordsProcessed}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Inserted</h4>
                <p className="mt-1 text-2xl font-bold text-green-600">
                  {operation.recordsInserted}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Updated</h4>
                <p className="mt-1 text-2xl font-bold text-blue-600">
                  {operation.recordsUpdated}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Failed</h4>
                <p className="mt-1 text-2xl font-bold text-red-600">
                  {operation.recordsFailed}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
