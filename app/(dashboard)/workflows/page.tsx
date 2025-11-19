// Clearway - Workflows List Page

'use client';

import React, { useEffect, useState } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus, Play, Pause, Edit, Trash2, Copy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function WorkflowsPage() {
  const { organization } = useOrganization();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization) {
      loadWorkflows();
    }
  }, [organization]);

  const loadWorkflows = async () => {
    try {
      const response = await fetch(
        `/api/workflows?organizationId=${organization?.id}`
      );
      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWorkflow = async (workflowId: string, enabled: boolean) => {
    try {
      await fetch(`/api/workflows/${workflowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      loadWorkflows();
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      await fetch(`/api/workflows/${workflowId}`, {
        method: 'DELETE',
      });
      loadWorkflows();
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading workflows...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-gray-600 mt-2">
            Automate repetitive tasks with no-code workflows
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/workflows/templates')}
          >
            Browse Templates
          </Button>
          <Button onClick={() => router.push('/workflows/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Workflow
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{workflow.name}</CardTitle>
                  {workflow.description && (
                    <CardDescription className="mt-1">
                      {workflow.description}
                    </CardDescription>
                  )}
                </div>
                <Badge variant={workflow.enabled ? 'default' : 'secondary'}>
                  {workflow.enabled ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Trigger:</span>{' '}
                  {workflow.trigger?.type?.replace(/_/g, ' ') || 'Not configured'}
                </div>

                <div className="text-sm text-gray-600">
                  <span className="font-medium">Branches:</span>{' '}
                  {workflow.branches?.length || 0}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/workflows/${workflow.id}`)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleToggleWorkflow(workflow.id, workflow.enabled)
                    }
                  >
                    {workflow.enabled ? (
                      <Pause className="w-4 h-4 mr-1" />
                    ) : (
                      <Play className="w-4 h-4 mr-1" />
                    )}
                    {workflow.enabled ? 'Pause' : 'Enable'}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteWorkflow(workflow.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {workflows.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">No workflows yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first workflow or browse templates to get started
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => router.push('/workflows/templates')}
              >
                Browse Templates
              </Button>
              <Button onClick={() => router.push('/workflows/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Workflow
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
