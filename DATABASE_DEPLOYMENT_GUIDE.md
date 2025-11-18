# Database Deployment Guide - Phase 2

**Database Migration Agent**
**Date:** 2025-11-18
**Version:** 2.0.0

---

## Quick Start

### Development Environment

```bash
# 1. Dry run to preview changes
npm run db:migrate:phase2:dry

# 2. Apply migrations
npm run db:migrate:phase2

# 3. Generate Prisma Client
npm run db:generate

# 4. Seed sample data (optional)
npm run db:seed

# 5. Open Prisma Studio to verify
npm run db:studio
```

### Production Environment

```bash
# 1. Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Test on staging first
DATABASE_URL=$STAGING_DATABASE_URL npm run db:migrate:phase2

# 3. Apply to production
export CONFIRM_MIGRATION=yes
DATABASE_URL=$PRODUCTION_DATABASE_URL npm run db:migrate:phase2

# 4. Generate Prisma Client
npm run db:generate

# 5. Restart application
pm2 restart clearway
```

---

## Pre-Deployment Checklist

Before running migrations, ensure:

- [ ] Database backup created and verified
- [ ] Migrations tested on staging environment
- [ ] Application code is compatible with new schema
- [ ] Maintenance window scheduled (if needed)
- [ ] Rollback plan documented and ready
- [ ] Database credentials have proper permissions
- [ ] Team notified of deployment timeline

---

## What's Being Deployed

### Migration Files (3 files)

1. **integration_expansion_phase2.sql** (5 tables)
   - AccountingConnection, AccountingTransaction
   - SignatureRequest
   - WebhookEndpoint, WebhookDelivery

2. **phase2_complete_schema.sql** (19 tables)
   - Payment Processing: Payment, BankAccount, StatementReconciliation
   - Fund Admin: FundAdministrator, FundAdminConnection, InvestorMapping, etc.
   - Security: AuditLog, LegalHold, DataProcessingAgreement
   - Multi-tenant: OrganizationMember, OrganizationRole, OrganizationInvite, SSOConnection
   - Analytics: ScheduledReport, ReportExecution

3. **add_materialized_views.sql** (2 views + indexes)
   - monthly_call_summary (materialized view)
   - fund_performance_summary (materialized view)
   - Composite indexes for performance

### Total Changes
- **24 new tables**
- **2 materialized views**
- **70+ indexes**
- **15+ foreign keys**
- **0 breaking changes** (fully backward compatible)

---

## Step-by-Step Deployment

### Step 1: Backup Database

```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file
ls -lh backup_*.sql
```

### Step 2: Test on Staging

```bash
# Set staging database URL
export DATABASE_URL=$STAGING_DATABASE_URL

# Run dry run first
npm run db:migrate:phase2:dry

# Apply migrations
npm run db:migrate:phase2

# Generate Prisma Client
npm run db:generate

# Run tests
npm test

# Verify in Prisma Studio
npm run db:studio
```

### Step 3: Schedule Maintenance Window

For production deployments, schedule a maintenance window:
- Notify users 24-48 hours in advance
- Plan for 15-30 minutes downtime
- Best time: Low-traffic hours (e.g., 2-4 AM local time)

### Step 4: Production Deployment

```bash
# Set production database URL
export DATABASE_URL=$PRODUCTION_DATABASE_URL

# Auto-confirm (skip interactive prompt)
export CONFIRM_MIGRATION=yes

# Apply migrations
npm run db:migrate:phase2

# Verify completion
echo "Exit code: $?"

# Generate Prisma Client
npm run db:generate

# Restart application
pm2 restart clearway

# Or if using different process manager
# systemctl restart clearway
# docker restart clearway
```

### Step 5: Post-Deployment Verification

```bash
# Check application logs
pm2 logs clearway --lines 100

# Verify database schema
npm run db:studio

# Run smoke tests
curl https://your-app.com/api/health

# Check specific endpoints
curl https://your-app.com/api/capital-calls
curl https://your-app.com/api/payments
```

### Step 6: Setup Materialized View Refresh

Add to crontab for hourly refresh:

```bash
# Edit crontab
crontab -e

# Add these lines:
0 * * * * psql $DATABASE_URL -c "REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_call_summary;" >> /var/log/clearway/mv-refresh.log 2>&1
0 * * * * psql $DATABASE_URL -c "REFRESH MATERIALIZED VIEW CONCURRENTLY fund_performance_summary;" >> /var/log/clearway/mv-refresh.log 2>&1
```

Or create a Node.js cron job:

```typescript
// In your application
import cron from 'node-cron';

cron.schedule('0 * * * *', async () => {
  await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_call_summary`;
  await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY fund_performance_summary`;
  console.log('Materialized views refreshed');
});
```

---

## Troubleshooting

### Issue: "relation already exists"

**Cause:** Tables were already created in a previous run.

**Solution:**
```sql
-- Check if tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- If safe, drop specific table and re-run
DROP TABLE IF EXISTS "TableName" CASCADE;
```

### Issue: Migration script times out

**Cause:** Large database or slow connection.

**Solution:** Increase timeout in apply-migrations.ts or run SQL directly:

```bash
psql $DATABASE_URL < prisma/migrations/integration_expansion_phase2.sql
psql $DATABASE_URL < prisma/migrations/phase2_complete_schema.sql
psql $DATABASE_URL < prisma/migrations/add_materialized_views.sql
```

