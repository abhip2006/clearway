// app/api/v1/marketplace/apps/[appId]/route.ts
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-marketplace/utils';
import { currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';

// GET /api/v1/marketplace/apps/[appId] - Get app details
export async function GET(req: Request, { params }: { params: { appId: string } }) {
  try {
    const app = await db.marketplaceApp.findUnique({
      where: { id: params.appId },
      include: {
        developer: { select: { id: true, companyName: true, verified: true } },
        pricing: true,
        oauthClient: { select: { clientId: true, redirectUris: true, scopes: true } },
        reviews: { take: 5, orderBy: { createdAt: 'desc' } },
        _count: { select: { installations: true } },
      },
    });

    if (!app) {
      return errorResponse('not_found', 'App not found', 404);
    }

    return successResponse({
      id: app.id,
      name: app.name,
      slug: app.slug,
      description: app.description,
      longDescription: app.longDescription,
      category: app.category,
      icon: app.icon,
      status: app.status,
      version: app.version,
      rating: app.rating,
      reviewCount: app.reviewCount,
      installCount: app.installCount,
      features: app.features,
      permissions: app.permissions,
      documentationUrl: app.documentationUrl,
      supportUrl: app.supportUrl,
      publishedAt: app.publishedAt,
      developer: app.developer,
      pricing: app.pricing,
      oauthConfig: app.oauthClient ? {
        clientId: app.oauthClient.clientId,
        scopes: app.oauthClient.scopes,
      } : null,
      recentReviews: app.reviews,
    });
  } catch (error) {
    return errorResponse('internal_error', 'Failed to get app', 500);
  }
}

// PUT /api/v1/marketplace/apps/[appId] - Update app
export async function PUT(req: Request, { params }: { params: { appId: string } }) {
  try {
    const user = await currentUser();
    if (!user) return errorResponse('unauthorized', 'Authentication required', 401);

    const developer = await db.developerAccount.findUnique({ where: { userId: user.id } });
    if (!developer) return errorResponse('not_found', 'Developer account not found', 404);

    const app = await db.marketplaceApp.findFirst({
      where: { id: params.appId, developerId: developer.id },
    });
    if (!app) return errorResponse('not_found', 'App not found', 404);

    const body = await req.json();
    const updated = await db.marketplaceApp.update({
      where: { id: params.appId },
      data: {
        name: body.name,
        description: body.description,
        longDescription: body.longDescription,
        icon: body.icon,
        features: body.features,
        documentationUrl: body.documentationUrl,
        supportUrl: body.supportUrl,
      },
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse('internal_error', 'Failed to update app', 500);
  }
}

// DELETE /api/v1/marketplace/apps/[appId] - Delete app
export async function DELETE(req: Request, { params }: { params: { appId: string } }) {
  try {
    const user = await currentUser();
    if (!user) return errorResponse('unauthorized', 'Authentication required', 401);

    const developer = await db.developerAccount.findUnique({ where: { userId: user.id } });
    if (!developer) return errorResponse('not_found', 'Developer account not found', 404);

    const app = await db.marketplaceApp.findFirst({
      where: { id: params.appId, developerId: developer.id },
    });
    if (!app) return errorResponse('not_found', 'App not found', 404);

    await db.marketplaceApp.delete({ where: { id: params.appId } });

    return successResponse({ success: true, message: 'App deleted successfully' });
  } catch (error) {
    return errorResponse('internal_error', 'Failed to delete app', 500);
  }
}
