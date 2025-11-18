// Tenant Isolation Middleware - Multi-Tenant & Enterprise Agent
// Task ENT-002: Tenant Isolation Middleware

import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { db } from '@/lib/db';

export interface TenantContext {
  organizationId: string;
  userId: string;
  permissions: string[];
  role: string;
}

/**
 * Get tenant context from subdomain or header
 */
export async function getTenantContext(): Promise<TenantContext> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    throw new Error('Unauthorized');
  }

  // Get user from Clerk ID
  const user = await db.user.findUnique({
    where: { clerkId },
    include: { organizationMemberships: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Get organization from subdomain or header
  const headersList = headers();
  const host = headersList.get('host') || '';
  const subdomain = host.split('.')[0];

  let organizationId: string;

  if (subdomain && subdomain !== 'app' && subdomain !== 'www' && subdomain !== 'localhost') {
    // Subdomain-based tenant
    const org = await db.organization.findUnique({
      where: { slug: subdomain },
    });
    if (!org) throw new Error('Organization not found');
    organizationId = org.id;
  } else {
    // Header-based or user's default organization
    const orgHeader = headersList.get('x-organization-id');
    if (orgHeader) {
      organizationId = orgHeader;
    } else {
      // Get user's primary organization or first membership
      organizationId = user.organizationId || user.organizationMemberships[0]?.organizationId;
      if (!organizationId) throw new Error('No organization found');
    }
  }

  // Get user's permissions in this organization
  const member = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: user.id,
      },
    },
  });

  if (!member) {
    throw new Error('User not member of organization');
  }

  return {
    organizationId,
    userId: user.id,
    permissions: member.permissions,
    role: member.role,
  };
}

/**
 * Check if user has permission
 */
export function checkPermission(
  permissions: string[],
  requiredPermission: string
): boolean {
  // Check for wildcard permission
  if (permissions.includes('*')) return true;

  // Check for specific permission
  if (permissions.includes(requiredPermission)) return true;

  // Check for namespace wildcard (e.g., "capital_calls:*")
  const namespace = requiredPermission.split(':')[0];
  if (permissions.includes(`${namespace}:*`)) return true;

  return false;
}

/**
 * Middleware to enforce tenant isolation and permission check
 */
export function requirePermission(permission: string) {
  return async () => {
    const context = await getTenantContext();

    if (!checkPermission(context.permissions, permission)) {
      throw new Error('Insufficient permissions');
    }

    return context;
  };
}

/**
 * Require specific role
 */
export async function requireRole(role: string | string[]) {
  const context = await getTenantContext();

  const roles = Array.isArray(role) ? role : [role];

  if (!roles.includes(context.role)) {
    throw new Error('Insufficient permissions');
  }

  return context;
}

/**
 * Database query wrapper with automatic tenant filtering
 * This creates a Prisma client extension that automatically adds
 * organizationId to all queries
 */
export function createTenantPrisma(organizationId: string) {
  return db.$extends({
    query: {
      capitalCall: {
        async findMany({ args, query }) {
          args.where = {
            ...args.where,
            organizationId,
          };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = {
            ...args.where,
            organizationId,
          };
          return query(args);
        },
        async findUnique({ args, query }) {
          // For findUnique, we need to add a post-query check
          const result = await query(args);
          if (result && result.organizationId !== organizationId) {
            return null;
          }
          return result;
        },
        async create({ args, query }) {
          args.data = {
            ...args.data,
            organizationId,
          };
          return query(args);
        },
        async update({ args, query }) {
          // Verify the record belongs to the organization
          const existing = await db.capitalCall.findUnique({
            where: args.where,
            select: { organizationId: true },
          });
          if (!existing || existing.organizationId !== organizationId) {
            throw new Error('Resource not found');
          }
          return query(args);
        },
        async delete({ args, query }) {
          // Verify the record belongs to the organization
          const existing = await db.capitalCall.findUnique({
            where: args.where,
            select: { organizationId: true },
          });
          if (!existing || existing.organizationId !== organizationId) {
            throw new Error('Resource not found');
          }
          return query(args);
        },
      },
      document: {
        async findMany({ args, query }) {
          args.where = {
            ...args.where,
            organizationId,
          };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = {
            ...args.where,
            organizationId,
          };
          return query(args);
        },
        async findUnique({ args, query }) {
          const result = await query(args);
          if (result && result.organizationId !== organizationId) {
            return null;
          }
          return result;
        },
        async create({ args, query }) {
          args.data = {
            ...args.data,
            organizationId,
          };
          return query(args);
        },
        async update({ args, query }) {
          const existing = await db.document.findUnique({
            where: args.where,
            select: { organizationId: true },
          });
          if (!existing || existing.organizationId !== organizationId) {
            throw new Error('Resource not found');
          }
          return query(args);
        },
        async delete({ args, query }) {
          const existing = await db.document.findUnique({
            where: args.where,
            select: { organizationId: true },
          });
          if (!existing || existing.organizationId !== organizationId) {
            throw new Error('Resource not found');
          }
          return query(args);
        },
      },
    },
  });
}

/**
 * Helper to get tenant-aware database client
 */
export async function getTenantDb() {
  const context = await getTenantContext();
  return createTenantPrisma(context.organizationId);
}

/**
 * Permission definitions for the application
 */
export const PERMISSIONS = {
  // Capital Calls
  CAPITAL_CALLS_READ: 'capital_calls:read',
  CAPITAL_CALLS_WRITE: 'capital_calls:write',
  CAPITAL_CALLS_APPROVE: 'capital_calls:approve',
  CAPITAL_CALLS_REJECT: 'capital_calls:reject',
  CAPITAL_CALLS_DELETE: 'capital_calls:delete',
  CAPITAL_CALLS_ALL: 'capital_calls:*',

  // Documents
  DOCUMENTS_READ: 'documents:read',
  DOCUMENTS_WRITE: 'documents:write',
  DOCUMENTS_DELETE: 'documents:delete',
  DOCUMENTS_ALL: 'documents:*',

  // Users
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  USERS_ALL: 'users:*',

  // Reports
  REPORTS_READ: 'reports:read',
  REPORTS_EXPORT: 'reports:export',
  REPORTS_ALL: 'reports:*',

  // Settings
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
  SETTINGS_ALL: 'settings:*',

  // Billing
  BILLING_READ: 'billing:read',
  BILLING_WRITE: 'billing:write',
  BILLING_ALL: 'billing:*',

  // All permissions
  ALL: '*',
} as const;

/**
 * Role definitions
 */
export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  VIEWER: 'Viewer',
} as const;
