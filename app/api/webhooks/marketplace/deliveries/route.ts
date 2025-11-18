/**
 * Webhook Deliveries Endpoint
 * GET /api/webhooks/marketplace/deliveries?webhookId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { webhookDeliveryService } from '@/lib/integrations';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const webhookId = searchParams.get('webhookId');

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

    // Get delivery statistics and recent deliveries
    const stats = await webhookDeliveryService.getDeliveryStats(webhookId);

    return NextResponse.json({
      stats,
    });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deliveries' },
      { status: 500 }
    );
  }
}
