# Database Migration Status

**Last Updated:** 2025-11-18
**Schema Version:** 2.0.0
**Database Migration Agent**

## Overview

This document tracks all database migrations for the Clearway MVP Phase 2 implementation. All Phase 2 database schema changes have been prepared and are ready for deployment.

---

## Migration Files

### 1. `integration_expansion_phase2.sql`
**Status:** ✅ Created
**Date Created:** 2025-11-18
**Applied:** ⏳ Pending

**Purpose:** Core Phase 2 integration tables for accounting, e-signatures, and webhooks

**Tables Created:**
- `AccountingConnection` - OAuth connections to accounting platforms
- `AccountingTransaction` - Transactions synced to accounting platforms
- `SignatureRequest` - E-signature envelope tracking
- `WebhookEndpoint` - User-defined webhook endpoints
- `WebhookDelivery` - Webhook delivery attempts and results

**Breaking Changes:** None

---

### 2. `phase2_complete_schema.sql`
**Status:** ✅ Created
**Date Created:** 2025-11-18
**Applied:** ⏳ Pending

**Purpose:** Complete Phase 2 schema with all remaining tables

**Tables Created:**

#### Payment Processing (5 tables)
- `Payment` - Payment records for capital calls with reconciliation
- `BankAccount` - Connected bank accounts via Plaid
- `StatementReconciliation` - Bank statement reconciliation results

#### Fund Administrator Integration (8 tables)
- `FundAdministrator` - Registry of fund administrator platforms
- `FundAdminConnection` - Organization connections to fund admins
- `InvestorMapping` - Mapping between external investors and users
- `FundMapping` - Mapping between external fund codes and names
- `FundAdminSync` - Sync operation logs
- `UnmappedInvestor` - Investors requiring manual mapping
- `WebhookLog` - Incoming webhook events from fund admins

#### Security & Compliance (3 tables)
- `AuditLog` - Comprehensive audit trail
- `LegalHold` - Legal holds for compliance
- `DataProcessingAgreement` - GDPR data processing agreements

#### Multi-Tenant & Enterprise (4 tables)
- `OrganizationMember` - Organization membership with RBAC
- `OrganizationRole` - Custom roles per organization
- `OrganizationInvite` - Pending invitations
- `SSOConnection` - Enterprise SSO connections

#### Analytics & Reporting (2 tables)
- `ScheduledReport` - Scheduled report configurations
- `ReportExecution` - Report execution history

**Total:** 19 new tables

**Breaking Changes:** None - All new tables, backward compatible

---

### 3. `add_materialized_views.sql`
**Status:** ✅ Created
**Date Created:** 2025-11-18
**Applied:** ⏳ Pending

**Purpose:** Performance optimization with materialized views

**Objects Created:**
- `monthly_call_summary` - Materialized view for monthly analytics
- `fund_performance_summary` - Materialized view for fund metrics
- Multiple composite indexes on base tables

**Breaking Changes:** None

**Refresh Schedule:** Hourly (requires cron job setup)

---

## Migration Order

**IMPORTANT:** Migrations must be applied in this exact order:

1. ✅ `integration_expansion_phase2.sql` - Core integration tables
2. ✅ `phase2_complete_schema.sql` - Remaining Phase 2 tables
3. ✅ `add_materialized_views.sql` - Performance optimizations

---

## Schema Verification Checklist

Use this checklist to verify Phase 2 schema is complete:

### Core MVP Tables (Phase 1)
- [x] User
- [x] Organization
- [x] Document
- [x] CapitalCall

### Payment Processing
- [ ] Payment
- [ ] BankAccount
- [ ] StatementReconciliation

### Fund Administrator Integration
- [ ] FundAdministrator
- [ ] FundAdminConnection
- [ ] InvestorMapping
- [ ] FundMapping
- [ ] FundAdminSync
- [ ] UnmappedInvestor
- [ ] WebhookLog

### Accounting Integration
- [ ] AccountingConnection
- [ ] AccountingTransaction

### Document Signatures
- [ ] SignatureRequest

### Webhook Marketplace
- [ ] WebhookEndpoint
- [ ] WebhookDelivery

### Security & Compliance
- [ ] AuditLog
- [ ] LegalHold
- [ ] DataProcessingAgreement

