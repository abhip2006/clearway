// White-Label Agent - Branding Management API
// Update branding configuration and upload assets

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { brandingService } from '@/lib/white-label/branding';
import { verifyTenantOwnership } from '@/lib/white-label/isolation';

/**
 * GET /api/white-label/branding?tenantId=xxx
 * Get branding configuration for tenant
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

    const config = await brandingService.getBrandingConfig(tenantId);
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error fetching branding:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branding' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/white-label/branding
 * Update branding configuration
 */
export async function PUT(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { tenantId, ...config } = body;

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

    // Validate colors if provided
    if (config.primaryColor && !brandingService.validateColor(config.primaryColor)) {
      return NextResponse.json(
        { error: 'Invalid primary color format' },
        { status: 400 }
      );
    }

    const updated = await brandingService.updateBrandingConfig(tenantId, config);

    // Regenerate theme CSS
    const themeUrl = await brandingService.generateThemeCSS(tenantId);

    return NextResponse.json({ config: updated, themeUrl });
  } catch (error) {
    console.error('Error updating branding:', error);
    return NextResponse.json(
      { error: 'Failed to update branding' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/white-label/branding/upload-logo
 * Upload logo image
 */
export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const tenantId = formData.get('tenantId') as string;
    const file = formData.get('logo') as File;

    if (!tenantId || !file) {
      return NextResponse.json(
        { error: 'tenantId and logo file are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const hasAccess = await verifyTenantOwnership(tenantId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload logo
    const logoUrl = await brandingService.uploadLogo(tenantId, buffer);

    return NextResponse.json({ logoUrl });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json(
      { error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}
