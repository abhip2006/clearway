// Clearway - Publish Workflow API
// POST /api/workflows/[id]/publish - Publish workflow

import { NextRequest, NextResponse } from 'next/server';
import { workflowBuilder } from '@/lib/workflow/workflow-builder';
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

    const workflow = await workflowBuilder.publishWorkflow(params.id, userId);

    return NextResponse.json({ workflow });
  } catch (error: any) {
    console.error('Error publishing workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to publish workflow' },
      { status: 500 }
    );
  }
}
