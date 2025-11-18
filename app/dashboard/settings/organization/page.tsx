'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Crown, Globe, Palette, Shield, AlertTriangle } from 'lucide-react';

export default function OrganizationSettingsPage() {
  const [orgName, setOrgName] = useState('Clearway Capital Partners');
  const [orgSlug, setOrgSlug] = useState('clearway-capital');
  const [plan, setPlan] = useState('PROFESSIONAL');
  const [customDomain, setCustomDomain] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [logoUrl, setLogoUrl] = useState('');

  const getPlanBadge = (planType: string) => {
    switch (planType) {
      case 'STARTER':
        return <Badge variant="outline">Starter</Badge>;
      case 'PROFESSIONAL':
        return <Badge className="bg-blue-500"><Crown className="w-3 h-3 mr-1" />Professional</Badge>;
      case 'ENTERPRISE':
        return <Badge className="bg-purple-600"><Crown className="w-3 h-3 mr-1" />Enterprise</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
          <Building className="w-8 h-8" />
          Organization Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your organization profile, plan, and preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="plan">Plan & Billing</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Profile</CardTitle>
              <CardDescription>
                Update your organization's basic information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">Organization Slug</Label>
                <Input
                  id="org-slug"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  placeholder="your-organization"
                />
                <p className="text-sm text-muted-foreground">
                  Used in your organization's URL: clearway.com/{orgSlug}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-domain">Custom Domain</Label>
                <Input
                  id="custom-domain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="funds.yourcompany.com"
                />
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Globe className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Phase 2 Feature</p>
                    <p>Custom domains allow you to access Clearway from your own branded domain.</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">Professional Plan</h3>
                    {getPlanBadge(plan)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    $299/month • Billed annually
                  </p>
                </div>
                <Button variant="outline">Change Plan</Button>
              </div>

              <div>
                <h4 className="font-medium mb-3">Plan Features</h4>
                <div className="grid gap-2">
                  {[
                    'Unlimited capital calls',
                    'Advanced analytics & ML predictions',
                    'Payment reconciliation',
                    'Fund admin integrations (SS&C, Carta)',
                    'Accounting integrations (QuickBooks, Xero)',
                    'DocuSign integration',
                    'Webhook marketplace',
                    'Priority support',
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-green-600" />
                      </div>
                      <p className="text-sm">{feature}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Available Plans</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-semibold">Starter</h5>
                    <p className="text-2xl font-bold mt-2">$99</p>
                    <p className="text-sm text-muted-foreground">per month</p>
                    <p className="text-xs text-muted-foreground mt-3">Basic features for small funds</p>
                  </div>
                  <div className="p-4 border-2 border-blue-500 rounded-lg bg-blue-50">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold">Professional</h5>
                      <Badge className="bg-blue-500">Current</Badge>
                    </div>
                    <p className="text-2xl font-bold">$299</p>
                    <p className="text-sm text-muted-foreground">per month</p>
                    <p className="text-xs text-muted-foreground mt-3">Advanced features & integrations</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-semibold">Enterprise</h5>
                    <p className="text-2xl font-bold mt-2">Custom</p>
                    <p className="text-sm text-muted-foreground">contact sales</p>
                    <p className="text-xs text-muted-foreground mt-3">Custom solutions & SLAs</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Branding Settings
              </CardTitle>
              <CardDescription>
                Customize your organization's branding and appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="logo">Organization Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      id="logo"
                      placeholder="Logo URL"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Recommended: 200x200px PNG or SVG
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary-color">Primary Color</Label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    id="primary-color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#3b82f6"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Used for buttons, links, and accent colors
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Preview</h4>
                <div className="space-y-3 mt-4">
                  <Button style={{ backgroundColor: primaryColor }}>Primary Button</Button>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded border bg-white flex items-center justify-center">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <Building className="w-5 h-5" />
                      )}
                    </div>
                    <span className="font-semibold">{orgName}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Save Branding</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure organization-wide security policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Single Sign-On (SSO)</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure SAML 2.0 authentication
                  </p>
                </div>
                <Button variant="outline">Configure SSO</Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Two-Factor Authentication</h4>
                  <p className="text-sm text-muted-foreground">
                    Require 2FA for all organization members
                  </p>
                </div>
                <Badge className="bg-green-500">Enabled</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Session Timeout</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically log out inactive users
                  </p>
                </div>
                <Select defaultValue="30">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">IP Allowlist</h4>
                  <p className="text-sm text-muted-foreground">
                    Restrict access to specific IP addresses
                  </p>
                </div>
                <Button variant="outline">Configure</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="space-y-6">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <h4 className="font-medium text-red-900 mb-2">Delete Organization</h4>
                <p className="text-sm text-red-800 mb-4">
                  Once you delete your organization, there is no going back. This will permanently delete:
                </p>
                <ul className="list-disc list-inside text-sm text-red-800 space-y-1 mb-4">
                  <li>All capital calls and documents</li>
                  <li>All investor data and payment records</li>
                  <li>All integrations and webhooks</li>
                  <li>All users and their data</li>
                  <li>All analytics and reports</li>
                </ul>
                <Button variant="destructive">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Delete Organization
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
