// Clearway - Workflow Execution History Page

'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function WorkflowExecutionsPage({
  params,
}: {
  params: { id: string };
}) {
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExecutions();
  }, []);

  const loadExecutions = async () => {
    try {
      const response = await fetch(`/api/workflows/${params.id}/executions`);
      const data = await response.json();
      setExecutions(data.executions || []);
    } catch (error) {
      console.error('Failed to load executions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'RUNNING':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary'> = {
      SUCCEEDED: 'default',
      FAILED: 'destructive',
      RUNNING: 'secondary',
      PENDING: 'secondary',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading execution history...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Execution History</h1>
        <p className="text-gray-600 mt-2">
          View all workflow execution logs and results
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Executions</CardTitle>
          <CardDescription>
            All workflow executions for this workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((execution) => (
                <TableRow key={execution.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(execution.status)}
                      {getStatusBadge(execution.status)}
                    </div>
                  </TableCell>
                  <TableCell>{execution.triggerType}</TableCell>
                  <TableCell>
                    {execution.entityType}: {execution.entityId.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    {execution.startedAt
                      ? formatDistanceToNow(new Date(execution.startedAt), {
                          addSuffix: true,
                        })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {execution.completedAt && execution.startedAt
                      ? `${Math.round(
                          (new Date(execution.completedAt).getTime() -
                            new Date(execution.startedAt).getTime()) /
                            1000
                        )}s`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {execution.actionLogs?.length || 0} actions
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {executions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No executions yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