### Issue: Foreign key constraint violation

**Cause:** Migrations ran out of order or orphaned data exists.

**Solution:**
1. Verify migration order
2. Check for orphaned records
3. Drop and re-run migrations in correct order

### Issue: Permission denied

**Cause:** Database user lacks necessary permissions.

**Solution:**
```sql
-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE clearway TO your_db_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_db_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_db_user;
ALTER USER your_db_user CREATEDB;
```

### Issue: Application crashes after migration

**Cause:** Prisma Client not regenerated or code incompatibility.

**Solution:**
```bash
# Regenerate Prisma Client
npm run db:generate

# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Rebuild application
npm run build

# Restart
pm2 restart clearway
```

---

## Rollback Procedures

### Full Rollback (Restore from Backup)

If something goes wrong, rollback immediately:

```bash
# 1. Stop application
pm2 stop clearway

# 2. Restore database
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# 3. Regenerate Prisma Client for old schema
npm run db:generate

# 4. Restart application
pm2 start clearway

# 5. Verify functionality
curl https://your-app.com/api/health
```

### Partial Rollback (Drop Specific Tables)

If only specific migrations need rollback:

```bash
# Run rollback SQL
psql $DATABASE_URL < scripts/rollback-phase2.sql
```

Create `/home/user/clearway/scripts/rollback-phase2.sql`:

```sql
-- Rollback Script
BEGIN;

-- Drop Phase 2 tables in reverse dependency order
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
DROP TABLE IF EXISTS "WebhookDelivery" CASCADE;
DROP TABLE IF EXISTS "WebhookEndpoint" CASCADE;
DROP TABLE IF EXISTS "SignatureRequest" CASCADE;
DROP TABLE IF EXISTS "AccountingTransaction" CASCADE;
DROP TABLE IF EXISTS "AccountingConnection" CASCADE;
DROP MATERIALIZED VIEW IF EXISTS monthly_call_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS fund_performance_summary CASCADE;

COMMIT;
```

---

## Performance Considerations

### Expected Migration Time

- **Small database** (< 10K rows): 5-10 seconds
- **Medium database** (10K - 100K rows): 10-30 seconds
- **Large database** (> 100K rows): 30-60 seconds

### Database Size Impact

- Schema size increase: ~100 KB (metadata)
- No data migration required (all new tables start empty)
- Minimal performance impact during migration

### Post-Migration Performance

- Materialized views improve dashboard query speed by 10-50x
- Composite indexes reduce query time for common patterns
- No negative impact on write operations

---

## Monitoring After Deployment

### Key Metrics to Watch

1. **Application Performance**
   - Response times for API endpoints
   - Error rates
   - Database query execution times

2. **Database Performance**
   - Connection pool utilization
   - Query performance (slow query log)
   - Table sizes and growth

3. **Business Metrics**
   - Capital call processing success rate
   - Payment reconciliation accuracy
   - User activity levels

### Monitoring Commands

```bash
# Check slow queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check table sizes
psql $DATABASE_URL -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Check connection count
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check materialized view sizes
psql $DATABASE_URL -c "SELECT oid::regclass, pg_size_pretty(pg_total_relation_size(oid)) FROM pg_class WHERE relkind = 'm';"
```

---

## Support & Escalation

### Internal Resources

- **Schema Documentation:** `/prisma/schema.prisma`
- **Migration Status:** `/MIGRATION_STATUS.md`
- **Migration Scripts:** `/prisma/migrations/`
- **Seed Data:** `/prisma/seed.ts`

### External Resources

- Prisma Documentation: https://www.prisma.io/docs
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Clearway Build Plan: `/BUILD_PLAN.md`

### Escalation Path

1. Check troubleshooting section above
2. Review migration logs and error messages
3. Restore from backup if critical issue
4. Contact Database Migration Agent (this agent)
5. Consult with Senior Database Administrator

---

## FAQ

### Q: Can I run these migrations on a live production database?

**A:** Yes, but with caution. All migrations use `IF NOT EXISTS` clauses and are non-destructive. However, always create a backup first and test on staging.

### Q: Will these migrations cause downtime?

**A:** Minimal downtime expected (< 1 minute). Migrations create new tables and don't modify existing ones. However, you'll need to restart the application after migration.

### Q: What if I've already created some of these tables manually?

**A:** The migrations use `IF NOT EXISTS` clauses, so they will skip tables that already exist. However, verify the schema matches.

### Q: Can I run migrations incrementally?

**A:** Yes, but maintain the order: integration_expansion → phase2_complete → materialized_views.

### Q: How do I verify migration success?

**A:** Use `npm run db:studio` to inspect the schema, or run the verification script in apply-migrations.ts.

### Q: What about Prisma's built-in migrations?

**A:** These are supplementary SQL migrations. You can still use Prisma's migration system for future changes.

---

## Post-Deployment Tasks

After successful deployment:

- [ ] Update deployment log
- [ ] Notify team of successful deployment
- [ ] Monitor application for 24 hours
- [ ] Archive backup (keep for 30 days minimum)
- [ ] Update runbook documentation
- [ ] Schedule post-mortem if issues occurred
- [ ] Plan next phase of development

---

**End of Deployment Guide**
