/**
 * Webhook Marketplace API
 * Task INT-EXP-003: Webhook Marketplace
 *
 * Features:
 * - Create/manage webhook endpoints
 * - Subscribe to events
 * - View delivery history
 * - Test webhook endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

/**
 * GET /api/webhooks/marketplace
 * List all webhook endpoints for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const webhooks = await db.webhookEndpoint.findMany({
      where: { userId },
      include: {
        deliveries: {
          take: 10,
          orderBy: { deliveredAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      webhooks,
      count: webhooks.length,
    });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhooks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webhooks/marketplace
 * Create a new webhook endpoint
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { url, events, enabled = true } = body;

    // Validate URL
    if (!url || !url.startsWith('http')) {
      return NextResponse.json(
        { error: 'Valid URL is required' },
        { status: 400 }
      );
    }

    // Validate events
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'At least one event type is required' },
        { status: 400 }
      );
    }

    // Validate event types
    const validEvents = [
      'capital_call.created',
      'capital_call.approved',
      'capital_call.rejected',
      'document.uploaded',
      'document.processed',
      'payment.received',
      'payment.failed',
      'signature.sent',
      'signature.completed',
      'signature.declined',
    ];

    const invalidEvents = events.filter(e => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid event types: ${invalidEvents.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate signing secret
    const secret = crypto.randomBytes(32).toString('hex');

    // Create webhook endpoint
    const webhook = await db.webhookEndpoint.create({
      data: {
        userId,
        url,
        events,
        secret,
        enabled,
      },
    });

    return NextResponse.json({
      webhook,
      message: 'Webhook endpoint created successfully',
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/webhooks/marketplace?id=xxx
 * Delete a webhook endpoint
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const webhook = await db.webhookEndpoint.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || webhook.userId !== userId) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Delete webhook (cascade will delete deliveries)
    await db.webhookEndpoint.delete({
      where: { id: webhookId },
    });

    return NextResponse.json({
      message: 'Webhook endpoint deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/webhooks/marketplace?id=xxx
 * Update a webhook endpoint (enable/disable, update events)
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { enabled, events } = body;

    // Verify ownership
    const webhook = await db.webhookEndpoint.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || webhook.userId !== userId) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Update webhook
    const updated = await db.webhookEndpoint.update({
      where: { id: webhookId },
      data: {
        enabled: enabled !== undefined ? enabled : webhook.enabled,
        events: events || webhook.events,
      },
    });

    return NextResponse.json({
      webhook: updated,
      message: 'Webhook endpoint updated successfully',
    });
  } catch (error) {
    console.error('Error updating webhook:', error);
    return NextResponse.json(
      { error: 'Failed to update webhook' },
      { status: 500 }
    );
  }
}
