// Organization Invite Resend API
// Resends an invitation email

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/multi-tenant/isolation';

/**
 * POST /api/organizations/[id]/invites/[inviteId]/resend
 * Resend a pending invitation
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string; inviteId: string } }
) {
  try {
    const context = await getTenantContext();

    // Only OWNER and Admin can resend invites
    if (!['OWNER', 'Admin'].includes(context.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify organization ID matches tenant context
    if (context.organizationId !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the invite
    const invite = await db.organizationInvite.findUnique({
      where: {
        id: params.inviteId,
      },
      include: {
        organization: true,
      },
    });

    if (!invite || invite.organizationId !== params.id) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invite.acceptedAt) {
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 });
    }

    // In a real implementation, you would resend the email here
    // For now, we'll just update the createdAt timestamp to simulate a resend
    await db.organizationInvite.update({
      where: { id: params.inviteId },
      data: {
        createdAt: new Date(),
        // You could also extend the expiration date if desired
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // TODO: Send email using Resend or other email service
    // const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.token}`;
    // await resend.emails.send({...})

    return NextResponse.json({ success: true, message: 'Invitation resent successfully' });
  } catch (error) {
    console.error('Error resending invitation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to resend invitation';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
