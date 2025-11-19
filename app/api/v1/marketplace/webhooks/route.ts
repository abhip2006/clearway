// app/api/v1/marketplace/webhooks/route.ts
import { db } from '@/lib/db';
import { successResponse, errorResponse, hashAPIKey } from '@/lib/api-marketplace/utils';
import { currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';
import crypto from 'crypto';

const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  headers: z.record(z.string()).optional(),
});

// GET /api/v1/marketplace/webhooks - List webhook subscriptions
export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return errorResponse('unauthorized', 'Authentication required', 401);

    const developer = await db.developerAccount.findUnique({ where: { userId: user.id } });
    if (!developer) {
      return successResponse([]);
    }

    const webhooks = await db.marketplaceWebhookSubscription.findMany({
      where: { developerId: developer.id },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(webhooks.map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      isActive: w.isActive,
      createdAt: w.createdAt,
    })));
  } catch (error) {
    return errorResponse('internal_error', 'Failed to list webhooks', 500);
  }
}

// POST /api/v1/marketplace/webhooks - Create webhook subscription
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return errorResponse('unauthorized', 'Authentication required', 401);

    const body = await req.json();
    const data = CreateWebhookSchema.parse(body);

    let developer = await db.developerAccount.findUnique({ where: { userId: user.id } });
    if (!developer) {
      developer = await db.developerAccount.create({ data: { userId: user.id } });
    }

    const secret = crypto.randomBytes(32).toString('base64');
    const secretHash = hashAPIKey(secret);

    const webhook = await db.marketplaceWebhookSubscription.create({
      data: {
        developerId: developer.id,
        url: data.url,
        events: data.events,
        secretHash,
        headers: data.headers || {},
      },
    });

    return successResponse(
      {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        secret, // Only shown once!
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
        warning: 'Save your webhook secret securely. Use it to verify webhook signatures.',
      },
      201
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse('validation_error', 'Invalid request data', 400, error.errors);
    }
    return errorResponse('internal_error', 'Failed to create webhook', 500);
  }
}
