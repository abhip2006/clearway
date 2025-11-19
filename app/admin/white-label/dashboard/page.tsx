// White-Label Agent - Admin Dashboard Page
// Main dashboard for white-label tenant management

import { auth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default async function WhiteLabelDashboard() {
  const { userId } = auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Get user's tenants
  const tenants = await db.whiteLabelTenant.findMany({
    where: { fundAdminId: userId },
    include: {
      brandingConfig: true,
      ssoConfig: true,
      _count: {
        select: {
          users: true,
          apiKeys: true,
          auditLogs: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get aggregate statistics
  const totalUsers = tenants.reduce((sum, t) => sum + t._count.users, 0);
  const totalAPIKeys = tenants.reduce((sum, t) => sum + t._count.apiKeys, 0);
  const activeTenants = tenants.filter(t => t.status === 'ACTIVE').length;

  // Get recent API usage
  const recentAPIUsage = await db.apiUsageLog.findMany({
    where: {
      tenantId: { in: tenants.map(t => t.id) },
    },
    take: 100,
    orderBy: { createdAt: 'desc' },
  });

  const apiCallsLast24h = recentAPIUsage.filter(
    log => log.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length;

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">White-Label Management</h1>
        <p className="text-gray-600">
          Manage your white-label tenants, branding, and API access
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeTenants}</div>
            <p className="text-xs text-gray-500 mt-1">
              {tenants.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalUsers}</div>
            <p className="text-xs text-gray-500 mt-1">
              Across all tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              API Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAPIKeys}</div>
            <p className="text-xs text-gray-500 mt-1">
              Active keys
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              API Calls (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{apiCallsLast24h}</div>
            <p className="text-xs text-gray-500 mt-1">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tenants List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Tenants</CardTitle>
            <Link
              href="/admin/white-label/create"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Create Tenant
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">No tenants yet</p>
              <Link
                href="/admin/white-label/create"
                className="text-blue-600 hover:underline"
              >
                Create your first tenant
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {tenants.map(tenant => (
                <div
                  key={tenant.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          {tenant.brandingConfig?.companyName || tenant.subdomain}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            tenant.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {tenant.status}
                        </span>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {tenant.plan}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <strong>Subdomain:</strong> {tenant.subdomain}.clearway.com
                        </p>
                        {tenant.customDomain && (
                          <p>
                            <strong>Custom Domain:</strong> {tenant.customDomain}
                          </p>
                        )}
                        <p>
                          <strong>Users:</strong> {tenant._count.users} |{' '}
                          <strong>API Keys:</strong> {tenant._count.apiKeys}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/white-label/branding?tenant=${tenant.id}`}
                        className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                      >
                        Branding
                      </Link>
                      <Link
                        href={`/admin/white-label/api-keys?tenant=${tenant.id}`}
                        className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                      >
                        API Keys
                      </Link>
                      <Link
                        href={`/admin/white-label/users?tenant=${tenant.id}`}
                        className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                      >
                        Users
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Branding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Customize logos, colors, and themes for your tenants
            </p>
            <Link
              href="/admin/white-label/branding"
              className="text-blue-600 hover:underline text-sm"
            >
              Manage Branding →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">SSO Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Set up SAML, OIDC, or OAuth authentication
            </p>
            <Link
              href="/admin/white-label/sso"
              className="text-blue-600 hover:underline text-sm"
            >
              Configure SSO →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">API Access</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Generate and manage API keys for programmatic access
            </p>
            <Link
              href="/admin/white-label/api-keys"
              className="text-blue-600 hover:underline text-sm"
            >
              Manage API Keys →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
