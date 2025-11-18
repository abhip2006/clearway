'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Shield, CheckCircle, XCircle, Copy, Upload, Download } from 'lucide-react';

export default function SSOConfigPage() {
  const [ssoEnabled, setSsoEnabled] = useState(true);
  const [jitProvisioningEnabled, setJitProvisioningEnabled] = useState(true);
  const [idpMetadata, setIdpMetadata] = useState('');
  const [ssoTestResult, setSsoTestResult] = useState<'success' | 'failed' | null>(null);

  const entityId = 'https://clearway.com/saml/metadata';
  const acsUrl = 'https://clearway.com/saml/acs';
  const logoutUrl = 'https://clearway.com/saml/logout';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleTestSSO = () => {
    // Simulate SSO test
    setTimeout(() => {
      setSsoTestResult('success');
      setTimeout(() => setSsoTestResult(null), 3000);
    }, 1000);
  };

  const handleUploadMetadata = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setIdpMetadata(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
            <Shield className="w-8 h-8" />
            SSO Configuration
          </h1>
          <p className="text-muted-foreground">
            Configure SAML 2.0 single sign-on for your organization
          </p>
        </div>
        {ssoEnabled ? (
          <Badge className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            SSO Enabled
          </Badge>
        ) : (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" />
            SSO Disabled
          </Badge>
        )}
      </div>

      <div className="grid gap-6">
        {/* Service Provider Info */}
        <Card>
          <CardHeader>
            <CardTitle>Service Provider Configuration</CardTitle>
            <CardDescription>
              Use these values to configure Clearway in your identity provider
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Entity ID / Issuer</Label>
              <div className="flex gap-2">
                <Input value={entityId} readOnly className="font-mono text-sm" />
                <Button size="icon" variant="outline" onClick={() => handleCopy(entityId)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assertion Consumer Service (ACS) URL</Label>
              <div className="flex gap-2">
                <Input value={acsUrl} readOnly className="font-mono text-sm" />
                <Button size="icon" variant="outline" onClick={() => handleCopy(acsUrl)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Single Logout URL</Label>
              <div className="flex gap-2">
                <Input value={logoutUrl} readOnly className="font-mono text-sm" />
                <Button size="icon" variant="outline" onClick={() => handleCopy(logoutUrl)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Clearway uses SAML 2.0 with HTTP-POST binding for SSO.
                Ensure your IdP is configured to send assertions to the ACS URL above.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Identity Provider Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Identity Provider Configuration</CardTitle>
            <CardDescription>
              Configure your SAML identity provider settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="idp-metadata">IdP Metadata XML</Label>
              <div className="flex gap-2 mb-2">
                <input
                  type="file"
                  id="metadata-upload"
                  accept=".xml"
                  onChange={handleUploadMetadata}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('metadata-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Metadata
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download SP Metadata
                </Button>
              </div>
              <Textarea
                id="idp-metadata"
                placeholder="Paste your IdP metadata XML here or upload a file"
                value={idpMetadata}
                onChange={(e) => setIdpMetadata(e.target.value)}
                rows={10}
                className="font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sso-url">SSO URL (Optional)</Label>
                <Input
                  id="sso-url"
                  placeholder="https://idp.example.com/sso"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issuer">IdP Issuer (Optional)</Label>
                <Input
                  id="issuer"
                  placeholder="https://idp.example.com"
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="certificate">X.509 Certificate (Optional)</Label>
              <Textarea
                id="certificate"
                placeholder="-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----"
                rows={5}
                className="font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* SSO Settings */}
        <Card>
          <CardHeader>
            <CardTitle>SSO Settings</CardTitle>
            <CardDescription>
              Additional SSO configuration options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base">Enable SSO</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Allow users to sign in using SAML SSO
                </p>
              </div>
              <Switch checked={ssoEnabled} onCheckedChange={setSsoEnabled} />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base">Just-in-Time (JIT) Provisioning</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Automatically create user accounts on first SSO login
                </p>
              </div>
              <Switch
                checked={jitProvisioningEnabled}
                onCheckedChange={setJitProvisioningEnabled}
                disabled={!ssoEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label>Default Role for New Users</Label>
              <Input defaultValue="Viewer" />
              <p className="text-sm text-muted-foreground">
                Role assigned to users created via JIT provisioning
              </p>
            </div>

            <div className="space-y-2">
              <Label>SSO Domain Mapping</Label>
              <Input placeholder="example.com" />
              <p className="text-sm text-muted-foreground">
                Only allow SSO for users with email addresses from this domain
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Attribute Mapping */}
        <Card>
          <CardHeader>
            <CardTitle>SAML Attribute Mapping</CardTitle>
            <CardDescription>
              Map SAML attributes to user profile fields
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email Attribute</Label>
                <Input defaultValue="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress" className="font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label>First Name Attribute</Label>
                <Input defaultValue="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname" className="font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label>Last Name Attribute</Label>
                <Input defaultValue="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname" className="font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label>Role Attribute (Optional)</Label>
                <Input placeholder="role" className="font-mono text-xs" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test SSO */}
        <Card>
          <CardHeader>
            <CardTitle>Test SSO Configuration</CardTitle>
            <CardDescription>
              Verify your SSO setup is working correctly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button onClick={handleTestSSO} disabled={!ssoEnabled || !idpMetadata}>
                Test SSO Connection
              </Button>
              {ssoTestResult === 'success' && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">SSO test successful!</span>
                </div>
              )}
              {ssoTestResult === 'failed' && (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">SSO test failed</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              This will initiate a test SAML authentication flow
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline">Cancel</Button>
          <Button>Save SSO Configuration</Button>
        </div>
      </div>
    </div>
  );
}
