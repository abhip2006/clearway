// Analytics Dashboard Page
// Task AN-001: Real-Time Capital Call Dashboard

import { CapitalCallDashboard } from '@/components/dashboard/capital-call-overview';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Real-time insights and metrics for your capital calls
          </p>
        </div>

        <CapitalCallDashboard />
      </div>
    </div>
  );
}
