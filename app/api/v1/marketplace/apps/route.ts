// app/api/v1/marketplace/apps/route.ts
// Marketplace app management endpoints

import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-marketplace/utils';
import { withAPIAuth } from '@/lib/api-marketplace/utils';
import { currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';

const CreateAppSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().min(1).max(500),
  longDescription: z.string().min(1),
  category: z.string(),
  icon: z.string().url().optional(),
  features: z.array(z.string()),
  permissions: z.array(z.string()),
  documentationUrl: z.string().url().optional(),
  supportUrl: z.string().url().optional(),
});

// GET /api/v1/marketplace/apps - List all marketplace apps
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const category = url.searchParams.get('category');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const sort = url.searchParams.get('sort') || 'publishedAt';

    const where: any = {};

    // Default to showing only ACTIVE apps for public listing
    if (!status) {
      where.status = 'ACTIVE';
    } else if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [apps, total] = await Promise.all([
      db.marketplaceApp.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: {
          [sort === 'rating' ? 'rating' : sort === 'installs' ? 'installCount' : 'publishedAt']: 'desc',
        },
        include: {
          developer: {
            select: {
              id: true,
              companyName: true,
              verified: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              installations: true,
            },
          },
        },
      }),
      db.marketplaceApp.count({ where }),
    ]);

    const formattedApps = apps.map((app) => ({
      id: app.id,
      name: app.name,
      slug: app.slug,
      description: app.description,
      category: app.category,
      icon: app.icon,
      rating: app.rating,
      reviewCount: app.reviewCount,
      installCount: app.installCount,
      version: app.version,
      publishedAt: app.publishedAt,
      developer: {
        id: app.developer.id,
        name: app.developer.companyName || 'Anonymous',
        verified: app.developer.verified,
      },
    }));

    return successResponse({
      apps: formattedApps,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error listing apps:', error);
    return errorResponse('internal_error', 'Failed to list apps', 500);
  }
}

// POST /api/v1/marketplace/apps - Submit new app to marketplace
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return errorResponse('unauthorized', 'Authentication required', 401);
    }

    const body = await req.json();
    const data = CreateAppSchema.parse(body);

    // Get or create developer account
    let developer = await db.developerAccount.findUnique({
      where: { userId: user.id },
    });

    if (!developer) {
      developer = await db.developerAccount.create({
        data: { userId: user.id },
      });
    }

    // Check if slug is unique
    const existing = await db.marketplaceApp.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      return errorResponse('validation_error', 'App slug already exists', 400, {
        field: 'slug',
        issue: 'already_exists',
      });
    }

    // Create app in DRAFT status
    const app = await db.marketplaceApp.create({
      data: {
        developerId: developer.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        longDescription: data.longDescription,
        category: data.category,
        icon: data.icon,
        features: data.features,
        permissions: data.permissions,
        documentationUrl: data.documentationUrl,
        supportUrl: data.supportUrl,
        status: 'DRAFT',
      },
    });

    // Update developer stats
    await db.developerAccount.update({
      where: { id: developer.id },
      data: { totalApps: { increment: 1 } },
    });

    return successResponse(
      {
        id: app.id,
        name: app.name,
        slug: app.slug,
        status: app.status,
        createdAt: app.createdAt,
        message: 'App created successfully. Submit for approval when ready.',
      },
      201
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse('validation_error', 'Invalid request data', 400, error.errors);
    }
    console.error('Error creating app:', error);
    return errorResponse('internal_error', 'Failed to create app', 500);
  }
}
