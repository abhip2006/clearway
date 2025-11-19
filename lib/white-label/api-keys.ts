// White-Label Agent - Task WL-007: White-Label API Keys
// API key generation, validation, and management for tenants

import { db } from '@/lib/db';
import crypto from 'crypto';

export interface GenerateAPIKeyParams {
  name: string;
  expiresIn?: number; // days
  scopes: string[];
}

export interface APIKeyValidation {
  tenantId: string;
  scopes: string[];
  keyId: string;
}

export class APIKeyService {
  /**
   * Generate API key for tenant
   */
  async generateAPIKey(
    tenantId: string,
    params: GenerateAPIKeyParams
  ): Promise<{
    id: string;
    apiKey: string;
    name: string;
    createdAt: Date;
    expiresAt: Date | null;
  }> {
    const tenant = await db.whiteLabelTenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, status: true },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (tenant.status !== 'ACTIVE') {
      throw new Error('Tenant is not active');
    }

    // Generate API key with tenant prefix
    const keyPrefix = `cwk_${tenant.slug}_`;
    const randomPart = crypto.randomBytes(32).toString('hex');
    const apiKey = keyPrefix + randomPart;

    // Hash the API key for storage
    const hashedKey = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');

    // Calculate expiration date
    const expiresAt = params.expiresIn
      ? new Date(Date.now() + params.expiresIn * 24 * 60 * 60 * 1000)
      : null;

    // Validate scopes
    this.validateScopes(params.scopes);

    // Store in database
    const key = await db.apiKey.create({
      data: {
        tenantId,
        name: params.name,
        hashedKey,
        scopes: params.scopes,
        expiresAt,
        lastUsedAt: null,
      },
    });

