/**
 * Portfolio Connections Management Page
 * Location: /dashboard/integrations/portfolio-connections
 */

import React, { useState, useEffect } from 'react';
import { Platform, ConnectionStatus } from '../../backend/models/PortfolioConnection';

interface Connection {
  id: string;
  platform: Platform;
  displayName: string;
  status: ConnectionStatus;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  syncSuccessRate?: number;
  holdingsCount: number;
  transactionsCount: number;
  errorCount: number;
}

export const PortfolioConnectionsPage: React.FC = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState({ platform: '', status: '' });

  useEffect(() => {
    fetchConnections();
  }, [filter]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.platform) params.append('platform', filter.platform);
      if (filter.status) params.append('status', filter.status);

      const response = await fetch(`/api/v1/portfolio-connections?${params}`);
      const data = await response.json();
      setConnections(data.connections);
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (connectionId: string) => {
    try {
      await fetch(`/api/v1/portfolio-connections/${connectionId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataTypes: ['ALL'], force: false })
      });
      await fetchConnections();
    } catch (error) {
      console.error('Failed to trigger sync:', error);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) {
      return;
    }

    try {
      await fetch(`/api/v1/portfolio-connections/${connectionId}?includeHistory=true`, {
        method: 'DELETE'
      });
      await fetchConnections();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const getStatusColor = (status: ConnectionStatus): string => {
    switch (status) {
      case 'CONNECTED': return 'text-green-600';
      case 'SYNCING': return 'text-blue-600';
      case 'ERROR': return 'text-red-600';
      case 'SYNC_FAILED': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getPlatformIcon = (platform: Platform): string => {
    switch (platform) {
      case Platform.BLACK_DIAMOND: return '💎';
      case Platform.ORION: return '⭐';
      case Platform.ADDEPAR: return '📊';
      default: return '🔗';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Portfolio Connections</h1>
        <p className="mt-2 text-gray-600">
          Manage your connections to Black Diamond, Orion, and Addepar platforms
        </p>
      </div>

      {/* Actions */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex space-x-4">
          <select
            className="border rounded-md px-3 py-2"
            value={filter.platform}
            onChange={(e) => setFilter({ ...filter, platform: e.target.value })}
          >
            <option value="">All Platforms</option>
            <option value="BLACK_DIAMOND">Black Diamond</option>
            <option value="ORION">Orion</option>
            <option value="ADDEPAR">Addepar</option>
          </select>

          <select
            className="border rounded-md px-3 py-2"
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="CONNECTED">Connected</option>
            <option value="ERROR">Error</option>
            <option value="DISCONNECTED">Disconnected</option>
          </select>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          + Add Connection
        </button>
      </div>

      {/* Connections List */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : connections.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No connections found</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Add your first connection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-3xl mr-3">{getPlatformIcon(connection.platform)}</span>
                  <div>
                    <h3 className="font-semibold text-lg">{connection.displayName}</h3>
                    <p className="text-sm text-gray-500">{connection.platform}</p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${getStatusColor(connection.status)}`}>
                  {connection.status}
                </span>
              </div>

              {/* Stats */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Holdings:</span>
                  <span className="font-medium">{connection.holdingsCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Transactions:</span>
                  <span className="font-medium">{connection.transactionsCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate:</span>
                  <span className="font-medium">
                    {connection.syncSuccessRate
                      ? `${(connection.syncSuccessRate * 100).toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
                {connection.lastSyncAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Sync:</span>
                    <span className="font-medium">
                      {new Date(connection.lastSyncAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Error Indicator */}
              {connection.errorCount > 0 && (
                <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {connection.errorCount} error(s) detected
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedConnection(connection)}
                  className="flex-1 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded"
                >
                  Details
                </button>
                <button
                  onClick={() => handleSync(connection.id)}
                  className="flex-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded"
                >
                  Sync Now
                </button>
                <button
                  onClick={() => handleDisconnect(connection.id)}
                  className="text-sm text-red-600 hover:text-red-800 px-3 py-2"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Connection Modal */}
      {showAddModal && (
        <AddConnectionModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchConnections}
        />
      )}

      {/* Connection Details Modal */}
      {selectedConnection && (
        <ConnectionDetailsModal
          connection={selectedConnection}
          onClose={() => setSelectedConnection(null)}
          onUpdate={fetchConnections}
        />
      )}
    </div>
  );
};

const AddConnectionModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState<Platform | ''>('');

  const handlePlatformSelect = async (selectedPlatform: Platform) => {
    setPlatform(selectedPlatform);

    try {
      const response = await fetch('/api/v1/portfolio-connections/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: selectedPlatform, bidirectionalSync: false })
      });

      const data = await response.json();

      if (data.authorizationUrl) {
        // Redirect to OAuth provider
        window.location.href = data.authorizationUrl;
      } else if (data.requiresApiKey) {
        // Show API key form
        setStep(2);
      }
    } catch (error) {
      console.error('Failed to initiate connection:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6">Add New Connection</h2>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-gray-600">Select a platform to connect:</p>

            <button
              onClick={() => handlePlatformSelect(Platform.BLACK_DIAMOND)}
              className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 text-left"
            >
              <div className="flex items-center">
                <span className="text-3xl mr-4">💎</span>
                <div>
                  <div className="font-semibold">Black Diamond</div>
                  <div className="text-sm text-gray-500">OAuth 2.0 Authentication</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => handlePlatformSelect(Platform.ORION)}
              className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 text-left"
            >
              <div className="flex items-center">
                <span className="text-3xl mr-4">⭐</span>
                <div>
                  <div className="font-semibold">Orion</div>
                  <div className="text-sm text-gray-500">API Key Authentication</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => handlePlatformSelect(Platform.ADDEPAR)}
              className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 text-left"
            >
              <div className="flex items-center">
                <span className="text-3xl mr-4">📊</span>
                <div>
                  <div className="font-semibold">Addepar</div>
                  <div className="text-sm text-gray-500">OAuth 2.0 Authentication</div>
                </div>
              </div>
            </button>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const ConnectionDetailsModal: React.FC<{
  connection: Connection;
  onClose: () => void;
  onUpdate: () => void;
}> = ({ connection, onClose, onUpdate }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">{connection.displayName}</h2>

        {/* Implementation details for connection settings */}
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Platform</h3>
            <p className="text-gray-600">{connection.platform}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Status</h3>
            <p className={getStatusColor(connection.status)}>{connection.status}</p>
          </div>

          {/* Add more details and settings here */}
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
          <button
            onClick={onUpdate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

function getStatusColor(status: ConnectionStatus): string {
  switch (status) {
    case 'CONNECTED': return 'text-green-600';
    case 'SYNCING': return 'text-blue-600';
    case 'ERROR': return 'text-red-600';
    case 'SYNC_FAILED': return 'text-orange-600';
    default: return 'text-gray-600';
  }
}
