/**
 * Integration Configuration Utilities
 * Helpers for managing integration settings and connections
 */

import { db } from '@/lib/db';

export interface QuickBooksConfig {
  capitalCallsAccountId: string;
  investorEquityAccountId: string;
  bankAccountId: string;
  revenueAccountId?: string;
  expenseAccountId?: string;
}

export interface IntegrationHealth {
  provider: string;
  status: 'healthy' | 'warning' | 'error';
  connected: boolean;
  lastSync?: Date;
  expiresAt?: Date;
  message?: string;
}

/**
 * Get integration status for an organization
 */
export async function getIntegrationStatus(organizationId: string) {
  const integrations = await db.accountingConnection.findMany({
    where: { organizationId },
  });

  return integrations.map(integration => {
    const expiresAt = new Date(integration.expiresAt);
    const now = new Date();
    const isExpiringSoon = expiresAt.getTime() - now.getTime() < 24 * 60 * 60 * 1000; // 24 hours

    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    let message: string | undefined;

    if (expiresAt < now) {
      status = 'error';
      message = 'Access token expired';
    } else if (isExpiringSoon) {
      status = 'warning';
      message = 'Access token expiring soon';
    }

    return {
      provider: integration.provider,
      status,
      connected: true,
      lastSync: integration.updatedAt,
      expiresAt: integration.expiresAt,
      message,
    };
  });
}

/**
 * Check if QuickBooks is configured for an organization
 */
export async function isQuickBooksConfigured(organizationId: string): Promise<boolean> {
  const connection = await db.accountingConnection.findUnique({
    where: {
      organizationId_provider: {
        organizationId,
        provider: 'QUICKBOOKS',
      },
    },
  });

  return connection !== null;
}

/**
 * Get QuickBooks configuration
 */
export async function getQuickBooksConfig(organizationId: string): Promise<QuickBooksConfig | null> {
  const connection = await db.accountingConnection.findUnique({
    where: {
      organizationId_provider: {
        organizationId,
        provider: 'QUICKBOOKS',
      },
    },
  });

  if (!connection) {
    return null;
  }

  return connection.config as QuickBooksConfig;
}

/**
 * Update QuickBooks account mappings
 */
export async function updateQuickBooksConfig(
  organizationId: string,
  config: QuickBooksConfig
): Promise<void> {
  await db.accountingConnection.update({
    where: {
      organizationId_provider: {
        organizationId,
        provider: 'QUICKBOOKS',
      },
    },
    data: {
      config,
    },
  });
}

/**
 * Get signature request statistics
 */
export async function getSignatureStats(organizationId: string) {
  // Get all capital calls for the organization
  const capitalCalls = await db.capitalCall.findMany({
    where: { organizationId },
    select: { id: true },
  });

  const capitalCallIds = capitalCalls.map(cc => cc.id);

  const signatureRequests = await db.signatureRequest.findMany({
    where: {
      capitalCallId: {
        in: capitalCallIds,
      },
    },
  });

  const total = signatureRequests.length;
  const sent = signatureRequests.filter(sr => sr.status === 'SENT').length;
  const completed = signatureRequests.filter(sr => sr.status === 'COMPLETED').length;
  const declined = signatureRequests.filter(sr => sr.status === 'DECLINED').length;

  return {
    total,
    sent,
    completed,
    declined,
    completionRate: total > 0 ? (completed / total) * 100 : 0,
  };
}

/**
 * Get webhook statistics
 */
export async function getWebhookStats(userId: string) {
  const endpoints = await db.webhookEndpoint.findMany({
    where: { userId },
    include: {
      deliveries: {
        take: 100,
        orderBy: { deliveredAt: 'desc' },
      },
    },
  });

  const totalEndpoints = endpoints.length;
  const activeEndpoints = endpoints.filter(e => e.enabled).length;

  const allDeliveries = endpoints.flatMap(e => e.deliveries);
  const totalDeliveries = allDeliveries.length;
  const successfulDeliveries = allDeliveries.filter(d => d.status === 'SUCCESS').length;
  const failedDeliveries = allDeliveries.filter(d => d.status === 'FAILED').length;

  return {
    endpoints: {
      total: totalEndpoints,
      active: activeEndpoints,
      inactive: totalEndpoints - activeEndpoints,
    },
    deliveries: {
      total: totalDeliveries,
      successful: successfulDeliveries,
      failed: failedDeliveries,
      successRate: totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0,
    },
  };
}

/**
 * Validate integration configuration
 */
export function validateQuickBooksConfig(config: any): config is QuickBooksConfig {
  return (
    typeof config === 'object' &&
    typeof config.capitalCallsAccountId === 'string' &&
    typeof config.investorEquityAccountId === 'string' &&
    typeof config.bankAccountId === 'string'
  );
}

/**
 * Get all active integrations for an organization
 */
export async function getActiveIntegrations(organizationId: string) {
  const accounting = await db.accountingConnection.findMany({
    where: { organizationId },
  });

  const capitalCalls = await db.capitalCall.findMany({
    where: { organizationId },
    select: { id: true },
  });

  const signatures = await db.signatureRequest.findMany({
    where: {
      capitalCallId: {
        in: capitalCalls.map(cc => cc.id),
      },
    },
    distinct: ['provider'],
    select: { provider: true },
  });

  return {
    accounting: accounting.map(a => a.provider),
    signatures: signatures.map(s => s.provider),
  };
}

/**
 * Environment configuration check
 */
export function checkIntegrationEnvVars() {
  const required = {
    quickbooks: [
      'QUICKBOOKS_CLIENT_ID',
      'QUICKBOOKS_CLIENT_SECRET',
    ],
    docusign: [
      'DOCUSIGN_INTEGRATION_KEY',
      'DOCUSIGN_USER_ID',
      'DOCUSIGN_ACCOUNT_ID',
    ],
  };

  const status: Record<string, boolean> = {};

  status.quickbooks = required.quickbooks.every(key => !!process.env[key]);
  status.docusign = required.docusign.every(key => !!process.env[key]);

  return status;
}
