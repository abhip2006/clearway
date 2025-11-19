// Clearway - Workflows API
// GET /api/workflows - List workflows
// POST /api/workflows - Create workflow

import { NextRequest, NextResponse } from 'next/server';
import { workflowBuilder } from '@/lib/workflow/workflow-builder';
import { auth } from '@clerk/nextjs';

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId required' },
        { status: 400 }
      );
    }

    const enabled = searchParams.get('enabled');
    const filters: any = {};

    if (enabled !== null) {
      filters.enabled = enabled === 'true';
    }

    const workflows = await workflowBuilder.listWorkflows(organizationId, filters);

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, name, description, trigger } = body;

    if (!organizationId || !name || !trigger) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const workflow = await workflowBuilder.createWorkflow(organizationId, {
      name,
      description,
      trigger,
      userId,
    });

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}
