// Clearway - Execute Workflow API
// POST /api/workflows/[id]/execute - Manually execute workflow

import { NextRequest, NextResponse } from 'next/server';
import { workflowExecutionEngine } from '@/lib/workflow/execution-engine';
import { auth } from '@clerk/nextjs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { entityType, entityId, triggerData } = body;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const executionId = await workflowExecutionEngine.executeWorkflow({
      workflowId: params.id,
      triggerType: 'MANUAL',
      entityType,
      entityId,
      triggerData: triggerData || {},
      userId,
    });

    return NextResponse.json({ executionId });
  } catch (error: any) {
    console.error('Error executing workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute workflow' },
      { status: 500 }
    );
  }
}
