/**
 * Webhook Test Endpoint
 * POST /api/webhooks/marketplace/test
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { webhookDeliveryService } from '@/lib/integrations';

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
    const { webhookId } = body;

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    // Test the webhook
    const result = await webhookDeliveryService.testWebhook(webhookId, userId);

    return NextResponse.json({
      result,
      message: result.success
        ? 'Webhook test successful'
        : 'Webhook test failed',
    });
  } catch (error: any) {
    console.error('Error testing webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to test webhook' },
      { status: 500 }
    );
  }
}
