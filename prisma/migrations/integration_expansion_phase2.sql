-- Integration Expansion Phase 2 - Week 19-20
-- Generated: 2025-11-18
-- Agent: Integration Expansion Agent

-- ============================================
-- ACCOUNTING INTEGRATION TABLES
-- ============================================

-- Accounting Connections (QuickBooks, Xero, NetSuite)
CREATE TABLE IF NOT EXISTS "AccountingConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "realmId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccountingConnection_organizationId_provider_key"
    ON "AccountingConnection"("organizationId", "provider");
CREATE INDEX IF NOT EXISTS "AccountingConnection_organizationId_idx"
    ON "AccountingConnection"("organizationId");

-- Accounting Transactions (Journal Entries, Deposits)
CREATE TABLE IF NOT EXISTS "AccountingTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "capitalCallId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountingTransaction_connectionId_fkey"
        FOREIGN KEY ("connectionId")
        REFERENCES "AccountingConnection"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AccountingTransaction_capitalCallId_idx"
    ON "AccountingTransaction"("capitalCallId");
CREATE INDEX IF NOT EXISTS "AccountingTransaction_connectionId_idx"
    ON "AccountingTransaction"("connectionId");

-- ============================================
-- DOCUMENT SIGNATURE TABLES
-- ============================================

-- Signature Requests (DocuSign, HelloSign, Adobe Sign)
CREATE TABLE IF NOT EXISTS "SignatureRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "capitalCallId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL UNIQUE,
    "status" TEXT NOT NULL,
    "signers" TEXT[] NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SignatureRequest_capitalCallId_idx"
    ON "SignatureRequest"("capitalCallId");
CREATE INDEX IF NOT EXISTS "SignatureRequest_status_idx"
    ON "SignatureRequest"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "SignatureRequest_envelopeId_key"
    ON "SignatureRequest"("envelopeId");

-- ============================================
-- WEBHOOK MARKETPLACE TABLES
-- ============================================

-- Webhook Endpoints
CREATE TABLE IF NOT EXISTS "WebhookEndpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[] NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WebhookEndpoint_userId_idx"
    ON "WebhookEndpoint"("userId");
CREATE INDEX IF NOT EXISTS "WebhookEndpoint_enabled_idx"
    ON "WebhookEndpoint"("enabled");

-- Webhook Deliveries
CREATE TABLE IF NOT EXISTS "WebhookDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "webhookEndpointId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "statusCode" INTEGER,
    "error" TEXT,
    "payload" JSONB NOT NULL,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookDelivery_webhookEndpointId_fkey"
        FOREIGN KEY ("webhookEndpointId")
        REFERENCES "WebhookEndpoint"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "WebhookDelivery_webhookEndpointId_idx"
    ON "WebhookDelivery"("webhookEndpointId");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_deliveredAt_idx"
    ON "WebhookDelivery"("deliveredAt" DESC);
CREATE INDEX IF NOT EXISTS "WebhookDelivery_status_idx"
    ON "WebhookDelivery"("status");

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE "AccountingConnection" IS 'OAuth connections to accounting platforms (QuickBooks, Xero, NetSuite)';
COMMENT ON TABLE "AccountingTransaction" IS 'Transactions synced to accounting platforms';
COMMENT ON TABLE "SignatureRequest" IS 'E-signature envelope tracking (DocuSign, HelloSign, Adobe Sign)';
COMMENT ON TABLE "WebhookEndpoint" IS 'User-defined webhook endpoints for event notifications';
COMMENT ON TABLE "WebhookDelivery" IS 'Webhook delivery attempts and results';
