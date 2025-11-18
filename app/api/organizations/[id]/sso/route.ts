// Organization SSO API - Multi-Tenant & Enterprise Agent
// Handles SSO configuration for organizations

import { NextResponse } from 'next/server';
import { samlService } from '@/lib/auth/saml';
import { getTenantContext, PERMISSIONS, checkPermission, ROLES } from '@/lib/multi-tenant/isolation';
import { db } from '@/lib/db';

/**
 * GET /api/organizations/[id]/sso
 * Get SSO configuration for an organization
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext();

    // Check permission - only admins and owners can view SSO settings
    if (!checkPermission(context.permissions, PERMISSIONS.SETTINGS_READ)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify organization ID matches tenant context
    if (context.organizationId !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get SSO connections
    const connections = await db.sSOConnection.findMany({
      where: { organizationId: params.id },
    });

    // Sanitize config to remove sensitive data
    const sanitizedConnections = connections.map(conn => ({
      ...conn,
      config: {
        ...(conn.config as Record<string, unknown>),
        clientSecret: undefined,
        metadataXml: undefined,
      },
    }));

    return NextResponse.json({ connections: sanitizedConnections });
  } catch (error) {
    console.error('Error fetching SSO config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SSO configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations/[id]/sso
 * Create or update SSO configuration
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext();

    // Check permission - only owners can configure SSO
    if (context.role !== ROLES.OWNER && !checkPermission(context.permissions, PERMISSIONS.SETTINGS_WRITE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify organization ID matches tenant context
    if (context.organizationId !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { provider, metadataUrl, metadataXml, defaultRedirectUrl } = body;

    if (!provider || provider !== 'SAML') {
      return NextResponse.json(
        { error: 'Only SAML provider is currently supported' },
        { status: 400 }
      );
    }

    if (!metadataUrl && !metadataXml) {
      return NextResponse.json(
        { error: 'Either metadataUrl or metadataXml is required' },
        { status: 400 }
      );
    }

    // Check if organization has enterprise plan
    const organization = await db.organization.findUnique({
      where: { id: params.id },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (organization.plan !== 'ENTERPRISE') {
      return NextResponse.json(
        { error: 'SSO is only available for Enterprise plans' },
        { status: 403 }
      );
    }

    // Create SAML connection
    const connection = await samlService.createSAMLConnection({
      organizationId: params.id,
      metadataUrl,
      metadataXml,
      defaultRedirectUrl: defaultRedirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    console.error('Error creating SSO config:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create SSO configuration';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/[id]/sso
 * Delete SSO configuration
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext();

    // Check permission - only owners can delete SSO
    if (context.role !== ROLES.OWNER) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify organization ID matches tenant context
    if (context.organizationId !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'connectionId is required' },
        { status: 400 }
      );
    }

    await samlService.deleteSAMLConnection({
      connectionId,
      organizationId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting SSO config:', error);
    return NextResponse.json(
      { error: 'Failed to delete SSO configuration' },
      { status: 500 }
    );
  }
}
