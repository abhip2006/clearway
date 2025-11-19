// Clearway - Workflow Builder Page

'use client';

import React from 'react';
import { useOrganization } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { WorkflowBuilder } from '@/components/workflow/WorkflowBuilder';

export default function WorkflowBuilderPage({
  params,
}: {
  params: { id: string };
}) {
  const { organization } = useOrganization();
  const router = useRouter();

  const handleSave = async (workflowData: any) => {
    try {
      const response = await fetch(`/api/workflows/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData),
      });

      if (response.ok) {
        alert('Workflow saved successfully!');
        router.push('/workflows');
      } else {
        alert('Failed to save workflow');
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Failed to save workflow');
    }
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <WorkflowBuilder
      workflowId={params.id === 'new' ? undefined : params.id}
      organizationId={organization.id}
      onSave={handleSave}
    />
  );
}
