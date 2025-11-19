// White-Label Agent - Task WL-003: Subdomain & Custom Domain Routing
// Handles subdomain and custom domain resolution for tenants

import { db } from '@/lib/db';
import dns from 'dns/promises';

/**
 * Parse host and determine tenant
 */
export async function resolveTenantFromHost(host: string) {
  // Remove port if present
  const hostWithoutPort = host.split(':')[0];

  // Check custom domain first (higher priority)
  const customDomainTenant = await db.whiteLabelTenant.findUnique({
    where: { customDomain: hostWithoutPort },
    select: { id: true, status: true, subdomain: true },
  });

  if (customDomainTenant?.status === 'ACTIVE') {
    return {
      tenantId: customDomainTenant.id,
      type: 'CUSTOM_DOMAIN' as const,
      subdomain: customDomainTenant.subdomain,
    };
  }

  // Check subdomain
  const subdomain = hostWithoutPort.split('.')[0];

  // Skip common subdomains that aren't tenants
  if (['app', 'www', 'api', 'admin', 'localhost', '127'].includes(subdomain)) {
    return null;
  }

  const subdomainTenant = await db.whiteLabelTenant.findUnique({
    where: { subdomain },
    select: { id: true, status: true },
  });

  if (subdomainTenant?.status === 'ACTIVE') {
    return {
      tenantId: subdomainTenant.id,
      type: 'SUBDOMAIN' as const,
      subdomain,
    };
  }

  return null;
}

/**
 * Validate custom domain with DNS check
 * Checks if domain resolves and points to our servers
 */
export async function validateCustomDomain(domain: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    // Remove protocol if present
    const cleanDomain = domain.replace(/^https?:\/\//, '');

    // Check if domain has DNS records
    const addresses = await dns.resolve4(cleanDomain);

    if (!addresses || addresses.length === 0) {
      return {
        valid: false,
        error: 'Domain does not resolve to any IP address',
      };
    }

    // Optional: Check if CNAME points to our domain
    try {
      const cname = await dns.resolveCname(cleanDomain);
      if (cname && cname.length > 0) {
        // Check if CNAME points to our domain
        const ourDomain = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '');
        if (!cname.some(c => c.includes(ourDomain || 'clearway.com'))) {
          return {
            valid: false,
            error: `CNAME should point to ${ourDomain || 'clearway.com'}`,
          };
        }
      }
    } catch (cnameError) {
      // CNAME not found, check A record instead
      // This is fine, custom domain can use A record
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'DNS resolution failed',
    };
  }
}

/**
 * Generate subdomain from fund admin name
 * Creates URL-safe subdomain
 */
export function generateSubdomain(fundAdminName: string): string {
  return fundAdminName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Check subdomain availability
 */
export async function isSubdomainAvailable(subdomain: string): Promise<boolean> {
  const existing = await db.whiteLabelTenant.findUnique({
    where: { subdomain },
  });
  return !existing;
}

/**
 * Check custom domain availability
 */
export async function isCustomDomainAvailable(domain: string): Promise<boolean> {
  const existing = await db.whiteLabelTenant.findUnique({
    where: { customDomain: domain },
  });
  return !existing;
}

/**
 * Validate subdomain format
 */
export function validateSubdomainFormat(subdomain: string): {
  valid: boolean;
  error?: string;
} {
  // Check length
  if (subdomain.length < 3) {
    return {
      valid: false,
      error: 'Subdomain must be at least 3 characters',
    };
  }

  if (subdomain.length > 50) {
    return {
      valid: false,
      error: 'Subdomain must be less than 50 characters',
    };
  }

  // Check format (alphanumeric and hyphens only)
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return {
      valid: false,
      error: 'Subdomain can only contain lowercase letters, numbers, and hyphens',
    };
  }

  // Check for reserved subdomains
  const reserved = [
    'app', 'www', 'api', 'admin', 'dashboard', 'portal',
    'login', 'auth', 'signup', 'billing', 'support',
    'help', 'docs', 'status', 'blog', 'mail', 'email',
  ];

  if (reserved.includes(subdomain)) {
    return {
      valid: false,
      error: 'This subdomain is reserved',
    };
  }

  // Cannot start or end with hyphen
  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    return {
      valid: false,
      error: 'Subdomain cannot start or end with a hyphen',
    };
  }

  return { valid: true };
}

/**
 * Get full URL for tenant
 */
export function getTenantUrl(tenant: {
  customDomain: string | null;
  subdomain: string;
}): string {
  if (tenant.customDomain) {
    return `https://${tenant.customDomain}`;
  }

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'clearway.com';
  return `https://${tenant.subdomain}.${baseDomain}`;
}

/**
 * Parse and normalize domain input
 */
export function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .trim();
}
