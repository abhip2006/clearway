// app/api/v1/marketplace/keys/route.ts
// API Key management endpoints

import { db } from '@/lib/db';
import { successResponse, errorResponse, generateAPIKey, hashAPIKey } from '@/lib/api-marketplace/utils';
import { currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';

const CreateAPIKeySchema = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(z.string()),
  expiresAt: z.string().datetime().optional(),
});

// GET /api/v1/marketplace/keys - List API keys
export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return errorResponse('unauthorized', 'Authentication required', 401);
    }

    // Get or create developer account
    let developer = await db.developerAccount.findUnique({
      where: { userId: user.id },
    });

    if (!developer) {
      return successResponse([]);
    }

    // List all API keys (masked)
    const apiKeys = await db.marketplaceAPIKey.findMany({
      where: { developerId: developer.id },
      include: {
        rateLimit: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mask keys for security
    const maskedKeys = apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      key: `${key.keyPrefix}...${key.keyHash.slice(-4)}`,
      scopes: key.scopes,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      rateLimit: key.rateLimit ? {
        tier: key.rateLimit.tier,
        requestsPerSecond: key.rateLimit.requestsPerSecond,
        requestsPerDay: key.rateLimit.requestsPerDay,
        requestsPerMonth: key.rateLimit.requestsPerMonth,
      } : null,
    }));

    return successResponse(maskedKeys);
  } catch (error: any) {
    console.error('Error listing API keys:', error);
    return errorResponse('internal_error', 'Failed to list API keys', 500);
  }
}

// POST /api/v1/marketplace/keys - Create new API key
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return errorResponse('unauthorized', 'Authentication required', 401);
    }

    const body = await req.json();
    const data = CreateAPIKeySchema.parse(body);

    // Get or create developer account
    let developer = await db.developerAccount.findUnique({
      where: { userId: user.id },
    });

    if (!developer) {
      developer = await db.developerAccount.create({
        data: {
          userId: user.id,
        },
      });
    }

    // Generate API key and secret
    const { key, secret } = generateAPIKey();
    const keyHash = hashAPIKey(key);
    const secretHash = hashAPIKey(secret);

    // Get default rate limit for STARTER tier
    let rateLimit = await db.marketplaceRateLimit.findFirst({
      where: { tier: 'STARTER' },
    });

    if (!rateLimit) {
      // Create default rate limit
      rateLimit = await db.marketplaceRateLimit.create({
        data: {
          tier: 'STARTER',
          requestsPerSecond: 10,
          requestsPerDay: 10000,
          requestsPerMonth: 100000,
          concurrentRequests: 5,
        },
      });
    }

    // Create API key
    const apiKey = await db.marketplaceAPIKey.create({
      data: {
        developerId: developer.id,
        name: data.name,
        keyPrefix: key.split('_')[0] + '_',
        keyHash,
        secretHash,
        scopes: data.scopes,
        rateLimitId: rateLimit.id,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
      include: {
        rateLimit: true,
      },
    });

    return successResponse(
      {
        id: apiKey.id,
        name: apiKey.name,
        key, // Only returned once!
        secret, // Only returned once!
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
        rateLimit: {
          tier: apiKey.rateLimit.tier,
          requestsPerSecond: apiKey.rateLimit.requestsPerSecond,
          requestsPerDay: apiKey.rateLimit.requestsPerDay,
          requestsPerMonth: apiKey.rateLimit.requestsPerMonth,
        },
        createdAt: apiKey.createdAt,
        warning: 'Save your API key and secret securely. They will not be shown again.',
      },
      201
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse('validation_error', 'Invalid request data', 400, error.errors);
    }
    console.error('Error creating API key:', error);
    return errorResponse('internal_error', 'Failed to create API key', 500);
  }
}
