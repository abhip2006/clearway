// Clearway - Workflow Templates API
// GET /api/workflow-templates - List templates
// POST /api/workflow-templates - Create template from workflow

import { NextRequest, NextResponse } from 'next/server';
import { workflowTemplateManager } from '@/lib/workflow/templates';
import { auth } from '@clerk/nextjs';

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || undefined;
    const industry = searchParams.get('industry') || undefined;
    const organizationOnly = searchParams.get('organizationOnly') === 'true';
    const organizationId = searchParams.get('organizationId') || undefined;

    const templates = await workflowTemplateManager.getTemplates({
      category,
      industry,
      organizationOnly,
      organizationId,
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
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
    const { workflowId, name, description, category, industry, isPublic } = body;

    if (!workflowId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const template = await workflowTemplateManager.saveAsTemplate(workflowId, {
      name,
      description,
      category,
      industry,
      isPublic,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create template' },
      { status: 500 }
    );
  }
}
