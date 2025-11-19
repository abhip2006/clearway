// app/investor/tax/page.tsx
// Investor Tax Center - View all K-1s across funds

'use client';

import { useState, useEffect } from 'react';

export default function InvestorTaxCenter() {
  const [taxYear, setTaxYear] = useState(2024);
  const [k1Documents, setK1Documents] = useState([]);

  const exportToTurboTax = async () => {
    window.open(`/api/tax/export/turbotax/${taxYear}`, '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Tax Documents</h1>
          <p className="text-gray-600">
            Access your K-1 forms and tax documents across all investments
          </p>
        </div>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total K-1s</div>
          <div className="text-3xl font-bold text-blue-800">0</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Income</div>
          <div className="text-3xl font-bold text-green-800">$0</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Distributions</div>
          <div className="text-3xl font-bold text-purple-800">$0</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <button
            onClick={exportToTurboTax}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Export to TurboTax
          </button>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Download All K-1s
          </button>
          <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Share with CPA
          </button>
        </div>
      </div>

      {/* K-1 Documents by Fund */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">K-1 Documents by Fund</h2>
        <div className="space-y-4">
          {k1Documents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No K-1 documents found for {taxYear}
              <br />
              <span className="text-sm">
                K-1s are typically available in late February or early March
              </span>
            </div>
          ) : (
            k1Documents.map((doc: any) => <K1DocumentCard key={doc.id} doc={doc} />)
          )}
        </div>
      </div>
    </div>
  );
}

function K1DocumentCard({ doc }: { doc: any }) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div>
        <div className="font-semibold">{doc.fundName}</div>
        <div className="text-sm text-gray-600">
          Form {doc.formType} - {doc.taxYear}
        </div>
      </div>
      <div className="flex gap-2">
        <button className="px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200">
          View
        </button>
        <button className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
          Download
        </button>
      </div>
    </div>
  );
}
