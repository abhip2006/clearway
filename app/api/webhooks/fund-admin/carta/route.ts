/**
 * Carta Fund Admin Webhook Handler
 * Task FA-005: HMAC verification, event routing, real-time updates
 */

import { headers } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { inngest } from '@/lib/inngest';
import { CartaWebhookEventSchema } from '@/lib/fund-admin/types';

/**
 * POST handler for Carta webhooks
 * Verifies signature and routes events to appropriate handlers
 */
export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.CARTA_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('CARTA_WEBHOOK_SECRET is not configured');
      return new Response('Webhook configuration error', { status: 500 });
    }

    // Get headers
    const headersList = await headers();
    const signature = headersList.get('carta-signature');
    const timestamp = headersList.get('carta-timestamp');

    if (!signature || !timestamp) {
      return new Response('Missing webhook headers', { status: 401 });
    }

    // Get request body
    const body = await req.text();

    // Verify webhook signature (HMAC SHA-256)
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('Invalid Carta webhook signature');
      return new Response('Invalid signature', { status: 401 });
    }

    // Prevent replay attacks (timestamp must be within 5 minutes)
    const requestTime = parseInt(timestamp);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(currentTime - requestTime);

    if (timeDiff > 300) {
      // 5 minutes = 300 seconds
      console.warn(`Carta webhook timestamp too old: ${timeDiff}s`);
      return new Response('Request expired', { status: 401 });
    }

    // Parse and validate event
    const rawEvent = JSON.parse(body);
    const event = CartaWebhookEventSchema.parse(rawEvent);

    // Check for duplicate event
    const existingLog = await db.webhookLog.findUnique({
      where: { eventId: event.id },
    });

    if (existingLog) {
      console.log(`Duplicate Carta webhook event ${event.id}, skipping`);
      return new Response('Event already processed', { status: 200 });
    }

    // Log webhook receipt
    await db.webhookLog.create({
      data: {
        source: 'CARTA',
        eventType: event.type,
        eventId: event.id,
        payload: event,
        processedAt: new Date(),
      },
    });

    // Route event to appropriate handler via Inngest
    await routeEvent(event);

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing Carta webhook:', error);

    // Log error but still return 200 to prevent webhook retries
    // (We want to handle errors internally, not via Carta retries)
    return new Response('Error processing webhook', { status: 500 });
  }
}

/**
 * Route webhook event to appropriate Inngest handler
 */
async function routeEvent(event: {
  id: string;
  type: string;
  data: Record<string, unknown>;
  created_at: string;
}): Promise<void> {
  switch (event.type) {
    case 'capital_call.created':
      await inngest.send({
        name: 'fund-admin/capital-call.created',
        data: {
          administrator: 'CARTA',
          capitalCallId: event.data.id as string,
          fundId: event.data.fund_id as string,
          eventData: event.data,
        },
      });
      break;

    case 'capital_call.updated':
      await inngest.send({
        name: 'fund-admin/capital-call.updated',
        data: {
          administrator: 'CARTA',
          capitalCallId: event.data.id as string,
          changes: event.data.changes,
          eventData: event.data,
        },
      });
      break;

    case 'capital_call.cancelled':
      await inngest.send({
        name: 'fund-admin/capital-call.cancelled',
        data: {
          administrator: 'CARTA',
          capitalCallId: event.data.id as string,
          eventData: event.data,
        },
      });
      break;

    case 'investor.created':
      await inngest.send({
        name: 'fund-admin/investor.created',
        data: {
          administrator: 'CARTA',
          investorId: event.data.id as string,
          fundId: event.data.fund_id as string,
          eventData: event.data,
        },
      });
      break;

    case 'investor.updated':
      await inngest.send({
        name: 'fund-admin/investor.updated',
        data: {
          administrator: 'CARTA',
          investorId: event.data.id as string,
          changes: event.data.changes,
          eventData: event.data,
        },
      });
      break;

    case 'distribution.created':
      await inngest.send({
        name: 'fund-admin/distribution.created',
        data: {
          administrator: 'CARTA',
          distributionId: event.data.id as string,
          fundId: event.data.fund_id as string,
          eventData: event.data,
        },
      });
      break;

    default:
      console.warn(`Unknown Carta webhook event type: ${event.type}`);
      await inngest.send({
        name: 'fund-admin/unknown-event',
        data: {
          administrator: 'CARTA',
          eventType: event.type,
          eventData: event.data,
        },
      });
  }
}

/**
 * GET handler for webhook verification (Carta webhook setup)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('challenge');

  if (challenge) {
    // Carta webhook verification
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return new Response('Carta webhook endpoint', { status: 200 });
}
