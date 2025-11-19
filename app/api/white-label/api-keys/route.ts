// White-Label Agent - API Key Management API
// Generate, list, and manage API keys for tenants

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { apiKeyService } from '@/lib/white-label/api-keys';
import { verifyTenantOwnership } from '@/lib/white-label/isolation';

/**
 * GET /api/white-label/api-keys?tenantId=xxx
 * List API keys for tenant
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

    const keys = await apiKeyService.listAPIKeys(tenantId);
    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/white-label/api-keys
 * Generate a new API key
 */
export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { tenantId, name, expiresIn, scopes } = body;

    if (!tenantId || !name || !scopes) {
      return NextResponse.json(
        { error: 'tenantId, name, and scopes are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const hasAccess = await verifyTenantOwnership(tenantId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if tenant has reached key limit
    const hasReachedLimit = await apiKeyService.hasReachedKeyLimit(tenantId);
    if (hasReachedLimit) {
      return NextResponse.json(
        { error: 'API key limit reached for your plan' },
        { status: 403 }
      );
    }

    // Generate API key
    const key = await apiKeyService.generateAPIKey(tenantId, {
      name,
      expiresIn,
      scopes,
    });

    return NextResponse.json({ key }, { status: 201 });
  } catch (error) {
    console.error('Error generating API key:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate API key' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/white-label/api-keys?tenantId=xxx&keyId=xxx
 * Revoke an API key
 */
export async function DELETE(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId');
    const keyId = url.searchParams.get('keyId');

    if (!tenantId || !keyId) {
      return NextResponse.json(
        { error: 'tenantId and keyId are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const hasAccess = await verifyTenantOwnership(tenantId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await apiKeyService.revokeAPIKey(tenantId, keyId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking API key:', error);
    return NextResponse.json(
      { error: 'Failed to revoke API key' },
      { status: 500 }
    );
  }
}