### Multi-Tenant & Enterprise
- [ ] OrganizationMember
- [ ] OrganizationRole
- [ ] OrganizationInvite
- [ ] SSOConnection

### Analytics & Reporting
- [ ] ScheduledReport
- [ ] ReportExecution

### Performance Views
- [ ] monthly_call_summary (materialized view)
- [ ] fund_performance_summary (materialized view)

---

## Applying Migrations

### Development Environment

```bash
# Option 1: Use migration script (recommended)
npm run migrate

# Option 2: Dry run first
tsx scripts/apply-migrations.ts --dry-run

# Then apply
tsx scripts/apply-migrations.ts

# Option 3: Manual application
psql $DATABASE_URL < prisma/migrations/integration_expansion_phase2.sql
psql $DATABASE_URL < prisma/migrations/phase2_complete_schema.sql
psql $DATABASE_URL < prisma/migrations/add_materialized_views.sql
```

### Production Environment

**⚠️ CRITICAL: Follow these steps for production deployment**

1. **Create Backup**
   ```bash
   # Create timestamped backup
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

   # Verify backup
   ls -lh backup_*.sql
   ```

2. **Test on Staging**
   ```bash
   # Apply to staging database first
   DATABASE_URL=$STAGING_DATABASE_URL npm run migrate

   # Run tests
   npm test

   # Verify schema
   npm run prisma:studio
   ```

3. **Schedule Maintenance Window**
   - Notify users of scheduled maintenance
   - Plan for 15-30 minutes downtime
   - Have rollback plan ready

4. **Apply to Production**
   ```bash
   # Set environment
   export DATABASE_URL=$PRODUCTION_DATABASE_URL

   # Auto-confirm migration
   export CONFIRM_MIGRATION=yes

   # Apply migrations
   npm run migrate

   # Generate Prisma client
   npm run prisma:generate

   # Restart application
   pm2 restart clearway
   ```

5. **Verify Deployment**
   ```bash
   # Check application logs
   pm2 logs clearway

   # Verify schema in database
   npm run prisma:studio

   # Run smoke tests
   npm run test:smoke
   ```

---

## Rollback Instructions

If migration fails or causes issues:

### Quick Rollback (Restore from Backup)

```bash
# Stop application
pm2 stop clearway

# Restore database from backup
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# Regenerate Prisma client for old schema
npm run prisma:generate

# Restart application
pm2 start clearway
```

### Manual Rollback (Drop New Tables)

If you need to manually rollback specific migrations:

```sql
-- Rollback phase2_complete_schema.sql
DROP TABLE IF EXISTS "ReportExecution" CASCADE;
DROP TABLE IF EXISTS "ScheduledReport" CASCADE;
DROP TABLE IF EXISTS "SSOConnection" CASCADE;
DROP TABLE IF EXISTS "OrganizationInvite" CASCADE;
DROP TABLE IF EXISTS "OrganizationRole" CASCADE;
DROP TABLE IF EXISTS "OrganizationMember" CASCADE;
DROP TABLE IF EXISTS "DataProcessingAgreement" CASCADE;
DROP TABLE IF EXISTS "LegalHold" CASCADE;
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "WebhookLog" CASCADE;
DROP TABLE IF EXISTS "UnmappedInvestor" CASCADE;
DROP TABLE IF EXISTS "FundAdminSync" CASCADE;
DROP TABLE IF EXISTS "FundMapping" CASCADE;
DROP TABLE IF EXISTS "InvestorMapping" CASCADE;
DROP TABLE IF EXISTS "FundAdminConnection" CASCADE;
DROP TABLE IF EXISTS "FundAdministrator" CASCADE;
DROP TABLE IF EXISTS "StatementReconciliation" CASCADE;
DROP TABLE IF EXISTS "BankAccount" CASCADE;
DROP TABLE IF EXISTS "Payment" CASCADE;

-- Rollback integration_expansion_phase2.sql
DROP TABLE IF EXISTS "WebhookDelivery" CASCADE;
DROP TABLE IF EXISTS "WebhookEndpoint" CASCADE;
DROP TABLE IF EXISTS "SignatureRequest" CASCADE;
DROP TABLE IF EXISTS "AccountingTransaction" CASCADE;
DROP TABLE IF EXISTS "AccountingConnection" CASCADE;

-- Rollback add_materialized_views.sql
DROP MATERIALIZED VIEW IF EXISTS monthly_call_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS fund_performance_summary CASCADE;
DROP INDEX IF EXISTS idx_capital_call_user_status;
DROP INDEX IF EXISTS idx_capital_call_user_duedate;
DROP INDEX IF EXISTS idx_capital_call_user_fund;
DROP INDEX IF EXISTS idx_capital_call_amount;
DROP INDEX IF EXISTS idx_capital_call_approved_at;
DROP INDEX IF EXISTS idx_document_user_status;
DROP INDEX IF EXISTS idx_document_org_uploaded;
```

