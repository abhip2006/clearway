// Organization Member Management API
// Handles individual member operations (update role, remove)

import { NextResponse } from 'next/server';
import { organizationService } from '@/lib/multi-tenant/organization';
import { getTenantContext, PERMISSIONS, checkPermission } from '@/lib/multi-tenant/isolation';

/**
 * PATCH /api/organizations/[id]/members/[userId]
 * Update a member's role
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const context = await getTenantContext();

    // Only OWNER can change roles
    if (context.role !== 'OWNER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify organization ID matches tenant context
    if (context.organizationId !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      );
    }

    await organizationService.updateMemberRole({
      organizationId: params.id,
      userId: params.userId,
      role,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating member role:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update member role';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/[id]/members/[userId]
 * Remove a member from the organization
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const context = await getTenantContext();

    // Only OWNER can remove members
    if (context.role !== 'OWNER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify organization ID matches tenant context
    if (context.organizationId !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await organizationService.removeMember({
      organizationId: params.id,
      userId: params.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to remove member';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
