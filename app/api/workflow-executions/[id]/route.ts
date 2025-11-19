// Clearway - Workflow Execution API
// GET /api/workflow-executions/[id] - Get execution details

import { NextRequest, NextResponse } from 'next/server';
import { workflowExecutionEngine } from '@/lib/workflow/execution-engine';
import { auth } from '@clerk/nextjs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const execution = await workflowExecutionEngine.getExecution(params.id);

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    return NextResponse.json({ execution });
  } catch (error) {
    console.error('Error fetching execution:', error);
    return NextResponse.json(
      { error: 'Failed to fetch execution' },
      { status: 500 }
    );
  }
}
