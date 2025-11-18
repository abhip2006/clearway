// Organization Invites API - Multi-Tenant & Enterprise Agent
// Handles invitation management

import { NextResponse } from 'next/server';
import { organizationService } from '@/lib/multi-tenant/organization';
import { getTenantContext, PERMISSIONS, checkPermission } from '@/lib/multi-tenant/isolation';

/**
 * GET /api/organizations/[id]/invites
 * Get pending invitations for an organization
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

    const invites = await organizationService.getPendingInvites(params.id);

    return NextResponse.json({ invites });
  } catch (error) {
    console.error('Error fetching invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    );
  }
}
