// Clearway - Use Workflow Template API
// POST /api/workflow-templates/[id]/use - Create workflow from template

import { NextRequest, NextResponse } from 'next/server';
import { workflowTemplateManager } from '@/lib/workflow/templates';
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
    const { organizationId, name } = body;

    if (!organizationId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const workflow = await workflowTemplateManager.createFromTemplate(
      params.id,
      organizationId,
      { name, userId }
    );

    return NextResponse.json({ workflow });
  } catch (error: any) {
    console.error('Error using template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to use template' },
      { status: 500 }
    );
  }
}
