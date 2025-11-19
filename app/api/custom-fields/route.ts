// Clearway - Custom Fields API
// GET /api/custom-fields - List custom fields
// POST /api/custom-fields - Create custom field

import { NextRequest, NextResponse } from 'next/server';
import { customFieldManager, CustomFieldEntityType, CustomFieldType } from '@/lib/workflow/custom-fields';
import { auth } from '@clerk/nextjs';

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');
    const entityType = searchParams.get('entityType') as CustomFieldEntityType;

    if (!organizationId || !entityType) {
      return NextResponse.json(
        { error: 'organizationId and entityType required' },
        { status: 400 }
      );
    }

    const fields = await customFieldManager.getFieldsByEntity(
      organizationId,
      entityType
    );

    return NextResponse.json({ fields });
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom fields' },
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
    const {
      organizationId,
      entityType,
      name,
      fieldType,
      description,
      required,
      defaultValue,
      validation,
      displaySettings,
    } = body;

    if (!organizationId || !entityType || !name || !fieldType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const field = await customFieldManager.createField(organizationId, {
      entityType,
      name,
      fieldType,
      description,
      required,
      defaultValue,
      validation,
      displaySettings,
    });

    return NextResponse.json({ field }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating custom field:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create custom field' },
      { status: 500 }
    );
  }
}
