// app/dashboard/tax/page.tsx
// Tax Dashboard - Main overview page

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TaxDashboard() {
  const router = useRouter();
  const [taxYear, setTaxYear] = useState(2024);
  const [stats, setStats] = useState({
    totalK1s: 0,
    validated: 0,
    pending: 0,
    distributed: 0,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tax Dashboard</h1>
        <div className="flex gap-4">
          <select
            value={taxYear}
            onChange={(e) => setTaxYear(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg"
          >
            {[2024, 2023, 2022, 2021].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total K-1s" value={stats.totalK1s} color="blue" />
        <StatCard title="Validated" value={stats.validated} color="green" />
        <StatCard title="Pending Review" value={stats.pending} color="yellow" />
        <StatCard title="Distributed" value={stats.distributed} color="purple" />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/dashboard/tax/k1/upload')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Upload K-1s
          </button>
          <button
            onClick={() => router.push(`/api/tax/export/turbotax/${taxYear}`)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Export to TurboTax
          </button>
          <button
            onClick={() => router.push('/dashboard/tax/compliance')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            View Compliance
          </button>
        </div>
      </div>

      {/* K-1 Document Library */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">K-1 Document Library</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fund Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tax Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Form Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* K-1 rows will be populated here */}
              <tr>
                <td className="px-6 py-4 text-sm text-gray-500" colSpan={5}>
                  No K-1 documents found for {taxYear}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  const colors = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    purple: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className={`text-3xl font-bold ${colors[color as keyof typeof colors]}`}>
        {value}
      </div>
    </div>
  );
}
