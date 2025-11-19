// White-Label Agent - Branding Management Page
// Customize tenant branding, logos, and themes

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function BrandingManagementPage() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenant');

  const [config, setConfig] = useState({
    primaryColor: '#0066FF',
    secondaryColor: '#00D9FF',
    accentColor: '#FF6B35',
    fontFamily: 'Inter',
    companyName: '',
    supportEmail: '',
    supportPhone: '',
    footerText: '',
    logoUrl: null as string | null,
    faviconUrl: null as string | null,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load branding config
  useEffect(() => {
    if (tenantId) {
      loadBrandingConfig();
    }
  }, [tenantId]);

  const loadBrandingConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/white-label/branding?tenantId=${tenantId}`);
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Failed to load branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;

    setSaving(true);
    try {
      const res = await fetch('/api/white-label/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, ...config }),
      });

      if (res.ok) {
        alert('Branding updated successfully!');
      } else {
        alert('Failed to update branding');
      }
    } catch (error) {
      console.error('Failed to save branding:', error);
      alert('Failed to update branding');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;

    const formData = new FormData();
    formData.append('tenantId', tenantId);
    formData.append('logo', file);

    try {
      const res = await fetch('/api/white-label/branding/upload-logo', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.logoUrl) {
        setConfig(prev => ({ ...prev, logoUrl: data.logoUrl }));
        alert('Logo uploaded successfully!');
      }
    } catch (error) {
      console.error('Failed to upload logo:', error);
      alert('Failed to upload logo');
    }
  };

  if (loading) {
    return <div className="container mx-auto p-8">Loading...</div>;
  }

  if (!tenantId) {
    return (
      <div className="container mx-auto p-8">
        <p className="text-red-600">Please select a tenant</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Branding Management</h1>
        <p className="text-gray-600">
          Customize the look and feel of your white-label portal
        </p>
      </div>

      <div className="space-y-6">
        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Colors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={config.primaryColor}
                    onChange={e =>
                      setConfig(prev => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="w-20"
                  />
                  <Input
                    type="text"
                    value={config.primaryColor}
                    onChange={e =>
                      setConfig(prev => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={config.secondaryColor}
                    onChange={e =>
                      setConfig(prev => ({ ...prev, secondaryColor: e.target.value }))
                    }
                    className="w-20"
                  />
                  <Input
                    type="text"
                    value={config.secondaryColor}
                    onChange={e =>
                      setConfig(prev => ({ ...prev, secondaryColor: e.target.value }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={config.accentColor}
                    onChange={e =>
                      setConfig(prev => ({ ...prev, accentColor: e.target.value }))
                    }
                    className="w-20"
                  />
                  <Input
                    type="text"
                    value={config.accentColor}
                    onChange={e =>
                      setConfig(prev => ({ ...prev, accentColor: e.target.value }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo & Branding */}
        <Card>
          <CardHeader>
            <CardTitle>Logo & Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="logo">Logo</Label>
                {config.logoUrl && (
                  <div className="mt-2 mb-4">
                    <img
                      src={config.logoUrl}
                      alt="Logo"
                      className="max-w-xs border rounded"
                    />
                  </div>
                )}
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                />
              </div>

              <div>
                <Label htmlFor="fontFamily">Font Family</Label>
                <Input
                  id="fontFamily"
                  value={config.fontFamily}
                  onChange={e =>
                    setConfig(prev => ({ ...prev, fontFamily: e.target.value }))
                  }
                  placeholder="Inter, Roboto, etc."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={config.companyName}
                  onChange={e =>
                    setConfig(prev => ({ ...prev, companyName: e.target.value }))
                  }
                  placeholder="Your Company Name"
                />
              </div>

              <div>
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={config.supportEmail}
                  onChange={e =>
                    setConfig(prev => ({ ...prev, supportEmail: e.target.value }))
                  }
                  placeholder="support@company.com"
                />
              </div>

              <div>
                <Label htmlFor="supportPhone">Support Phone</Label>
                <Input
                  id="supportPhone"
                  value={config.supportPhone}
                  onChange={e =>
                    setConfig(prev => ({ ...prev, supportPhone: e.target.value }))
                  }
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="footerText">Footer Text</Label>
                <Textarea
                  id="footerText"
                  value={config.footerText}
                  onChange={e =>
                    setConfig(prev => ({ ...prev, footerText: e.target.value }))
                  }
                  placeholder="Copyright information and legal text"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => loadBrandingConfig()}
            disabled={saving}
          >
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
