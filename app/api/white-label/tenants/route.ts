// White-Label Agent - Tenant Management API
// Create, list, and manage white-label tenants

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSubdomain, validateSubdomainFormat } from '@/lib/white-label/domain-routing';
import { auth } from '@clerk/nextjs';

/**
 * GET /api/white-label/tenants
 * List all tenants for the authenticated user
 */
export async function GET(req: Request) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenants = await db.whiteLabelTenant.findMany({
      where: { fundAdminId: userId },
      include: {
        brandingConfig: true,
        ssoConfig: true,
        _count: {
          select: {
            users: true,
            apiKeys: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tenants });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/white-label/tenants
 * Create a new white-label tenant
 */
export async function POST(req: Request) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, slug, subdomain, plan = 'STARTER' } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Generate or validate subdomain
    let finalSubdomain = subdomain || generateSubdomain(name);

    const subdomainValidation = validateSubdomainFormat(finalSubdomain);
    if (!subdomainValidation.valid) {
      return NextResponse.json(
        { error: subdomainValidation.error },
        { status: 400 }
      );
    }

    // Check subdomain availability
    const existing = await db.whiteLabelTenant.findUnique({
      where: { subdomain: finalSubdomain },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Subdomain already taken' },
        { status: 400 }
      );
    }

    // Generate slug
    const finalSlug = slug || generateSubdomain(name);

    // Create tenant
    const tenant = await db.whiteLabelTenant.create({
      data: {
        fundAdminId: userId,
        slug: finalSlug,
        subdomain: finalSubdomain,
        status: 'ACTIVE',
        plan,
      },
      include: {
        brandingConfig: true,
        ssoConfig: true,
      },
    });

    // Create default branding config
    await db.brandingConfig.create({
      data: {
        tenantId: tenant.id,
        companyName: name,
      },
    });

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    );
  }
}
