// Organization Members API - Multi-Tenant & Enterprise Agent
// Handles member management for organizations

import { NextResponse } from 'next/server';
import { organizationService } from '@/lib/multi-tenant/organization';
import { getTenantContext, PERMISSIONS, checkPermission } from '@/lib/multi-tenant/isolation';

/**
 * GET /api/organizations/[id]/members
 * Get all members of an organization
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext();

    // Check permission
    if (!checkPermission(context.permissions, PERMISSIONS.USERS_READ)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify organization ID matches tenant context
    if (context.organizationId !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const members = await organizationService.getOrganizationMembers(params.id);

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations/[id]/members
 * Add a new member to the organization
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext();

    // Check permission
    if (!checkPermission(context.permissions, PERMISSIONS.USERS_WRITE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify organization ID matches tenant context
    if (context.organizationId !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    const result = await organizationService.addMember({
      organizationId: params.id,
      email,
      role,
      invitedBy: context.userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error adding member:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to add member';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
