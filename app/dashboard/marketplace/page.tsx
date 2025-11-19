// app/dashboard/marketplace/page.tsx
// Developer Portal - Marketplace Dashboard

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MarketplaceApp {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  icon?: string;
  rating: number;
  reviewCount: number;
  installCount: number;
  version: string;
  developer: {
    name: string;
    verified: boolean;
  };
}

export default function MarketplacePage() {
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  const categories = [
    'All',
    'Integrations',
    'Analytics',
    'Automation',
    'Communication',
    'Storage',
    'Security',
    'Developer Tools',
  ];

  useEffect(() => {
    fetchApps();
  }, [category, search]);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.append('category', category);
      if (search) params.append('search', search);

      const response = await fetch(`/api/v1/marketplace/apps?${params}`);
      const data = await response.json();

      if (data.status === 'success') {
        setApps(data.data.apps);
      }
    } catch (error) {
      console.error('Failed to fetch apps:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">App Marketplace</h1>
          <p className="mt-2 text-lg text-gray-600">
            Discover and install apps to extend Clearway functionality
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search apps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat.toLowerCase()}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Apps Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600" />
            <p className="mt-4 text-gray-600">Loading apps...</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">No apps found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app) => (
              <Link
                key={app.id}
                href={`/dashboard/marketplace/apps/${app.slug}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start gap-4">
                  {app.icon ? (
                    <img
                      src={app.icon}
                      alt={app.name}
                      className="w-16 h-16 rounded-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center">
                      <span className="text-2xl font-bold text-blue-600">
                        {app.name[0]}
                      </span>
                    </div>
                  )}

                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{app.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      by {app.developer.name}
                      {app.developer.verified && (
                        <span className="ml-1 text-blue-600">✓</span>
                      )}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-gray-600 line-clamp-2">
                  {app.description}
                </p>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span className="font-medium">{app.rating.toFixed(1)}</span>
                    <span className="text-gray-500">
                      ({app.reviewCount} reviews)
                    </span>
                  </div>

                  <div className="text-gray-500">
                    {app.installCount.toLocaleString()} installs
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {app.category}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    v{app.version}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Developer CTA */}
        <div className="mt-12 bg-blue-600 rounded-lg shadow-lg p-8 text-white text-center">
          <h2 className="text-2xl font-bold">Build Your Own App</h2>
          <p className="mt-2 text-blue-100">
            Create integrations and reach thousands of Clearway users
          </p>
          <Link
            href="/dashboard/marketplace/developer"
            className="mt-4 inline-block px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            Start Building
          </Link>
        </div>
      </div>
    </div>
  );
}