---

## Post-Migration Tasks

After successful migration:

1. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

2. **Seed Development Database (Optional)**
   ```bash
   npm run seed
   ```

3. **Setup Materialized View Refresh**

   Add to crontab (hourly refresh):
   ```bash
   0 * * * * psql $DATABASE_URL -c "REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_call_summary;"
   0 * * * * psql $DATABASE_URL -c "REFRESH MATERIALIZED VIEW CONCURRENTLY fund_performance_summary;"
   ```

4. **Update Application Code**
   - Restart application servers
   - Clear application caches
   - Verify API endpoints

5. **Monitor Application**
   - Watch error logs
   - Check database performance
   - Monitor query execution times

---

## Breaking Changes & Compatibility

### Phase 2 Migrations
**Breaking Changes:** None

All Phase 2 migrations are additive:
- Only new tables are created
- No existing tables are modified
- No data is deleted or transformed
- Fully backward compatible with existing code

### Future Migrations
If future migrations require breaking changes:
1. Document in this section
2. Create migration path for existing data
3. Update API versioning
4. Notify users of deprecations

---

## Database Statistics

### Before Phase 2 Migration
- Tables: 4 (User, Organization, Document, CapitalCall)
- Indexes: ~12
- Views: 0

### After Phase 2 Migration
- Tables: 27 (4 + 23 new)
- Indexes: ~70+
- Materialized Views: 2
- Foreign Keys: ~15

---

## Troubleshooting

### Common Issues

#### Issue: Migration fails with "relation already exists"
**Solution:** Tables already exist. Either:
- Use `IF NOT EXISTS` clauses (already included)
- Drop existing tables first (if safe)
- Skip that specific migration

#### Issue: Foreign key constraint violation
**Solution:**
- Ensure migrations run in correct order
- Check that referenced tables exist
- Verify no orphaned records

#### Issue: Permission denied
**Solution:**
```bash
# Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_db_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_db_user;
```

#### Issue: Materialized view refresh fails
**Solution:**
```sql
-- Drop and recreate
DROP MATERIALIZED VIEW IF EXISTS monthly_call_summary CASCADE;
-- Then re-run add_materialized_views.sql
```

---

## Support & Documentation

### Related Files
- `/prisma/schema.prisma` - Complete Prisma schema
- `/prisma/migrations/` - All migration files
- `/scripts/apply-migrations.ts` - Migration application script
- `/prisma/seed.ts` - Database seeding script

### Prisma Commands
```bash
# Generate Prisma Client
npm run prisma:generate

# Open Prisma Studio
npm run prisma:studio

# Format schema
npm run prisma:format

# Validate schema
npm run prisma:validate
```

### Database Commands
```bash
# Connect to database
psql $DATABASE_URL

# List all tables
\dt

# Describe table
\d "TableName"

# Check indexes
\di

# View materialized views
\dm
```

---

## Migration History

| Date | Version | Migration | Status | Notes |
|------|---------|-----------|--------|-------|
| 2025-11-18 | 2.0.0 | Phase 2 Complete | ⏳ Pending | All Phase 2 tables created |
| 2025-11-18 | 1.1.0 | Integration Expansion | ⏳ Pending | Accounting, signatures, webhooks |
| 2025-11-18 | 1.0.1 | Materialized Views | ⏳ Pending | Performance optimization |
| 2025-11-17 | 1.0.0 | Initial Schema | ✅ Applied | Core MVP tables |

---

## Sign-off

**Prepared By:** Database Migration Agent
**Date:** 2025-11-18
**Review Status:** Ready for Deployment
**Approval Required:** Yes (Production DBA)

---

**End of Migration Status Document**
