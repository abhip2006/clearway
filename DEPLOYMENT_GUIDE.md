# Clearway MVP - Deployment Guide

## Overview

This guide covers the deployment process for the Clearway MVP application, including environment setup, deployment configuration, and monitoring.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Vercel Deployment](#vercel-deployment)
4. [Environment Variables](#environment-variables)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Monitoring & Observability](#monitoring--observability)
7. [Performance Optimization](#performance-optimization)
8. [Health Checks](#health-checks)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 20.x or higher
- npm or pnpm
- Git
- Vercel account
- GitHub account
- All third-party service accounts (see Environment Variables section)

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/clearway-mvp.git
cd clearway-mvp
```

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your API keys
# See Environment Variables section below
```

### 4. Generate Prisma Client

```bash
npm run db:generate
```

### 5. Run Database Migrations

```bash
npm run db:migrate
```

### 6. Seed Development Data (Optional)

```bash
npm run db:seed
```

### 7. Start Development Server

```bash
npm run dev
```

Application will be available at `http://localhost:3000`

---

## Vercel Deployment

### Initial Setup

1. **Install Vercel CLI**

```bash
npm install -g vercel
```

2. **Login to Vercel**

```bash
vercel login
```

3. **Link Project**

```bash
vercel link
```

Follow the prompts to create a new project or link to an existing one.

### Environment Variables

Add all environment variables to Vercel:

```bash
# Database
vercel env add DATABASE_URL
vercel env add DATABASE_URL production

# Authentication (Clerk)
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add CLERK_SECRET_KEY
vercel env add CLERK_WEBHOOK_SECRET

# Storage (Cloudflare R2)
vercel env add R2_ENDPOINT
vercel env add R2_ACCOUNT_ID
vercel env add R2_ACCESS_KEY_ID
vercel env add R2_SECRET_ACCESS_KEY
vercel env add R2_BUCKET_NAME
vercel env add R2_PUBLIC_URL

# AI Services
vercel env add OPENAI_API_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
vercel env add AZURE_DOCUMENT_INTELLIGENCE_KEY

# Email (Resend)
vercel env add RESEND_API_KEY
vercel env add RESEND_FROM_EMAIL

# Background Jobs (Inngest)
vercel env add INNGEST_SIGNING_KEY
vercel env add INNGEST_EVENT_KEY

# Monitoring (Sentry)
vercel env add NEXT_PUBLIC_SENTRY_DSN
vercel env add SENTRY_AUTH_TOKEN

# Observability (Langfuse)
vercel env add LANGFUSE_PUBLIC_KEY
vercel env add LANGFUSE_SECRET_KEY
vercel env add LANGFUSE_HOST
```

### Deploy to Preview

```bash
vercel
```

This creates a preview deployment with a unique URL.

### Deploy to Production

```bash
vercel --prod
```

This deploys to your production domain.

---

## Environment Variables

### Required Variables

See `.env.example` for a complete list of required environment variables.

### Service Setup Links

- **Clerk (Authentication)**: https://clerk.com
- **Neon (Database)**: https://neon.tech
- **Cloudflare R2 (Storage)**: https://dash.cloudflare.com
- **Azure DI (Document Intelligence)**: https://portal.azure.com
- **OpenAI (AI)**: https://platform.openai.com
- **Anthropic (AI)**: https://console.anthropic.com
- **Resend (Email)**: https://resend.com
- **Inngest (Background Jobs)**: https://inngest.com
- **Langfuse (LLM Observability)**: https://cloud.langfuse.com
- **Sentry (Error Tracking)**: https://sentry.io

---

## CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline is configured in `.github/workflows/ci.yml` and runs:

1. **On Pull Request**:
   - Linting
   - Type checking
   - Unit tests
   - Build verification
   - Preview deployment to Vercel

2. **On Push to Main**:
   - All PR checks
   - Production deployment to Vercel

### Required GitHub Secrets

Add these secrets to your GitHub repository:

```
Settings → Secrets and variables → Actions → New repository secret
```

- `DATABASE_URL` - Your production database URL
- `VERCEL_TOKEN` - Vercel deployment token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

Get Vercel credentials:

```bash
# Get Vercel token
# Go to: https://vercel.com/account/tokens

# Get Org ID and Project ID
vercel link
cat .vercel/project.json
```

---

## Monitoring & Observability

### Sentry (Error Tracking)

**Setup**:
1. Create project at https://sentry.io
2. Add DSN to environment variables
3. Errors are automatically captured

**Features Enabled**:
- Client-side error tracking
- Server-side error tracking
- Performance monitoring
- Session replay (10% sample rate)
- Error replay (100% on errors)

**Error Boundary**: Located at `/app/error.tsx`

### Vercel Analytics

**Setup**:
- Automatically enabled when deployed to Vercel
- Integrated in `/app/layout.tsx`

**Metrics Tracked**:
- Page views
- Web Vitals (LCP, FID, CLS, FCP, TTFB)
- User sessions
- Geographic data

### Langfuse (LLM Observability)

**Setup**:
1. Create project at https://cloud.langfuse.com
2. Add API keys to environment variables
3. LLM calls are automatically tracked

**Features**:
- Token usage tracking
- Cost monitoring
- Latency tracking
- Quality monitoring

### Health Check Endpoint

**URL**: `/api/health`

**Response (Healthy)**:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T10:00:00.000Z",
  "version": "0.1.0",
  "checks": {
    "database": "ok",
    "environment": "ok"
  }
}
```

**Response (Unhealthy)**:
```json
{
  "status": "unhealthy",
  "timestamp": "2025-11-18T10:00:00.000Z",
  "checks": {
    "database": "error",
    "environment": "ok"
  },
  "error": "Connection timeout"
}
```

**Use Cases**:
- Uptime monitoring (UptimeRobot, Pingdom)
- Load balancer health checks
- Deployment verification

---

## Performance Optimization

### Bundle Size Optimization

**Features Enabled** (in `next.config.js`):
- Console.log removal in production
- Package import optimization (@radix-ui, lucide-react)
- Image optimization (AVIF, WebP)
- Code splitting
- Tree shaking

**Analyze Bundle**:
```bash
ANALYZE=true npm run build
```

This opens a visual bundle analyzer showing:
- Bundle sizes
- Chunk breakdown
- Dependency imports

### Caching Strategy

**Utilities** (in `/lib/cache.ts`):
- Cache duration constants
- Cache-Control header builders
- Standard cache headers for API responses

**Cache Durations**:
- NONE: No caching (sensitive data)
- SHORT: 5 minutes (frequently changing)
- MEDIUM: 1 hour (semi-static)
- LONG: 24 hours (static)
- WEEK: 7 days (assets)

**Example Usage**:
```typescript
import { CacheHeaders } from '@/lib/cache';

export async function GET() {
  const data = await fetchData();

  return Response.json(data, {
    headers: CacheHeaders.medium(true), // 1 hour, private cache
  });
}
```

### Image Optimization

- Use Next.js `<Image>` component
- Supported formats: AVIF, WebP
- Automatic responsive images
- Lazy loading enabled

---

## Health Checks

### Vercel Platform

Monitor deployment health at:
- https://vercel.com/[your-org]/clearway-mvp

### Application Health

Check application health:
```bash
curl https://clearway.com/api/health
```

### Database Health

Check via Neon dashboard:
- https://console.neon.tech

---

## Troubleshooting

### Build Failures

**Issue**: Build fails with TypeScript errors

**Solution**:
```bash
npx tsc --noEmit
# Fix reported errors
```

---

**Issue**: Build fails with Prisma errors

**Solution**:
```bash
npm run db:generate
npm run build
```

---

**Issue**: Build fails with dependency errors

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

---

### Deployment Failures

**Issue**: Vercel deployment fails

**Solution**:
1. Check build logs in Vercel dashboard
2. Verify all environment variables are set
3. Check database connectivity
4. Review error messages in Sentry

---

**Issue**: Environment variables not loading

**Solution**:
1. Verify variables are added to Vercel project
2. Check variable names match exactly
3. Redeploy after adding variables

---

### Runtime Errors

**Issue**: Database connection errors

**Solution**:
1. Verify DATABASE_URL is correct
2. Check Neon database is running
3. Verify IP allowlist settings
4. Check connection pool settings

---

**Issue**: Authentication errors (Clerk)

**Solution**:
1. Verify Clerk keys are correct
2. Check Clerk dashboard for errors
3. Verify webhook endpoints are configured
4. Check CORS settings

---

### Performance Issues

**Issue**: Slow page loads

**Solution**:
1. Run Lighthouse audit
2. Check bundle size with analyzer
3. Review database query performance
4. Check API response times in Vercel Analytics

---

**Issue**: High database latency

**Solution**:
1. Add database indexes
2. Optimize queries
3. Enable connection pooling
4. Consider read replicas (Neon)

---

## Support

For issues or questions:
- Check `/PRODUCTION_CHECKLIST.md`
- Review error logs in Sentry
- Check deployment logs in Vercel
- Contact DevOps team

---

**Last Updated**: 2025-11-18
**Version**: 0.1.0
**DevOps Agent**: Complete
