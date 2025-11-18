/**
 * Integration Services Exports
 * Centralized export for all integration services
 */

export { QuickBooksService, quickBooksService } from './quickbooks';
export { DocuSignService, docuSignService } from './docusign';
export {
  WebhookDeliveryService,
  webhookDeliveryService,
  triggerWebhook,
  type WebhookEvent,
} from './webhook-delivery';

/**
 * Integration event types
 */
export const WEBHOOK_EVENTS = {
  // Capital Call Events
  CAPITAL_CALL_CREATED: 'capital_call.created',
  CAPITAL_CALL_APPROVED: 'capital_call.approved',
  CAPITAL_CALL_REJECTED: 'capital_call.rejected',

  // Document Events
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_PROCESSED: 'document.processed',

  // Payment Events
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_FAILED: 'payment.failed',

  // Signature Events
  SIGNATURE_SENT: 'signature.sent',
  SIGNATURE_COMPLETED: 'signature.completed',
  SIGNATURE_DECLINED: 'signature.declined',

  // Test Event
  TEST_WEBHOOK: 'test.webhook',
} as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS];

/**
 * Integration providers
 */
export enum IntegrationProvider {
  QUICKBOOKS = 'QUICKBOOKS',
  XERO = 'XERO',
  NETSUITE = 'NETSUITE',
  DOCUSIGN = 'DOCUSIGN',
  HELLOSIGN = 'HELLOSIGN',
  ADOBE_SIGN = 'ADOBE_SIGN',
}

/**
 * Integration status
 */
export enum IntegrationStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  EXPIRED = 'EXPIRED',
}
