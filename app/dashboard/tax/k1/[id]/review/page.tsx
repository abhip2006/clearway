// app/dashboard/tax/k1/[id]/review/page.tsx
// K-1 Review Page - Side-by-side PDF viewer and extracted data

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function K1ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const [taxDocument, setTaxDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTaxDocument();
  }, [params.id]);

  const fetchTaxDocument = async () => {
    try {
      const res = await fetch(`/api/tax/k1/${params.id}`);
      const data = await res.json();
      setTaxDocument(data);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateK1 = async () => {
    try {
      const res = await fetch(`/api/tax/k1/${params.id}/validate`, {
        method: 'POST',
      });
      const validation = await res.json();
      alert('Validation complete!');
      fetchTaxDocument();
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  const distributeK1 = async () => {
    if (!confirm('Distribute this K-1 to the investor?')) return;

    try {
      const res = await fetch(`/api/tax/k1/${params.id}/distribute`, {
        method: 'POST',
      });
      const result = await res.json();
      alert('K-1 distributed successfully!');
      router.push('/dashboard/tax');
    } catch (error) {
      console.error('Distribution error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const k1Data = taxDocument?.k1Data || {};

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">K-1 Review</h1>
            <p className="text-gray-600">
              {k1Data.partnershipName} - {taxDocument?.taxYear}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={validateK1}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Validate
            </button>
            <button
              onClick={distributeK1}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              disabled={taxDocument?.status !== 'VALIDATED'}
            >
              Distribute
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer */}
        <div className="w-1/2 bg-gray-100 p-4 overflow-auto">
          <div className="bg-white rounded-lg shadow h-full flex items-center justify-center">
            <p className="text-gray-500">PDF Viewer (embed would go here)</p>
          </div>
        </div>

        {/* Extracted Data */}
        <div className="w-1/2 bg-white p-6 overflow-auto">
          <h2 className="text-xl font-semibold mb-4">Extracted K-1 Data</h2>

          {/* Confidence Indicator */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium mb-2">Extraction Confidence</div>
            <div className="flex gap-2">
              <ConfidenceBadge
                label="Form Type"
                score={k1Data.confidence?.formType || 0}
              />
              <ConfidenceBadge
                label="Partnership"
                score={k1Data.confidence?.partnershipName || 0}
              />
              <ConfidenceBadge
                label="Income"
                score={k1Data.confidence?.ordinaryBusinessIncome || 0}
              />
            </div>
          </div>

          {/* Extracted Fields */}
          <div className="space-y-6">
            <Section title="Partnership Information">
              <Field label="Partnership Name" value={k1Data.partnershipName} />
              <Field label="EIN" value={k1Data.partnershipEIN} />
              <Field label="Form Type" value={k1Data.formType} />
            </Section>

            <Section title="Partner Information">
              <Field label="Partner Name" value={k1Data.partnerName} />
              <Field label="SSN/EIN" value="***-**-****" />
            </Section>

            <Section title="Income & Loss">
              <Field
                label="Ordinary Business Income"
                value={formatCurrency(k1Data.ordinaryBusinessIncome)}
              />
              <Field
                label="Net Rental Real Estate Income"
                value={formatCurrency(k1Data.netRentalRealEstateIncome)}
              />
              <Field
                label="Long-Term Capital Gain"
                value={formatCurrency(k1Data.netLongTermCapitalGain)}
              />
            </Section>

            <Section title="Distributions">
              <Field
                label="Cash Distributions"
                value={formatCurrency(k1Data.cashDistributions)}
              />
              <Field
                label="Non-Cash Distributions"
                value={formatCurrency(k1Data.nonCashDistributions)}
              />
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="space-y-2 pl-4">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between py-2 border-b">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value || '-'}</span>
    </div>
  );
}

function ConfidenceBadge({ label, score }: { label: string; score: number }) {
  const percentage = (score * 100).toFixed(0);
  const color = score >= 0.9 ? 'green' : score >= 0.8 ? 'yellow' : 'red';
  const colors = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
  };

  return (
    <div className={`px-3 py-1 rounded-full text-xs ${colors[color]}`}>
      {label}: {percentage}%
    </div>
  );
}

function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}
