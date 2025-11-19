// White-Label Agent - Task WL-001: Tenant Context & Middleware
// Extracts tenant context from subdomain, custom domain, or header

import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { cache } from 'react';

/**
 * Tenant context type
 */
export type TenantContext = {
  tenantId: string;
  fundAdminId: string;
  brandingConfig: any;
  ssoConfig: any;
  customDomain: string | null;
  subdomain: string;
  status: string;
};

/**
 * Get tenant context from subdomain, custom domain, or header
 * Cached per request for performance
 */
export const getTenantContext = cache(async (): Promise<TenantContext> => {
  const headersList = headers();
  const host = headersList.get('host') || '';

  let tenant = null;

  // Try custom domain first
  tenant = await db.whiteLabelTenant.findUnique({
    where: { customDomain: host.split(':')[0] },
    include: {
      fundAdmin: true,
      brandingConfig: true,
      ssoConfig: true,
    },
  });

  // Try subdomain
  if (!tenant) {
    const subdomain = host.split('.')[0].split(':')[0];
    if (subdomain && !['app', 'www', 'api', 'localhost'].includes(subdomain)) {
      tenant = await db.whiteLabelTenant.findUnique({
        where: { subdomain },
        include: {
          fundAdmin: true,
          brandingConfig: true,
          ssoConfig: true,
        },
      });
    }
  }

  // Try x-tenant-id header (for API requests)
  if (!tenant) {
    const tenantId = headersList.get('x-tenant-id');
    if (tenantId) {
      tenant = await db.whiteLabelTenant.findUnique({
        where: { id: tenantId },
        include: {
          fundAdmin: true,
          brandingConfig: true,
          ssoConfig: true,
        },
      });
    }
  }

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  if (tenant.status !== 'ACTIVE') {
    throw new Error(`Tenant is ${tenant.status.toLowerCase()}`);
  }

  return {
    tenantId: tenant.id,
    fundAdminId: tenant.fundAdminId,
    brandingConfig: tenant.brandingConfig,
    ssoConfig: tenant.ssoConfig,
    customDomain: tenant.customDomain,
    subdomain: tenant.subdomain,
    status: tenant.status,
  };
});

/**
 * Get tenant context or return null if not found
 * Useful for optional tenant context
 */
export async function getTenantContextOptional(): Promise<TenantContext | null> {
  try {
    return await getTenantContext();
  } catch (error) {
    return null;
  }
}

/**
 * Validate tenant exists and is active
 */
export async function validateTenant(tenantId: string): Promise<boolean> {
  const tenant = await db.whiteLabelTenant.findUnique({
    where: { id: tenantId },
    select: { status: true },
  });

  return tenant?.status === 'ACTIVE';
}
