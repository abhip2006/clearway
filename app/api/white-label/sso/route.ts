// White-Label Agent - SSO Configuration API
// Configure and manage SSO for tenants

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { whiteLabelAuthService } from '@/lib/white-label/auth';
import { verifyTenantOwnership } from '@/lib/white-label/isolation';

/**
 * GET /api/white-label/sso?tenantId=xxx
 * Get SSO configuration for tenant
 */
export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const hasAccess = await verifyTenantOwnership(tenantId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { db } = await import('@/lib/db');
    const config = await db.ssoConfig.findUnique({
      where: { tenantId },
      select: {
        id: true,
        provider: true,
        name: true,
        enabled: true,
        metadataUrl: true,
        discoveryUrl: true,
        createdAt: true,
        updatedAt: true,
        // Don't expose secrets
      },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error fetching SSO config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SSO configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/white-label/sso
 * Create or update SSO configuration
 */
export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { tenantId, ...ssoParams } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const hasAccess = await verifyTenantOwnership(tenantId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Configure SSO
    const config = await whiteLabelAuthService.configureSSOConnection(
      tenantId,
      ssoParams
    );

    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    console.error('Error configuring SSO:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to configure SSO' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/white-label/sso?tenantId=xxx
 * Delete SSO configuration
 */
export async function DELETE(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const hasAccess = await verifyTenantOwnership(tenantId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await whiteLabelAuthService.deleteSSOConfig(tenantId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting SSO:', error);
    return NextResponse.json(
      { error: 'Failed to delete SSO configuration' },
      { status: 500 }
    );
  }
}
