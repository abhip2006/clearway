// app/dashboard/tax/profile/page.tsx
// Tax Profile Management

'use client';

import { useState, useEffect } from 'react';

export default function TaxProfilePage() {
  const [profile, setProfile] = useState({
    taxIdType: 'SSN',
    taxId: '',
    entityType: 'INDIVIDUAL',
    preferredFormat: 'PDF',
    cpaEmail: '',
    cpaCopiesEnabled: false,
    w9Received: false,
  });

  const saveProfile = async () => {
    try {
      const res = await fetch('/api/tax/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (res.ok) {
        alert('Profile saved successfully!');
      }
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Tax Profile</h1>

      <div className="max-w-2xl">
        {/* Tax Identification */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Tax Identification</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                TIN Type
              </label>
              <select
                value={profile.taxIdType}
                onChange={(e) => setProfile({ ...profile, taxIdType: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="SSN">SSN</option>
                <option value="EIN">EIN</option>
                <option value="ITIN">ITIN</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax ID
              </label>
              <input
                type="password"
                value={profile.taxId}
                onChange={(e) => setProfile({ ...profile, taxId: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="XXX-XX-XXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entity Type
              </label>
              <select
                value={profile.entityType}
                onChange={(e) => setProfile({ ...profile, entityType: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="C_CORPORATION">C Corporation</option>
                <option value="S_CORPORATION">S Corporation</option>
                <option value="PARTNERSHIP">Partnership</option>
                <option value="TRUST_ESTATE">Trust/Estate</option>
                <option value="LLC">LLC</option>
              </select>
            </div>
          </div>
        </div>

        {/* W-9 Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">W-9 Information</h2>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">W-9 Status</div>
              <div className="text-sm text-gray-600">
                {profile.w9Received ? 'Received and verified' : 'Not received'}
              </div>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Upload W-9
            </button>
          </div>
        </div>

        {/* CPA Access */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">CPA Access</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CPA Email
              </label>
              <input
                type="email"
                value={profile.cpaEmail}
                onChange={(e) => setProfile({ ...profile, cpaEmail: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="cpa@example.com"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={profile.cpaCopiesEnabled}
                onChange={(e) =>
                  setProfile({ ...profile, cpaCopiesEnabled: e.target.checked })
                }
                className="mr-2"
              />
              <label className="text-sm text-gray-700">
                Automatically send K-1 copies to my CPA
              </label>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Preferences</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Export Format
            </label>
            <select
              value={profile.preferredFormat}
              onChange={(e) =>
                setProfile({ ...profile, preferredFormat: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="PDF">PDF</option>
              <option value="TURBOTAX">TurboTax (.txf)</option>
              <option value="HR_BLOCK">H&R Block</option>
            </select>
          </div>
        </div>

        <button
          onClick={saveProfile}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Save Profile
        </button>
      </div>
    </div>
  );
}
