// app/dashboard/marketplace/developer/page.tsx
// Developer Portal - Main Dashboard

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DeveloperStats {
  totalApps: number;
  totalInstalls: number;
  totalRevenue: number;
  apiKeys: number;
  webhooks: number;
  monthlyRequests: number;
  errorRate: number;
}

export default function DeveloperPortalPage() {
  const [stats, setStats] = useState<DeveloperStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch developer stats
      const response = await fetch('/api/v1/marketplace/developer/stats');
      const data = await response.json();

      if (data.status === 'success') {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Developer Portal</h1>
          <p className="mt-2 text-lg text-gray-600">
            Build, manage, and monitor your Clearway integrations
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Apps"
            value={stats?.totalApps || 0}
            icon="📦"
            color="blue"
          />
          <StatsCard
            title="Total Installs"
            value={stats?.totalInstalls || 0}
            icon="⬇"
            color="green"
          />
          <StatsCard
            title="Monthly Revenue"
            value={`$${(stats?.totalRevenue || 0).toFixed(2)}`}
            icon="💰"
            color="purple"
          />
          <StatsCard
            title="API Requests (30d)"
            value={(stats?.monthlyRequests || 0).toLocaleString()}
            icon="📊"
            color="orange"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ActionCard
              title="Create App"
              description="Build a new marketplace app"
              href="/dashboard/marketplace/developer/apps/new"
              icon="➕"
            />
            <ActionCard
              title="API Keys"
              description="Manage your API credentials"
              href="/dashboard/marketplace/developer/keys"
              icon="🔑"
            />
            <ActionCard
              title="Webhooks"
              description="Configure event subscriptions"
              href="/dashboard/marketplace/developer/webhooks"
              icon="🔔"
            />
            <ActionCard
              title="Documentation"
              description="API reference and guides"
              href="/docs"
              icon="📚"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            API Usage - Last 30 Days
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-3xl font-bold text-gray-900">
                {(stats?.monthlyRequests || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Error Rate</p>
              <p className="text-3xl font-bold text-gray-900">
                {((stats?.errorRate || 0) * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Webhooks</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.webhooks || 0}
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/marketplace/developer/analytics"
            className="mt-6 inline-block text-blue-600 hover:text-blue-700 font-medium"
          >
            View Detailed Analytics →
          </Link>
        </div>

        {/* Resources */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Getting Started
            </h3>
            <ul className="space-y-3">
              <ResourceLink
                title="API Reference"
                href="/docs/api/rest"
              />
              <ResourceLink
                title="GraphQL Guide"
                href="/docs/api/graphql"
              />
              <ResourceLink
                title="SDK Documentation"
                href="/docs/sdks"
              />
              <ResourceLink
                title="Webhook Events"
                href="/docs/webhooks"
              />
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Support</h3>
            <ul className="space-y-3">
              <ResourceLink
                title="Community Forum"
                href="https://community.clearway.io"
              />
              <ResourceLink
                title="API Status"
                href="https://status.clearway.io"
              />
              <ResourceLink
                title="Submit a Ticket"
                href="/support/tickets"
              />
              <ResourceLink
                title="Contact Sales"
                href="/contact"
              />
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon, color }: any) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg ${colors[color]} flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, description, href, icon }: any) {
  return (
    <Link
      href={href}
      className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
    </Link>
  );
}

function ResourceLink({ title, href }: any) {
  return (
    <li>
      <a
        href={href}
        className="text-blue-600 hover:text-blue-700 flex items-center justify-between"
      >
        <span>{title}</span>
        <span>→</span>
      </a>
    </li>
  );
}
