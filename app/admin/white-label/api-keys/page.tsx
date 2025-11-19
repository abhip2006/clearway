// White-Label Agent - API Keys Management Page
// Generate and manage API keys for tenant access

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface APIKey {
  id: string;
  name: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  scopes: string[];
}

export default function APIKeysManagementPage() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenant');

  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    expiresIn: 365,
    scopes: ['capital_calls:read', 'investors:read'],
  });

  useEffect(() => {
    if (tenantId) {
      loadAPIKeys();
    }
  }, [tenantId]);

  const loadAPIKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/white-label/api-keys?tenantId=${tenantId}`);
      const data = await res.json();
      if (data.keys) {
        setKeys(data.keys);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!tenantId || !createForm.name) return;

    try {
      const res = await fetch('/api/white-label/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          ...createForm,
        }),
      });

      const data = await res.json();
      if (data.key) {
        setNewKey(data.key.apiKey);
        setShowCreateDialog(false);
        setShowKeyDialog(true);
        loadAPIKeys();
        setCreateForm({ name: '', expiresIn: 365, scopes: ['capital_calls:read'] });
      } else {
        alert('Failed to create API key');
      }
    } catch (error) {
      console.error('Failed to create key:', error);
      alert('Failed to create API key');
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;

    try {
      const res = await fetch(
        `/api/white-label/api-keys?tenantId=${tenantId}&keyId=${keyId}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        loadAPIKeys();
      } else {
        alert('Failed to revoke API key');
      }
    } catch (error) {
      console.error('Failed to revoke key:', error);
      alert('Failed to revoke API key');
    }
  };

  const toggleScope = (scope: string) => {
    setCreateForm(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  if (!tenantId) {
    return (
      <div className="container mx-auto p-8">
        <p className="text-red-600">Please select a tenant</p>
      </div>
    );
  }

  const availableScopes = [
    { value: '*', label: 'Full Access (All)' },
    { value: 'capital_calls:read', label: 'Capital Calls - Read' },
    { value: 'capital_calls:write', label: 'Capital Calls - Write' },
    { value: 'capital_calls:*', label: 'Capital Calls - All' },
    { value: 'investors:read', label: 'Investors - Read' },
    { value: 'investors:write', label: 'Investors - Write' },
    { value: 'investors:*', label: 'Investors - All' },
    { value: 'documents:read', label: 'Documents - Read' },
    { value: 'documents:write', label: 'Documents - Write' },
    { value: 'payments:read', label: 'Payments - Read' },
    { value: 'payments:write', label: 'Payments - Write' },
  ];

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">API Keys</h1>
            <p className="text-gray-600">
              Manage API keys for programmatic access
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            Generate API Key
          </Button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            {keys.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="mb-4">No API keys yet</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  Generate your first API key
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {keys.map(key => (
                  <div
                    key={key.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{key.name}</h3>
                          {key.revokedAt && (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                              REVOKED
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            <strong>Created:</strong>{' '}
                            {new Date(key.createdAt).toLocaleDateString()}
                          </p>
                          {key.expiresAt && (
                            <p>
                              <strong>Expires:</strong>{' '}
                              {new Date(key.expiresAt).toLocaleDateString()}
                            </p>
                          )}
                          {key.lastUsedAt && (
                            <p>
                              <strong>Last Used:</strong>{' '}
                              {new Date(key.lastUsedAt).toLocaleDateString()}
                            </p>
                          )}
                          <p>
                            <strong>Scopes:</strong> {key.scopes.join(', ')}
                          </p>
                        </div>
                      </div>
                      {!key.revokedAt && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevokeKey(key.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                value={createForm.name}
                onChange={e =>
                  setCreateForm(prev => ({ ...prev, name: e.target.value }))
                }
                placeholder="My API Key"
              />
            </div>

            <div>
              <Label htmlFor="expiresIn">Expires In (days)</Label>
              <Input
                id="expiresIn"
                type="number"
                value={createForm.expiresIn}
                onChange={e =>
                  setCreateForm(prev => ({
                    ...prev,
                    expiresIn: parseInt(e.target.value),
                  }))
                }
              />
            </div>

            <div>
              <Label>Scopes (Permissions)</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {availableScopes.map(scope => (
                  <label
                    key={scope.value}
                    className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={createForm.scopes.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                    />
                    <span className="text-sm">{scope.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateKey} disabled={!createForm.name}>
                Generate Key
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Show Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Generated</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-yellow-600">
              ⚠️ Make sure to copy your API key now. You won't be able to see it again!
            </p>
            <div className="bg-gray-100 p-4 rounded font-mono text-sm break-all">
              {newKey}
            </div>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(newKey || '');
                alert('Copied to clipboard!');
              }}
              className="w-full"
            >
              Copy to Clipboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
