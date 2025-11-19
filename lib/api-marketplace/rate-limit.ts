// lib/api-marketplace/rate-limit.ts
// Rate limiting middleware for API Marketplace

import { db } from '@/lib/db';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export class RateLimiter {
  // Three-tier rate limiting: per-second, per-day, per-month

  static async checkRateLimit(
    apiKeyId: string,
    tier: string
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const secondKey = `ratelimit:${apiKeyId}:second:${Math.floor(now / 1000)}`;
    const dayKey = `ratelimit:${apiKeyId}:day:${new Date().toISOString().split('T')[0]}`;
    const monthKey = `ratelimit:${apiKeyId}:month:${new Date().toISOString().slice(0, 7)}`;

    // Get tier limits
    const limits = this.getTierLimits(tier);

    // Check per-second limit
    const secondCount = await redis.incr(secondKey);
    await redis.expire(secondKey, 2); // Expire after 2 seconds

    if (secondCount > limits.requestsPerSecond) {
      return {
        allowed: false,
        limit: limits.requestsPerSecond,
        remaining: 0,
        reset: Math.floor(now / 1000) + 1,
      };
    }

    // Check per-day limit
    const dayCount = await redis.incr(dayKey);
    await redis.expireat(dayKey, Math.floor(new Date().setHours(23, 59, 59, 999) / 1000));

    if (dayCount > limits.requestsPerDay) {
      return {
        allowed: false,
        limit: limits.requestsPerDay,
        remaining: 0,
        reset: Math.floor(new Date().setHours(23, 59, 59, 999) / 1000),
      };
    }

    // Check per-month limit
    const monthCount = await redis.incr(monthKey);
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    await redis.expireat(monthKey, Math.floor(endOfMonth.getTime() / 1000));

    if (monthCount > limits.requestsPerMonth) {
      return {
        allowed: false,
        limit: limits.requestsPerMonth,
        remaining: 0,
        reset: Math.floor(endOfMonth.getTime() / 1000),
      };
    }

    return {
      allowed: true,
      limit: limits.requestsPerMonth,
      remaining: limits.requestsPerMonth - monthCount,
      reset: Math.floor(endOfMonth.getTime() / 1000),
    };
  }

  static getTierLimits(tier: string) {
    const limits = {
      STARTER: {
        requestsPerSecond: 10,
        requestsPerDay: 10000,
        requestsPerMonth: 100000,
        concurrentRequests: 5,
      },
      PRO: {
        requestsPerSecond: 50,
        requestsPerDay: 100000,
        requestsPerMonth: 10000000,
        concurrentRequests: 25,
      },
      ENTERPRISE: {
        requestsPerSecond: 1000,
        requestsPerDay: 10000000,
        requestsPerMonth: -1, // Unlimited
        concurrentRequests: 1000,
      },
    };

    return limits[tier as keyof typeof limits] || limits.STARTER;
  }

  static rateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.reset.toString(),
    };
  }
}

// Authenticate API key and check rate limits
export async function authenticateAPIKey(
  apiKey: string
): Promise<{
  success: boolean;
  apiKeyData?: any;
  rateLimit?: RateLimitResult;
  error?: string;
}> {
  try {
    // Hash the API key
    const crypto = await import('crypto');
    const keyHash = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');

    // Find API key in database
    const apiKeyData = await db.marketplaceAPIKey.findUnique({
      where: { keyHash },
      include: {
        developer: true,
        rateLimit: true,
      },
    });

    if (!apiKeyData || !apiKeyData.isActive) {
      return { success: false, error: 'Invalid API key' };
    }

    // Check if expired
    if (apiKeyData.expiresAt && apiKeyData.expiresAt < new Date()) {
      return { success: false, error: 'API key expired' };
    }

    // Check rate limit
    const tier = apiKeyData.rateLimit?.tier || 'STARTER';
    const rateLimit = await RateLimiter.checkRateLimit(apiKeyData.id, tier);

    if (!rateLimit.allowed) {
      return { success: false, rateLimit, error: 'Rate limit exceeded' };
    }

    // Update last used timestamp
    await db.marketplaceAPIKey.update({
      where: { id: apiKeyData.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      success: true,
      apiKeyData,
      rateLimit,
    };
  } catch (error) {
    return { success: false, error: 'Authentication failed' };
  }
}

// Log API usage
export async function logAPIUsage(
  apiKeyId: string,
  userId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  requestTimeMs: number,
  requestSizeBytes: number,
  responseSizeBytes: number
) {
  try {
    await db.marketplaceAPIUsageLog.create({
      data: {
        apiKeyId,
        userId,
        endpoint,
        method,
        statusCode,
        requestTimeMs,
        requestSizeBytes,
        responseSizeBytes,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to log API usage:', error);
  }
}
