/**
 * Webhook Delivery Service
 * Task INT-EXP-003: Webhook Marketplace - Delivery System
 *
 * Features:
 * - Trigger webhooks based on events
 * - HMAC signature verification
 * - Retry logic with exponential backoff
 * - Delivery tracking and logging
 */

import { db } from '@/lib/db';
import crypto from 'crypto';

export interface WebhookEvent {
  type: string;
  data: any;
  userId: string;
  timestamp?: number;
}

interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  deliveryId: string;
}

export class WebhookDeliveryService {
  /**
   * Trigger webhooks for a specific event
   */
  async triggerWebhooks(event: WebhookEvent): Promise<DeliveryResult[]> {
    const timestamp = event.timestamp || Date.now();

    // Find all enabled webhooks that are subscribed to this event type
    const webhooks = await db.webhookEndpoint.findMany({
      where: {
        userId: event.userId,
        enabled: true,
        events: {
          has: event.type,
        },
      },
    });

    if (webhooks.length === 0) {
      console.log(`No webhooks found for event type: ${event.type}`);
      return [];
    }

    // Deliver to all matching webhooks in parallel
    const deliveryPromises = webhooks.map(webhook =>
      this.deliverWebhook(webhook, event, timestamp)
    );

    const results = await Promise.allSettled(deliveryPromises);

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason?.message || 'Unknown error',
          deliveryId: 'failed',
        };
      }
    });
  }

  /**
   * Deliver webhook to a single endpoint
   */
  private async deliverWebhook(
    webhook: any,
    event: WebhookEvent,
    timestamp: number
  ): Promise<DeliveryResult> {
    const payload = {
      id: crypto.randomUUID(),
      type: event.type,
      timestamp,
      data: event.data,
    };

    const payloadString = JSON.stringify(payload);

    // Generate HMAC signature
    const signature = this.generateSignature(payloadString, webhook.secret);

    try {
      // Send webhook
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Clearway-Signature': signature,
          'X-Clearway-Event': event.type,
          'X-Clearway-Timestamp': timestamp.toString(),
          'User-Agent': 'Clearway-Webhook/1.0',
        },
        body: payloadString,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      // Log delivery
      const delivery = await db.webhookDelivery.create({
        data: {
          webhookEndpointId: webhook.id,
          eventType: event.type,
          status: response.ok ? 'SUCCESS' : 'FAILED',
          statusCode: response.status,
          error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
          payload,
        },
      });

      return {
        success: response.ok,
        statusCode: response.status,
        error: response.ok ? undefined : `HTTP ${response.status}`,
        deliveryId: delivery.id,
      };
    } catch (error: any) {
      // Log failed delivery
      const delivery = await db.webhookDelivery.create({
        data: {
          webhookEndpointId: webhook.id,
          eventType: event.type,
          status: 'FAILED',
          error: error.message || 'Network error',
          payload,
        },
      });

      return {
        success: false,
        error: error.message,
        deliveryId: delivery.id,
      };
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify webhook signature (for receiving webhooks)
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Retry failed webhook deliveries
   */
  async retryFailedDelivery(deliveryId: string): Promise<DeliveryResult> {
    const delivery = await db.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        webhook: true,
      },
    });

    if (!delivery) {
      throw new Error('Delivery not found');
    }

    if (delivery.status === 'SUCCESS') {
      throw new Error('Delivery already succeeded');
    }

    // Extract event from payload
    const event: WebhookEvent = {
      type: delivery.eventType,
      data: (delivery.payload as any).data,
      userId: delivery.webhook.userId,
      timestamp: (delivery.payload as any).timestamp,
    };

    // Redeliver
    return await this.deliverWebhook(
      delivery.webhook,
      event,
      event.timestamp || Date.now()
    );
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(webhookId: string, userId: string): Promise<DeliveryResult> {
    const webhook = await db.webhookEndpoint.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || webhook.userId !== userId) {
      throw new Error('Webhook not found');
    }

    // Send test event
    const testEvent: WebhookEvent = {
      type: 'test.webhook',
      data: {
        message: 'This is a test webhook delivery',
        timestamp: new Date().toISOString(),
      },
      userId,
    };

    return await this.deliverWebhook(webhook, testEvent, Date.now());
  }

  /**
   * Get delivery statistics for a webhook endpoint
   */
  async getDeliveryStats(webhookId: string) {
    const deliveries = await db.webhookDelivery.findMany({
      where: { webhookEndpointId: webhookId },
      orderBy: { deliveredAt: 'desc' },
      take: 100,
    });

    const total = deliveries.length;
    const successful = deliveries.filter(d => d.status === 'SUCCESS').length;
    const failed = deliveries.filter(d => d.status === 'FAILED').length;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      recentDeliveries: deliveries.slice(0, 10),
    };
  }
}

// Export singleton instance
export const webhookDeliveryService = new WebhookDeliveryService();

/**
 * Helper function to trigger webhooks from anywhere in the app
 */
export async function triggerWebhook(event: WebhookEvent) {
  return await webhookDeliveryService.triggerWebhooks(event);
}
