// Organizations API - Multi-Tenant & Enterprise Agent
// Handles organization creation and listing

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { organizationService } from '@/lib/multi-tenant/organization';
import { db } from '@/lib/db';

/**
 * GET /api/organizations
 * Get all organizations for the current user
 */
export async function GET() {
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

    // Get user's organizations
    const organizations = await organizationService.getUserOrganizations(user.id);

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations
 * Create a new organization
 */
export async function POST(request: Request) {
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

    const body = await request.json();
    const { name, slug, domain, plan } = body;

    // Validate input
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Validate plan
    const validPlans = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
    if (plan && !validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    // Check if slug is already taken
    const existingOrg = await db.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Slug already taken' },
        { status: 409 }
      );
    }

    // Create organization
    const organization = await organizationService.createOrganization({
      name,
      slug,
      domain,
      ownerId: user.id,
      plan: plan || 'STARTER',
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}
