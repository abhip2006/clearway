-- Phase 2 Complete Schema Migration
-- Generated: 2025-11-18
-- Database Migration Agent
--
-- This migration creates all remaining Phase 2 tables not covered by
-- previous migrations (integration_expansion_phase2.sql)
--
-- IMPORTANT: Run this migration AFTER integration_expansion_phase2.sql

-- ============================================
-- PAYMENT PROCESSING TABLES
-- ============================================

-- Payment records for capital calls
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "capitalCallId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reference" TEXT,
    "swiftMessage" JSONB,
    "stripePaymentIntentId" TEXT,
    "bankStatementId" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "reconciledBy" TEXT,
    "reconciliationNotes" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_capitalCallId_fkey"
        FOREIGN KEY ("capitalCallId")
        REFERENCES "CapitalCall"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Payment_capitalCallId_idx"
    ON "Payment"("capitalCallId");
CREATE INDEX IF NOT EXISTS "Payment_userId_idx"
    ON "Payment"("userId");
CREATE INDEX IF NOT EXISTS "Payment_status_idx"
    ON "Payment"("status");
CREATE INDEX IF NOT EXISTS "Payment_paidAt_idx"
    ON "Payment"("paidAt" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_stripePaymentIntentId_key"
    ON "Payment"("stripePaymentIntentId")
    WHERE "stripePaymentIntentId" IS NOT NULL;

-- Bank accounts for Plaid integration
CREATE TABLE IF NOT EXISTS "BankAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "plaidAccessToken" TEXT NOT NULL,
    "plaidAccountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountMask" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankAccount_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "BankAccount_userId_idx"
    ON "BankAccount"("userId");

-- Bank statement reconciliation
CREATE TABLE IF NOT EXISTS "StatementReconciliation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bankAccountId" TEXT NOT NULL,
    "statementUrl" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalTransactions" INTEGER NOT NULL,
    "matchedCount" INTEGER NOT NULL,
    "unmatchedCount" INTEGER NOT NULL,
    "discrepancies" JSONB,
    "reconciledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "StatementReconciliation_bankAccountId_idx"
    ON "StatementReconciliation"("bankAccountId");
CREATE INDEX IF NOT EXISTS "StatementReconciliation_reconciledAt_idx"
    ON "StatementReconciliation"("reconciledAt" DESC);

-- ============================================
-- FUND ADMINISTRATOR TABLES
-- ============================================

-- Fund administrator registry
CREATE TABLE IF NOT EXISTS "FundAdministrator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "apiKey" TEXT NOT NULL UNIQUE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contactEmail" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "FundAdministrator_apiKey_idx"
    ON "FundAdministrator"("apiKey");
CREATE INDEX IF NOT EXISTS "FundAdministrator_slug_idx"
    ON "FundAdministrator"("slug");

-- Organization connections to fund administrators
CREATE TABLE IF NOT EXISTS "FundAdminConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "administrator" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "credentials" JSONB NOT NULL,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FundAdminConnection_organizationId_fkey"
        FOREIGN KEY ("organizationId")
        REFERENCES "Organization"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "FundAdminConnection_administrator_accountId_key"
    ON "FundAdminConnection"("administrator", "accountId");
CREATE INDEX IF NOT EXISTS "FundAdminConnection_organizationId_idx"
    ON "FundAdminConnection"("organizationId");

-- Investor mappings between external systems and Clearway users
CREATE TABLE IF NOT EXISTS "InvestorMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fundAdministrator" TEXT NOT NULL,
    "externalInvestorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "investorName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "commitment" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvestorMapping_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "InvestorMapping_fundAdministrator_externalInvestorId_key"
    ON "InvestorMapping"("fundAdministrator", "externalInvestorId");
CREATE INDEX IF NOT EXISTS "InvestorMapping_userId_idx"
    ON "InvestorMapping"("userId");

-- Fund code mappings
CREATE TABLE IF NOT EXISTS "FundMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fundAdministrator" TEXT NOT NULL,
    "externalFundCode" TEXT NOT NULL,
    "fundName" TEXT NOT NULL,
    "fundType" TEXT,
    "vintage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "FundMapping_fundAdministrator_externalFundCode_key"
    ON "FundMapping"("fundAdministrator", "externalFundCode");

-- Fund admin sync logs
CREATE TABLE IF NOT EXISTS "FundAdminSync" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "administrator" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "totalRecords" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "failureCount" INTEGER NOT NULL,
    "errors" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "FundAdminSync_administrator_accountId_idx"
    ON "FundAdminSync"("administrator", "accountId");
CREATE INDEX IF NOT EXISTS "FundAdminSync_syncedAt_idx"
    ON "FundAdminSync"("syncedAt" DESC);

-- Unmapped investors requiring manual mapping
CREATE TABLE IF NOT EXISTS "UnmappedInvestor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fundAdministrator" TEXT NOT NULL,
    "externalInvestorId" TEXT NOT NULL,
    "investorName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fundId" TEXT,
    "needsMapping" BOOLEAN NOT NULL DEFAULT true,
    "mappedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "UnmappedInvestor_fundAdministrator_needsMapping_idx"
    ON "UnmappedInvestor"("fundAdministrator", "needsMapping");

-- Webhook logs for incoming fund admin webhooks
CREATE TABLE IF NOT EXISTS "WebhookLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT NOT NULL UNIQUE,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WebhookLog_source_eventType_idx"
    ON "WebhookLog"("source", "eventType");
CREATE INDEX IF NOT EXISTS "WebhookLog_processedAt_idx"
    ON "WebhookLog"("processedAt" DESC);

-- ============================================
-- SECURITY & COMPLIANCE TABLES
-- ============================================

-- Comprehensive audit logging
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "geolocation" JSONB,
    "deviceFingerprint" TEXT,
    "metadata" JSONB,
    "securityLevel" TEXT NOT NULL DEFAULT 'LOW',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "AuditLog_userId_timestamp_idx"
    ON "AuditLog"("userId", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "AuditLog_action_timestamp_idx"
    ON "AuditLog"("action", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "AuditLog_securityLevel_timestamp_idx"
    ON "AuditLog"("securityLevel", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx"
    ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx"
    ON "AuditLog"("timestamp" DESC);

-- Legal holds for compliance
CREATE TABLE IF NOT EXISTS "LegalHold" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "caseNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "LegalHold_userId_status_idx"
    ON "LegalHold"("userId", "status");
CREATE INDEX IF NOT EXISTS "LegalHold_status_idx"
    ON "LegalHold"("status");

-- Data processing agreements (GDPR compliance)
CREATE TABLE IF NOT EXISTS "DataProcessingAgreement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "processorName" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "dataCategories" TEXT[] NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "agreementUrl" TEXT,
    "contactEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE'
);

CREATE INDEX IF NOT EXISTS "DataProcessingAgreement_organizationId_idx"
    ON "DataProcessingAgreement"("organizationId");
CREATE INDEX IF NOT EXISTS "DataProcessingAgreement_status_idx"
    ON "DataProcessingAgreement"("status");

-- ============================================
-- MULTI-TENANT & ENTERPRISE TABLES
-- ============================================

-- Organization members (many-to-many)
CREATE TABLE IF NOT EXISTS "OrganizationMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" TEXT[] NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationMember_organizationId_fkey"
        FOREIGN KEY ("organizationId")
        REFERENCES "Organization"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrganizationMember_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationMember_organizationId_userId_key"
    ON "OrganizationMember"("organizationId", "userId");
CREATE INDEX IF NOT EXISTS "OrganizationMember_organizationId_idx"
    ON "OrganizationMember"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationMember_userId_idx"
    ON "OrganizationMember"("userId");

-- Custom roles per organization
CREATE TABLE IF NOT EXISTS "OrganizationRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT[] NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationRole_organizationId_fkey"
        FOREIGN KEY ("organizationId")
        REFERENCES "Organization"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationRole_organizationId_name_key"
    ON "OrganizationRole"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "OrganizationRole_organizationId_idx"
    ON "OrganizationRole"("organizationId");

-- Organization invitations
CREATE TABLE IF NOT EXISTS "OrganizationInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationInvite_organizationId_fkey"
        FOREIGN KEY ("organizationId")
        REFERENCES "Organization"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OrganizationInvite_organizationId_idx"
    ON "OrganizationInvite"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationInvite_email_idx"
    ON "OrganizationInvite"("email");
CREATE INDEX IF NOT EXISTS "OrganizationInvite_token_idx"
    ON "OrganizationInvite"("token");

-- SSO connections for enterprise authentication
CREATE TABLE IF NOT EXISTS "SSOConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SSOConnection_organizationId_fkey"
        FOREIGN KEY ("organizationId")
        REFERENCES "Organization"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SSOConnection_organizationId_idx"
    ON "SSOConnection"("organizationId");
CREATE INDEX IF NOT EXISTS "SSOConnection_provider_idx"
    ON "SSOConnection"("provider");

-- ============================================
-- ANALYTICS & REPORTING TABLES
-- ============================================

-- Scheduled reports configuration
CREATE TABLE IF NOT EXISTS "ScheduledReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "schedule" TEXT NOT NULL,
    "recipients" TEXT[] NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScheduledReport_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ScheduledReport_userId_idx"
    ON "ScheduledReport"("userId");
CREATE INDEX IF NOT EXISTS "ScheduledReport_active_idx"
    ON "ScheduledReport"("active");

-- Report execution history
CREATE TABLE IF NOT EXISTS "ReportExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduledReportId" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipientCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "error" TEXT,
    CONSTRAINT "ReportExecution_scheduledReportId_fkey"
        FOREIGN KEY ("scheduledReportId")
        REFERENCES "ScheduledReport"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ReportExecution_scheduledReportId_idx"
    ON "ReportExecution"("scheduledReportId");
CREATE INDEX IF NOT EXISTS "ReportExecution_executedAt_idx"
    ON "ReportExecution"("executedAt" DESC);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE "Payment" IS 'Payment records for capital calls with reconciliation tracking';
COMMENT ON TABLE "BankAccount" IS 'Connected bank accounts via Plaid for payment processing';
COMMENT ON TABLE "StatementReconciliation" IS 'Bank statement reconciliation results';
COMMENT ON TABLE "FundAdministrator" IS 'Registry of fund administrator platforms';
COMMENT ON TABLE "FundAdminConnection" IS 'Organization connections to fund admin platforms';
COMMENT ON TABLE "InvestorMapping" IS 'Mapping between external investor IDs and Clearway users';
COMMENT ON TABLE "FundMapping" IS 'Mapping between external fund codes and fund names';
COMMENT ON TABLE "FundAdminSync" IS 'Sync operation logs for fund administrator integrations';
COMMENT ON TABLE "UnmappedInvestor" IS 'Investors from fund admins requiring manual mapping';
COMMENT ON TABLE "WebhookLog" IS 'Incoming webhook events from fund administrators';
COMMENT ON TABLE "AuditLog" IS 'Comprehensive audit trail for security and compliance';
COMMENT ON TABLE "LegalHold" IS 'Legal holds preventing data deletion for compliance';
COMMENT ON TABLE "DataProcessingAgreement" IS 'GDPR data processing agreements with third parties';
COMMENT ON TABLE "OrganizationMember" IS 'Organization membership with role-based access control';
COMMENT ON TABLE "OrganizationRole" IS 'Custom roles and permissions per organization';
COMMENT ON TABLE "OrganizationInvite" IS 'Pending organization invitations';
COMMENT ON TABLE "SSOConnection" IS 'Enterprise SSO connections (SAML, OIDC)';
COMMENT ON TABLE "ScheduledReport" IS 'Scheduled report configurations';
COMMENT ON TABLE "ReportExecution" IS 'Report execution history and status';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Phase 2 Complete Schema Migration: SUCCESS';
    RAISE NOTICE 'Created 19 tables with indexes and foreign keys';
    RAISE NOTICE 'Schema version: 2.0.0';
END $$;
