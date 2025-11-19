// lib/api-marketplace/webhook-delivery.ts
// Webhook delivery system with retry logic

import { db } from '@/lib/db';
import crypto from 'crypto';

export class WebhookDeliveryService {
  static async sendWebhook(
    webhookSubscriptionId: string,
    eventType: string,
    payload: any
  ): Promise<void> {
    const webhook = await db.marketplaceWebhookSubscription.findUnique({
      where: { id: webhookSubscriptionId },
    });

    if (!webhook || !webhook.isActive) {
      console.log(`Webhook ${webhookSubscriptionId} not found or inactive`);
      return;
    }

    // Check if webhook should receive this event
    if (!webhook.events.includes(eventType) && !webhook.events.includes('*')) {
      return;
    }

    // Create webhook event
    const event = await db.marketplaceWebhookEvent.create({
      data: {
        webhookSubscriptionId,
        eventType,
        payload,
      },
    });

    // Attempt delivery
    await this.deliverWebhook(event.id, webhook, payload);
  }

  static async deliverWebhook(
    eventId: string,
    webhook: any,
    payload: any,
    attempt: number = 1
  ): Promise<void> {
    try {
      const event = await db.marketplaceWebhookEvent.findUnique({
        where: { id: eventId },
      });

      if (!event) return;

      // Generate signature
      const signature = this.generateSignature(payload, webhook.secretHash);

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Clearway-Signature': signature,
        'X-Clearway-Event': event.eventType,
        'X-Clearway-Delivery': eventId,
        'X-Clearway-Attempt': attempt.toString(),
        ...((webhook.headers as Record<string, string>) || {}),
      };

      const startTime = Date.now();

      // Send webhook
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: eventId,
          type: event.eventType,
          timestamp: event.createdAt.toISOString(),
          data: payload,
          attempt,
        }),
      });

      const responseTime = Date.now() - startTime;
      const responseBody = await response.text();

      // Log delivery
      await db.marketplaceWebhookDeliveryLog.create({
        data: {
          webhookSubscriptionId: webhook.id,
          webhookEventId: eventId,
          attemptNumber: attempt,
          statusCode: response.status,
          responseTimeMs: responseTime,
          headersSent: headers,
          responseBody,
        },
      });

      // Update event status
      if (response.ok) {
        await db.marketplaceWebhookEvent.update({
          where: { id: eventId },
          data: {
            statusCode: response.status,
            response: responseBody,
            deliveredAt: new Date(),
          },
        });
      } else {
        // Schedule retry if not successful
        await this.scheduleRetry(eventId, webhook, payload, attempt);
      }
    } catch (error: any) {
      console.error('Webhook delivery error:', error);

      // Log failed delivery
      await db.marketplaceWebhookDeliveryLog.create({
        data: {
          webhookSubscriptionId: webhook.id,
          webhookEventId: eventId,
          attemptNumber: attempt,
          errorMessage: error.message,
        },
      });

      // Schedule retry
      await this.scheduleRetry(eventId, webhook, payload, attempt);
    }
  }

  static async scheduleRetry(
    eventId: string,
    webhook: any,
    payload: any,
    attempt: number
  ): Promise<void> {
    if (attempt >= webhook.maxRetries) {
      // Max retries reached, mark as failed
      await db.marketplaceWebhookEvent.update({
        where: { id: eventId },
        data: {
          attempt: webhook.maxRetries,
          response: 'Max retries exceeded',
        },
      });
      return;
    }

    // Calculate next retry delay using exponential backoff
    const delay =
      webhook.initialDelayMs * Math.pow(webhook.backoffMultiplier, attempt - 1);

    const nextRetryAt = new Date(Date.now() + delay);

    // Update event with next retry time
    await db.marketplaceWebhookEvent.update({
      where: { id: eventId },
      data: {
        attempt: attempt + 1,
        nextRetryAt,
      },
    });

    // In production, use a queue system like BullMQ or Inngest
    // For demo, we'll use setTimeout
    setTimeout(() => {
      this.deliverWebhook(eventId, webhook, payload, attempt + 1);
    }, delay);
  }

  static generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString);
    return `sha256=${hmac.digest('hex')}`;
  }

  static verifySignature(
    payload: any,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // Trigger webhook for specific events
  static async triggerEvent(
    eventType: string,
    data: any
  ): Promise<void> {
    // Find all webhooks subscribed to this event
    const webhooks = await db.marketplaceWebhookSubscription.findMany({
      where: {
        isActive: true,
        events: { has: eventType },
      },
    });

    // Send to all subscribed webhooks
    await Promise.all(
      webhooks.map((webhook) =>
        this.sendWebhook(webhook.id, eventType, data)
      )
    );
  }
}

// Example webhook events
export const WEBHOOK_EVENTS = {
  APP_CREATED: 'app.created',
  APP_UPDATED: 'app.updated',
  APP_DELETED: 'app.deleted',
  APP_PUBLISHED: 'app.published',
  APP_INSTALLED: 'app.installed',
  APP_UNINSTALLED: 'app.uninstalled',
  USER_SIGNUP: 'user.signup',
  USER_DELETED: 'user.deleted',
  KEY_CREATED: 'key.created',
  KEY_ROTATED: 'key.rotated',
  KEY_DELETED: 'key.deleted',
  QUOTA_EXCEEDED: 'quota.exceeded',
  BILLING_PAYMENT_FAILED: 'billing.payment_failed',
  BILLING_UPGRADED: 'billing.upgraded',
};