    return {
      id: key.id,
      apiKey, // Only returned once during creation
      name: key.name,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
    };
  }

  /**
   * Validate API key scopes
   */
  private validateScopes(scopes: string[]): void {
    const validScopes = [
      '*', // Full access
      'capital_calls:read',
      'capital_calls:write',
      'capital_calls:*',
      'investors:read',
      'investors:write',
      'investors:*',
      'documents:read',
      'documents:write',
      'documents:*',
      'payments:read',
      'payments:write',
      'payments:*',
      'reports:read',
      'reports:*',
      'webhooks:read',
      'webhooks:write',
      'webhooks:*',
    ];

    scopes.forEach(scope => {
      if (!validScopes.includes(scope)) {
        throw new Error(`Invalid scope: ${scope}`);
      }
    });
  }

  /**
   * Validate API key and return tenant info
   */
  async validateAPIKey(apiKey: string): Promise<APIKeyValidation | null> {
    // Hash the provided key
    const hashedKey = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');

    const key = await db.apiKey.findUnique({
      where: { hashedKey },
      include: {
        tenant: {
          select: {
            id: true,
            status: true,
            plan: true,
            monthlyAPIQuota: true,
          },
        },
      },
    });

    if (!key) {
      return null;
    }

    // Check if key is revoked
    if (key.revokedAt) {
      return null;
    }

    // Check expiration
    if (key.expiresAt && key.expiresAt < new Date()) {
      return null;
    }

    // Check tenant status
    if (key.tenant.status !== 'ACTIVE') {
      return null;
    }

    // Update last used timestamp (async, don't wait)
    this.updateLastUsed(key.id).catch(console.error);

    return {
      tenantId: key.tenantId,
      scopes: key.scopes,
      keyId: key.id,
    };
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(keyId: string): Promise<void> {
    await db.apiKey.update({
      where: { id: keyId },
      data: { lastUsedAt: new Date() },
    });
  }

  /**
   * Revoke API key
   */
  async revokeAPIKey(tenantId: string, keyId: string): Promise<void> {
    const key = await db.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!key || key.tenantId !== tenantId) {
      throw new Error('API key not found');
    }

    await db.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Delete API key permanently
   */
  async deleteAPIKey(tenantId: string, keyId: string): Promise<void> {
    const key = await db.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!key || key.tenantId !== tenantId) {
      throw new Error('API key not found');
    }

    await db.apiKey.delete({
      where: { id: keyId },
    });
  }

  /**
   * List API keys for tenant
   */
  async listAPIKeys(tenantId: string) {
    return db.apiKey.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        expiresAt: true,
        lastUsedAt: true,
        revokedAt: true,
        scopes: true,
        // Never return hashedKey
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get API key details (without the key itself)
   */
  async getAPIKey(tenantId: string, keyId: string) {
    const key = await db.apiKey.findUnique({
      where: { id: keyId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        expiresAt: true,
        lastUsedAt: true,
        revokedAt: true,
        scopes: true,
        tenantId: true,
      },
    });

    if (!key || key.tenantId !== tenantId) {
      throw new Error('API key not found');
    }

    return key;
  }

  /**
   * Update API key metadata (name, scopes)
   */
  async updateAPIKey(
    tenantId: string,
    keyId: string,
    updates: {
      name?: string;
      scopes?: string[];
    }
  ) {
    const key = await db.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!key || key.tenantId !== tenantId) {
      throw new Error('API key not found');
    }

    if (updates.scopes) {
      this.validateScopes(updates.scopes);
    }

    return db.apiKey.update({
      where: { id: keyId },
      data: updates,
    });
  }

  /**
   * Check if tenant has reached API key limit
   */
  async hasReachedKeyLimit(tenantId: string): Promise<boolean> {
    const tenant = await db.whiteLabelTenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });

    const keyCount = await db.apiKey.count({
      where: {
        tenantId,
        revokedAt: null,
      },
    });

    // Define limits per plan
    const limits: Record<string, number> = {
      STARTER: 3,
      PROFESSIONAL: 10,
      ENTERPRISE: 100,
    };

    const limit = limits[tenant?.plan || 'STARTER'] || 3;
    return keyCount >= limit;
  }

  /**
   * Get API usage statistics for tenant
   */
  async getAPIUsageStats(tenantId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await db.apiUsageLog.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        endpoint: true,
        method: true,
        statusCode: true,
        responseTime: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate statistics
    const totalRequests = logs.length;
    const successfulRequests = logs.filter(l => l.statusCode >= 200 && l.statusCode < 300).length;
    const failedRequests = logs.filter(l => l.statusCode >= 400).length;
    const avgResponseTime = logs.reduce((sum, l) => sum + l.responseTime, 0) / totalRequests || 0;

    // Group by endpoint
    const byEndpoint = logs.reduce((acc, log) => {
      const key = `${log.method} ${log.endpoint}`;
      if (!acc[key]) {
        acc[key] = { count: 0, avgResponseTime: 0, errors: 0 };
      }
      acc[key].count++;
      acc[key].avgResponseTime += log.responseTime;
      if (log.statusCode >= 400) {
        acc[key].errors++;
      }
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages
    Object.keys(byEndpoint).forEach(key => {
      byEndpoint[key].avgResponseTime = byEndpoint[key].avgResponseTime / byEndpoint[key].count;
    });

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      avgResponseTime: Math.round(avgResponseTime),
      byEndpoint,
    };
  }

  /**
   * Log API usage
   */
  async logAPIUsage(params: {
    tenantId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
  }) {
    await db.apiUsageLog.create({
      data: params,
    });
  }
}

/**
 * API key validation middleware
 */
export async function validateAPIKeyMiddleware(
  req: Request
): Promise<APIKeyValidation | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const apiKey = authHeader.substring(7);
  const keyService = new APIKeyService();

  return keyService.validateAPIKey(apiKey);
}

/**
 * Check if request has required scope
 */
export function hasRequiredScope(
  validation: APIKeyValidation,
  requiredScope: string
): boolean {
  // Check for wildcard
  if (validation.scopes.includes('*')) {
    return true;
  }

  // Check exact match
  if (validation.scopes.includes(requiredScope)) {
    return true;
  }

  // Check resource wildcard (e.g., "capital_calls:*")
  const [resource] = requiredScope.split(':');
  if (validation.scopes.includes(`${resource}:*`)) {
    return true;
  }

  return false;
}

/**
 * Singleton instance
 */
export const apiKeyService = new APIKeyService();
