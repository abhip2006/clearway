/**
 * Conflict Resolution Interface
 * Review and resolve data conflicts between platforms
 */

import React, { useState, useEffect } from 'react';

interface Conflict {
  id: string;
  type: string;
  dataType: string;
  security: string;
  sources: Array<{
    connection: string;
    platform: string;
    quantity?: number;
    value?: number;
  }>;
  createdAt: Date;
  reviewedBy?: string;
}

export const ConflictResolutionPage: React.FC = () => {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [resolution, setResolution] = useState<string>('');
  const [manualValue, setManualValue] = useState<string>('');

  useEffect(() => {
    fetchConflicts();
  }, []);

  const fetchConflicts = async () => {
    try {
      // Assuming we have a portfolio ID from context or route
      const portfolioId = 'portfolio-123';
      const response = await fetch(`/api/v1/portfolios/${portfolioId}/conflicts?status=PENDING`);
      const data = await response.json();
      setConflicts(data.conflicts);
    } catch (error) {
      console.error('Failed to fetch conflicts:', error);
    }
  };

  const handleResolve = async () => {
    if (!selectedConflict) return;

    try {
      const portfolioId = 'portfolio-123';
      await fetch(
        `/api/v1/portfolios/${portfolioId}/conflicts/${selectedConflict.id}/resolve`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resolution,
            mergedValue: resolution === 'MERGE' ? parseFloat(manualValue) : undefined
          })
        }
      );

      await fetchConflicts();
      setSelectedConflict(null);
      setResolution('');
      setManualValue('');
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Conflict Resolution</h1>
        <p className="mt-2 text-gray-600">
          Review and resolve data conflicts between connected platforms
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Pending Conflicts: {conflicts.length}</h2>
        </div>

        {conflicts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="text-4xl mb-4">✓</div>
            <p>No conflicts to resolve</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {conflicts.map((conflict) => (
              <div key={conflict.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-3 py-1 text-xs rounded-full ${
                          conflict.type === 'QUANTITY_MISMATCH'
                            ? 'bg-yellow-100 text-yellow-800'
                            : conflict.type === 'VALUE_MISMATCH'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {conflict.type}
                      </span>
                      <span className="text-sm text-gray-500">{conflict.dataType}</span>
                    </div>

                    <h3 className="mt-2 text-lg font-semibold">{conflict.security}</h3>

                    <div className="mt-4 space-y-2">
                      {conflict.sources.map((source, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 p-3 rounded"
                        >
                          <span className="font-medium">{source.platform}</span>
                          <div className="text-right">
                            {source.quantity && (
                              <div className="text-sm">
                                Quantity: <span className="font-semibold">{source.quantity}</span>
                              </div>
                            )}
                            {source.value && (
                              <div className="text-sm">
                                Value: <span className="font-semibold">${source.value.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 text-sm text-gray-500">
                      Created: {new Date(conflict.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedConflict(conflict)}
                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedConflict && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
            <h2 className="text-2xl font-bold mb-6">Resolve Conflict</h2>

            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-2">{selectedConflict.security}</h3>
              <p className="text-gray-600">{selectedConflict.type}</p>
            </div>

            <div className="space-y-4 mb-6">
              {selectedConflict.sources.map((source, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded">
                  <div className="font-medium">{source.platform}</div>
                  {source.quantity && <div>Quantity: {source.quantity}</div>}
                  {source.value && <div>Value: ${source.value.toLocaleString()}</div>}
                </div>
              ))}
            </div>

            <div className="space-y-3 mb-6">
              <h3 className="font-semibold">Resolution Options:</h3>

              <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="resolution"
                  value="CLEARWAY_WINS"
                  checked={resolution === 'CLEARWAY_WINS'}
                  onChange={(e) => setResolution(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">Clearway Wins</div>
                  <div className="text-sm text-gray-600">Use Clearway's existing data</div>
                </div>
              </label>

              <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="resolution"
                  value="PLATFORM_WINS"
                  checked={resolution === 'PLATFORM_WINS'}
                  onChange={(e) => setResolution(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">Platform Wins</div>
                  <div className="text-sm text-gray-600">Use platform's data</div>
                </div>
              </label>

              <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="resolution"
                  value="MERGE"
                  checked={resolution === 'MERGE'}
                  onChange={(e) => setResolution(e.target.value)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium">Manual Override</div>
                  <div className="text-sm text-gray-600">Specify custom value</div>
                  {resolution === 'MERGE' && (
                    <input
                      type="number"
                      value={manualValue}
                      onChange={(e) => setManualValue(e.target.value)}
                      className="mt-2 w-full border rounded px-3 py-2"
                      placeholder="Enter value"
                    />
                  )}
                </div>
              </label>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setSelectedConflict(null);
                  setResolution('');
                  setManualValue('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolution || (resolution === 'MERGE' && !manualValue)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
