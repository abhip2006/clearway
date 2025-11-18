// Organization Roles API - Multi-Tenant & Enterprise Agent
// Handles custom role management

import { NextResponse } from 'next/server';
import { organizationService } from '@/lib/multi-tenant/organization';
import { getTenantContext, PERMISSIONS, checkPermission } from '@/lib/multi-tenant/isolation';

/**
 * GET /api/organizations/[id]/roles
 * Get all roles for an organization
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

    const roles = await organizationService.getOrganizationRoles(params.id);

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations/[id]/roles
 * Create a custom role
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext();

    // Check permission - only admins and owners can create roles
    if (!checkPermission(context.permissions, PERMISSIONS.SETTINGS_WRITE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify organization ID matches tenant context
    if (context.organizationId !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, permissions } = body;

    if (!name || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Name and permissions array are required' },
        { status: 400 }
      );
    }

    const role = await organizationService.createRole({
      organizationId: params.id,
      name,
      description,
      permissions,
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create role';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
