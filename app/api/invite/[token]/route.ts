// Invitation Acceptance API - Multi-Tenant & Enterprise Agent
// Handles accepting organization invitations

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { organizationService } from '@/lib/multi-tenant/organization';
import { db } from '@/lib/db';

/**
 * POST /api/invite/[token]
 * Accept an organization invitation
 */
export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const user = await db.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Accept invitation
    const organizationId = await organizationService.acceptInvitation(
      params.token,
      user.id
    );

    // Get organization details
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
    });

    return NextResponse.json({
      success: true,
      organization,
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to accept invitation';
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}

/**
 * GET /api/invite/[token]
 * Get invitation details
 */
export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const invite = await db.organizationInvite.findUnique({
      where: { token: params.token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 });
    }

    if (invite.acceptedAt) {
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 });
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invitation expired' }, { status: 400 });
    }

    return NextResponse.json({
      email: invite.email,
      role: invite.role,
      organization: invite.organization,
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    );
  }
}
