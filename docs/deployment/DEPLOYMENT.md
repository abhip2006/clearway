# Deployment Guide

This guide covers deploying Clearway to production using Vercel.

## Table of Contents

1. [Vercel Deployment](#vercel-deployment)
2. [Environment Variables](#environment-variables)
3. [Database Migration](#database-migration)
4. [Monitoring Setup](#monitoring-setup)
5. [Backup Procedures](#backup-procedures)
6. [Rollback Procedures](#rollback-procedures)

---

## Vercel Deployment

Clearway is optimized for deployment on Vercel.

### Prerequisites

- Vercel account (sign up at https://vercel.com)
- GitHub repository with Clearway code
- Production environment variables ready

### Step 1: Connect Repository

1. **Log in to Vercel**: https://vercel.com/login
2. **Click "New Project"**
3. **Import Git Repository**: Select your Clearway repository
4. **Configure Project**:
   - Framework Preset: **Next.js**
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

### Step 2: Configure Environment Variables

Add all production environment variables:

**Database**:
```
DATABASE_URL=postgresql://user:pass@neon.tech:5432/clearway_prod
```

**Clerk Auth**:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
```

**Cloudflare R2**:
```
R2_ENDPOINT=https://...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=clearway-documents-prod
R2_PUBLIC_URL=https://cdn.clearway.com
```

**AI Services**:
```
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=...
AZURE_DOCUMENT_INTELLIGENCE_KEY=...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

**Email & Jobs**:
```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Clearway <alerts@clearway.com>
INNGEST_SIGNING_KEY=signkey-prod-...
INNGEST_EVENT_KEY=...
```

**Monitoring**:
```
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
```

**Application**:
```
NEXT_PUBLIC_APP_URL=https://clearway.com
NODE_ENV=production
```

### Step 3: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (~3-5 minutes)
3. Vercel automatically deploys to a preview URL
4. Verify everything works
5. Assign custom domain (optional)

### Step 4: Configure Custom Domain

1. **In Vercel Dashboard**: Go to Project > Settings > Domains
2. **Add Domain**: Enter `clearway.com`
3. **Configure DNS**:
   - Add A record: `76.76.21.21`
   - Add CNAME: `cname.vercel-dns.com`
4. **Wait for SSL**: Vercel auto-provisions SSL certificate
5. **Verify**: Visit https://clearway.com

---

## Environment Variables

### Managing Environment Variables

**Via Vercel Dashboard**:
1. Project Settings > Environment Variables
2. Add new variable
3. Select environment (Production, Preview, Development)
4. Save

**Via Vercel CLI**:
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Add environment variable
vercel env add DATABASE_URL production

# List environment variables
vercel env ls
```

### Environment Variable Scopes

| Scope | Usage |
|-------|-------|
| **Production** | Production deployments only |
| **Preview** | Preview deployments (PRs) |
| **Development** | Local development with `vercel dev` |

### Secrets Management

**Sensitive Variables**: Store as Vercel Environment Variables (encrypted at rest)

**Never commit**:
- API keys
- Database passwords
- OAuth secrets
- Encryption keys

---

## Database Migration

### Production Database Setup

#### Option 1: Neon (Recommended)

1. **Create Production Database**: https://neon.tech
2. **Create Database**: `clearway_prod`
3. **Copy Connection String**
4. **Add to Vercel**: As `DATABASE_URL`

#### Option 2: AWS RDS PostgreSQL

1. Create RDS instance
2. Configure security groups
3. Enable SSL connections
4. Copy connection string
5. Add to Vercel

### Running Migrations

**Important**: Always run migrations during maintenance windows.

#### Step 1: Create Migration

```bash
# Locally, create migration
npm run db:migrate

# This creates a new migration file in prisma/migrations/
```

#### Step 2: Deploy Migration

**Option A: Automatic (Vercel Build)**

Add to `package.json`:
```json
{
  "scripts": {
    "vercel-build": "prisma migrate deploy && next build"
  }
}
```

Migrations run automatically on every deployment.

**Option B: Manual**

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Run migration
vercel env pull .env.production
npx prisma migrate deploy
```

#### Step 3: Verify Migration

```bash
# Check migration status
npx prisma migrate status

# View data in Prisma Studio
npx prisma studio
```

### Migration Best Practices

1. **Backup Before Migration**: Always backup database first
2. **Test in Staging**: Run migration in staging environment
3. **Backward Compatible**: Ensure migrations are backward compatible
4. **Maintenance Window**: Schedule during low-traffic periods
5. **Monitor**: Watch error logs closely after migration

---

## Monitoring Setup

### Sentry (Error Tracking)

Already configured! Errors are automatically sent to Sentry.

**View Errors**:
1. Log in to https://sentry.io
2. Select Clearway project
3. View real-time errors

**Configure Alerts**:
1. Sentry Dashboard > Alerts
2. Create alert rule (e.g., "More than 10 errors in 5 minutes")
3. Add email/Slack notification

### Vercel Analytics

**Enable**:
1. Vercel Dashboard > Analytics
2. Enable Web Analytics
3. View traffic, performance, and Core Web Vitals

### Langfuse (LLM Observability)

Monitor AI performance:
1. Log in to https://cloud.langfuse.com
2. View traces for AI extractions
3. Monitor accuracy and latency
4. Set up alerts for low accuracy

### Uptime Monitoring

**Recommended**: Use external service like:
- **UptimeRobot** (free): https://uptimerobot.com
- **Pingdom**: https://pingdom.com
- **Better Uptime**: https://betteruptime.com

Configure:
- **URL**: https://clearway.com/api/health
- **Interval**: 5 minutes
- **Alert**: Email/Slack on downtime

### Custom Monitoring Dashboard

Create a status dashboard:

```bash
# Install dependencies
npm install @vercel/analytics

# Add to app
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## Backup Procedures

### Database Backups

#### Automated Backups (Neon)

Neon automatically backs up your database:
- **Frequency**: Continuous (point-in-time recovery)
- **Retention**: 7 days (Pro), 30 days (Enterprise)
- **Restore**: Via Neon dashboard

#### Manual Backups

```bash
# Backup production database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Compress backup
gzip backup-$(date +%Y%m%d).sql

# Upload to S3/R2 for long-term storage
aws s3 cp backup-$(date +%Y%m%d).sql.gz s3://clearway-backups/
```

#### Scheduled Backups

Use GitHub Actions for automated backups:

```yaml
# .github/workflows/backup.yml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM UTC

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Backup Database
        run: |
          pg_dump ${{ secrets.DATABASE_URL }} | gzip > backup.sql.gz

      - name: Upload to S3
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Copy to S3
        run: aws s3 cp backup.sql.gz s3://clearway-backups/$(date +%Y%m%d)/
```

### Document Storage Backups

Documents stored in Cloudflare R2 are automatically replicated across multiple regions.

**Additional Backup** (optional):
- Enable R2 Object Lifecycle
- Replicate to second bucket or S3

### Configuration Backups

**Backup Environment Variables**:
```bash
# Export all env vars
vercel env pull .env.production.backup
```

Store securely in password manager or encrypted storage.

---

## Rollback Procedures

### Scenario 1: Bad Deployment

**Instant Rollback**:
1. Vercel Dashboard > Deployments
2. Find previous working deployment
3. Click "..." menu > **Promote to Production**
4. Deployment instantly rolled back

**Via CLI**:
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback
```

### Scenario 2: Database Migration Issue

**Rollback Migration**:

1. **Identify Last Good Migration**:
   ```bash
   npx prisma migrate status
   ```

2. **Reset to Previous Migration**:
   ```bash
   # WARNING: This can cause data loss
   npx prisma migrate resolve --rolled-back MIGRATION_NAME
   ```

3. **Restore from Backup** (safer):
   ```bash
   # Restore from backup
   psql $DATABASE_URL < backup-YYYYMMDD.sql
   ```

### Scenario 3: Complete System Failure

**Full Restore**:

1. **Deploy Previous Version**:
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Restore Database**:
   ```bash
   psql $DATABASE_URL < backup-YYYYMMDD.sql
   ```

3. **Verify Services**:
   - Check https://clearway.com/api/health
   - Test document upload
   - Verify AI extraction works

4. **Post-Incident Review**:
   - Document what went wrong
   - Identify root cause
   - Implement preventive measures

---

## Production Checklist

Before going live:

### Pre-Deployment

- [ ] All environment variables set
- [ ] Database migrations tested in staging
- [ ] SSL certificate configured
- [ ] Custom domain configured
- [ ] Error tracking (Sentry) enabled
- [ ] Analytics enabled
- [ ] Backup procedures tested
- [ ] Rollback procedures documented

### Post-Deployment

- [ ] Verify app loads: https://clearway.com
- [ ] Test user signup/login
- [ ] Upload sample document
- [ ] Verify AI extraction works
- [ ] Check Inngest jobs running
- [ ] Test email notifications
- [ ] Verify payment integration
- [ ] Check error logs (no errors)
- [ ] Monitor performance (fast load times)
- [ ] Set up uptime monitoring

### Ongoing Maintenance

- [ ] Daily: Check error logs
- [ ] Weekly: Review analytics
- [ ] Monthly: Review and rotate API keys
- [ ] Quarterly: Load test and optimize
- [ ] Annually: Security audit

---

## Scaling Considerations

### Vercel Auto-Scaling

Vercel automatically scales based on traffic:
- **Serverless Functions**: Auto-scale to handle traffic
- **Edge Network**: CDN caching for static assets
- **Concurrent Executions**: Unlimited (Enterprise)

### Database Scaling (Neon)

Neon auto-scales compute:
- **Autosuspend**: Pauses during inactivity
- **Autoscale**: Scales up during high load
- **Read Replicas**: For read-heavy workloads

### Monitoring Performance

**Watch For**:
- Response times >200ms
- Error rates >0.1%
- Database connection pool exhaustion
- API rate limiting

**Optimize When**:
- Add database indexes for slow queries
- Implement caching (Redis) for hot data
- Use CDN for static assets
- Optimize images (next/image)

---

## Getting Help

**Deployment Issues**:
- Email: devops@clearway.com
- Vercel Support: https://vercel.com/support
- Emergency: emergency@clearway.com (Enterprise)

**Resources**:
- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Ready to deploy?** Follow the checklist and deploy with confidence!
