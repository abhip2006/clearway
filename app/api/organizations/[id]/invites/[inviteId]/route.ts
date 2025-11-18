// Organization Invite Management API
// Handles individual invite operations (cancel)

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/multi-tenant/isolation';

/**
 * DELETE /api/organizations/[id]/invites/[inviteId]
 * Cancel a pending invitation
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; inviteId: string } }
) {
  try {
    const context = await getTenantContext();

    // Only OWNER and Admin can cancel invites
    if (!['OWNER', 'Admin'].includes(context.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify organization ID matches tenant context
    if (context.organizationId !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the invite
    await db.organizationInvite.delete({
      where: {
        id: params.inviteId,
        organizationId: params.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to cancel invitation';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
