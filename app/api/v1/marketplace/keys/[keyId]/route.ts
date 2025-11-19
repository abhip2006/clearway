// app/api/v1/marketplace/keys/[keyId]/route.ts
// Individual API Key operations

import { db } from '@/lib/db';
import { successResponse, errorResponse, generateAPIKey, hashAPIKey } from '@/lib/api-marketplace/utils';
import { currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';

const UpdateAPIKeySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  scopes: z.array(z.string()).optional(),
});

// GET /api/v1/marketplace/keys/[keyId] - Get specific key details
export async function GET(
  req: Request,
  { params }: { params: { keyId: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return errorResponse('unauthorized', 'Authentication required', 401);
    }

    const developer = await db.developerAccount.findUnique({
      where: { userId: user.id },
    });

    if (!developer) {
      return errorResponse('not_found', 'Developer account not found', 404);
    }

    const apiKey = await db.marketplaceAPIKey.findFirst({
      where: {
        id: params.keyId,
        developerId: developer.id,
      },
      include: {
        rateLimit: true,
      },
    });

    if (!apiKey) {
      return errorResponse('not_found', 'API key not found', 404);
    }

    return successResponse({
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      key: `${apiKey.keyPrefix}...${apiKey.keyHash.slice(-4)}`,
      scopes: apiKey.scopes,
      isActive: apiKey.isActive,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      rateLimit: apiKey.rateLimit ? {
        tier: apiKey.rateLimit.tier,
        requestsPerSecond: apiKey.rateLimit.requestsPerSecond,
        requestsPerDay: apiKey.rateLimit.requestsPerDay,
        requestsPerMonth: apiKey.rateLimit.requestsPerMonth,
      } : null,
    });
  } catch (error) {
    console.error('Error getting API key:', error);
    return errorResponse('internal_error', 'Failed to get API key', 500);
  }
}

// PUT /api/v1/marketplace/keys/[keyId] - Update API key
export async function PUT(
  req: Request,
  { params }: { params: { keyId: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return errorResponse('unauthorized', 'Authentication required', 401);
    }

    const body = await req.json();
    const data = UpdateAPIKeySchema.parse(body);

    const developer = await db.developerAccount.findUnique({
      where: { userId: user.id },
    });

    if (!developer) {
      return errorResponse('not_found', 'Developer account not found', 404);
    }

    const apiKey = await db.marketplaceAPIKey.findFirst({
      where: {
        id: params.keyId,
        developerId: developer.id,
      },
    });

    if (!apiKey) {
      return errorResponse('not_found', 'API key not found', 404);
    }

    const updated = await db.marketplaceAPIKey.update({
      where: { id: params.keyId },
      data: {
        name: data.name,
        scopes: data.scopes,
      },
      include: {
        rateLimit: true,
      },
    });

    return successResponse({
      id: updated.id,
      name: updated.name,
      keyPrefix: updated.keyPrefix,
      scopes: updated.scopes,
      isActive: updated.isActive,
      lastUsedAt: updated.lastUsedAt,
      expiresAt: updated.expiresAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse('validation_error', 'Invalid request data', 400, error.errors);
    }
    console.error('Error updating API key:', error);
    return errorResponse('internal_error', 'Failed to update API key', 500);
  }
}

// DELETE /api/v1/marketplace/keys/[keyId] - Revoke API key
export async function DELETE(
  req: Request,
  { params }: { params: { keyId: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return errorResponse('unauthorized', 'Authentication required', 401);
    }

    const developer = await db.developerAccount.findUnique({
      where: { userId: user.id },
    });

    if (!developer) {
      return errorResponse('not_found', 'Developer account not found', 404);
    }

    const apiKey = await db.marketplaceAPIKey.findFirst({
      where: {
        id: params.keyId,
        developerId: developer.id,
      },
    });

    if (!apiKey) {
      return errorResponse('not_found', 'API key not found', 404);
    }

    await db.marketplaceAPIKey.update({
      where: { id: params.keyId },
      data: { isActive: false },
    });

    return successResponse({ success: true, message: 'API key revoked successfully' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return errorResponse('internal_error', 'Failed to revoke API key', 500);
  }
}
