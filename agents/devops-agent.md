# DevOps Agent 🚀

## Role
Responsible for infrastructure, deployment pipelines, monitoring, performance optimization, and production readiness. Ensures Clearway MVP runs reliably and scales efficiently.

## Primary Responsibilities

1. **Project Initialization**
   - Next.js 15 project setup
   - Environment configuration
   - Git repository structure
   - Development tooling

2. **Deployment**
   - Vercel deployment configuration
   - Environment variable management
   - Preview deployments
   - Production deployments

3. **Monitoring & Observability**
   - Sentry error tracking
   - Vercel Analytics
   - Performance monitoring
   - Uptime monitoring

4. **CI/CD**
   - GitHub Actions workflows
   - Automated testing
   - Build optimization
   - Deployment automation

5. **Performance Optimization**
   - Bundle size optimization
   - Image optimization
   - Caching strategies
   - Edge deployment

## Tech Stack

### Hosting & Deployment
- **Vercel** - Frontend + API routes (Edge runtime)
- **Neon** - Serverless PostgreSQL
- **Cloudflare R2** - Object storage
- **Modal** - ML inference (future, if needed)

### Monitoring & Logging
- **Sentry** - Error tracking + performance monitoring
- **Vercel Analytics** - Web vitals + page views
- **Langfuse** - LLM observability
- **PostHog** - Product analytics (Phase 2)

### CI/CD
- **GitHub Actions** - Automated workflows
- **Vercel** - Auto-deployments on push

## MVP Tasks

### Week 0: Project Initialization

**Task DEV-001: Initialize Next.js Project**
```bash
# Create Next.js 15 project with all options
npx create-next-app@latest clearway-mvp \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"

cd clearway-mvp

# Install core dependencies
npm install @prisma/client zod react-hook-form @hookform/resolvers
npm install @clerk/nextjs @tanstack/react-query zustand
npm install openai @azure/ai-form-recognizer
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install inngest resend langfuse
npm install react-pdf
npm install csv-stringify

# Install dev dependencies
npm install -D prisma @types/node tsx vitest @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
npm install -D eslint prettier prettier-plugin-tailwindcss
npm install -D @sentry/nextjs

# Initialize shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button input label card badge dialog dropdown-menu
```

**Acceptance Criteria**:
- ✅ Next.js 15 project created
- ✅ All dependencies installed
- ✅ shadcn/ui components ready
- ✅ TypeScript configured
- ✅ Tailwind CSS configured

**Dependencies**: None

---

**Task DEV-002: Environment Configuration**
```bash
# .env.example (committed to git)
# Database
DATABASE_URL="postgresql://user:pass@db.neon.tech/clearway"

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# AI/ML
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
AZURE_DI_ENDPOINT="https://your-resource.cognitiveservices.azure.com/"
AZURE_DI_KEY="..."

# Storage (Cloudflare R2)
R2_ENDPOINT="https://your-account.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="clearway-documents"
R2_PUBLIC_URL="https://cdn.clearway.com"

# Email
RESEND_API_KEY="re_..."

# Monitoring
SENTRY_DSN="https://...@sentry.io/..."
NEXT_PUBLIC_SENTRY_DSN="https://...@sentry.io/..."
LANGFUSE_PUBLIC_KEY="pk-lf-..."
LANGFUSE_SECRET_KEY="sk-lf-..."

# Inngest
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."
```

**`.gitignore` additions**:
```gitignore
# Environment
.env
.env.local
.env.*.local

# Sentry
.sentryclirc
```

**Acceptance Criteria**:
- ✅ `.env.example` documented
- ✅ `.env.local` created (not committed)
- ✅ All services have placeholder keys
- ✅ `.gitignore` configured properly

---

### Week 1: Vercel Deployment

**Task DEV-003: Vercel Project Setup**
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project
vercel link

# Add environment variables
vercel env add DATABASE_URL
vercel env add CLERK_SECRET_KEY
vercel env add OPENAI_API_KEY
# ... (add all environment variables)

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**`vercel.json` Configuration**:
```json
{
  "framework": "nextjs",
  "buildCommand": "prisma generate && next build",
  "installCommand": "npm install",
  "devCommand": "next dev",
  "env": {
    "DATABASE_URL": "@database-url"
  },
  "regions": ["iad1"],
  "functions": {
    "app/api/**": {
      "maxDuration": 60
    }
  }
}
```

**Acceptance Criteria**:
- ✅ Vercel project linked
- ✅ All environment variables added
- ✅ Preview deployments working
- ✅ Production deployment successful
- ✅ Custom domain configured (optional)

**Dependencies**:
- Integration Agent: All services configured

---

**Task DEV-004: GitHub Actions CI/CD**
```yaml
# .github/workflows/ci.yml

name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run tests
        run: npm run test
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Build
        run: npm run build

  deploy-preview:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    needs: test

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel (Preview)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-production:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: test

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

**Acceptance Criteria**:
- ✅ Tests run on every PR
- ✅ Preview deployment on PR
- ✅ Production deployment on merge to main
- ✅ Build fails if tests fail

---

### Week 2: Monitoring Setup

**Task DEV-005: Sentry Integration**
```bash
# Install Sentry
npm install @sentry/nextjs

# Initialize Sentry
npx @sentry/wizard -i nextjs
```

**`sentry.client.config.ts`**:
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 1.0,

  environment: process.env.NODE_ENV,

  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', /^https:\/\/clearway\.com/],
    }),
    new Sentry.Replay(),
  ],

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**`sentry.server.config.ts`**:
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: 1.0,

  environment: process.env.NODE_ENV,
});
```

**Error Boundary**:
```typescript
// app/error.tsx

'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-white rounded-lg"
      >
        Try again
      </button>
    </div>
  );
}
```

**Acceptance Criteria**:
- ✅ Sentry capturing client errors
- ✅ Sentry capturing server errors
- ✅ Session replay enabled
- ✅ Performance monitoring active
- ✅ Error boundary on all pages

---

**Task DEV-006: Vercel Analytics**
```typescript
// app/layout.tsx

import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

**Acceptance Criteria**:
- ✅ Page views tracked
- ✅ Web vitals measured
- ✅ User sessions tracked

---

### Week 3-4: Performance Optimization

**Task DEV-007: Bundle Size Optimization**
```javascript
// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Optimize bundles
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Image optimization
  images: {
    domains: ['cdn.clearway.com'],
    formats: ['image/avif', 'image/webp'],
  },

  // Experimental features
  experimental: {
    optimizePackageImports: ['@radix-ui', 'lucide-react'],
  },

  // Bundle analyzer (optional)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: true,
        })
      );
      return config;
    },
  }),
};

module.exports = nextConfig;
```

**Analyze bundle**:
```bash
ANALYZE=true npm run build
```

**Acceptance Criteria**:
- ✅ Initial load < 200KB gzipped
- ✅ Code splitting configured
- ✅ Tree shaking working
- ✅ No console.logs in production

---

**Task DEV-008: Caching Strategy**
```typescript
// app/api/capital-calls/calendar/route.ts

export async function GET(req: Request) {
  // ... (existing code)

  return Response.json(capitalCalls, {
    headers: {
      'Cache-Control': 'private, max-age=300', // 5 minutes
    },
  });
}

// For static pages
export const revalidate = 3600; // Revalidate every hour
```

**Vercel Edge Config** (for feature flags):
```typescript
import { get } from '@vercel/edge-config';

export async function GET() {
  const featureFlag = await get('new-feature-enabled');

  if (featureFlag) {
    // New code path
  } else {
    // Old code path
  }
}
```

**Acceptance Criteria**:
- ✅ Static pages cached properly
- ✅ API responses cached when appropriate
- ✅ Cache headers configured
- ✅ Edge config for feature flags (optional)

---

### Week 7-8: Production Readiness

**Task DEV-009: Health Check Endpoint**
```typescript
// app/api/health/route.ts

import { db } from '@/lib/db';

export async function GET() {
  try {
    // Check database connection
    await db.$queryRaw`SELECT 1`;

    // Check other critical services
    const checks = {
      database: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
    };

    return Response.json(checks);
  } catch (error) {
    return Response.json(
      {
        database: 'error',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
```

**Acceptance Criteria**:
- ✅ Health endpoint returns 200 when healthy
- ✅ Health endpoint returns 500 when unhealthy
- ✅ Can be used for uptime monitoring

---

**Task DEV-010: Production Checklist**
```markdown
# Production Launch Checklist

## Security
- [ ] All API endpoints require authentication
- [ ] Environment variables secured in Vercel
- [ ] HTTPS enforced
- [ ] CORS configured properly
- [ ] Rate limiting enabled (Vercel automatic)
- [ ] SQL injection prevented (using Prisma)
- [ ] XSS prevented (React escaping)

## Performance
- [ ] Lighthouse score > 90 (all metrics)
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.5s
- [ ] Total Blocking Time < 300ms
- [ ] Cumulative Layout Shift < 0.1
- [ ] Largest Contentful Paint < 2.5s

## Monitoring
- [ ] Sentry error tracking active
- [ ] Vercel Analytics collecting data
- [ ] Langfuse tracking LLM calls
- [ ] Health check endpoint working
- [ ] Alerts configured for errors

## Data
- [ ] Database migrations applied
- [ ] Backups configured (Neon automatic)
- [ ] Seed data removed from production

## Documentation
- [ ] README.md updated
- [ ] API documentation complete
- [ ] Environment variables documented
- [ ] Deployment process documented

## Legal
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent (if needed)

## User Experience
- [ ] Error messages user-friendly
- [ ] Loading states everywhere
- [ ] Empty states for all lists
- [ ] Mobile responsive
- [ ] Accessibility tested

## Testing
- [ ] All tests passing
- [ ] E2E tests for critical flows
- [ ] Load testing complete
- [ ] AI accuracy > 95% validated
```

---

## Handoff Requirements

### To All Agents
```markdown
## Development Environment Ready

**Project**: Clearway MVP
**Repository**: https://github.com/your-org/clearway-mvp
**Preview URL**: https://clearway-mvp-preview.vercel.app
**Production URL**: https://clearway.com

**Getting Started**:
```bash
git clone https://github.com/your-org/clearway-mvp
cd clearway-mvp
npm install
cp .env.example .env.local
# Fill in .env.local with API keys
npx prisma generate
npx prisma migrate dev
npm run dev
```

**Available Scripts**:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run Playwright tests
- `npm run db:push` - Push schema changes to DB
- `npm run db:seed` - Seed development data

**Environment Variables**: See `.env.example`

**Deployment**:
- Push to `main` branch → Auto-deploy to production
- Open PR → Auto-deploy to preview URL
```

## Quality Standards

### Deployment
- Zero-downtime deployments
- Automatic rollback on errors
- Preview deployments on all PRs
- Production deploys only from `main`

### Performance
- Lighthouse score > 90
- API response time < 500ms (p95)
- Page load time < 3s
- No layout shifts

### Monitoring
- 99.9% uptime target
- Error rate < 0.1%
- All errors tracked in Sentry
- Performance monitored in Vercel

## Status Reporting

Location: `.agents/status/devops-status.json`

```json
{
  "agent": "devops-agent",
  "date": "2025-11-20",
  "status": "complete",
  "current_week": 8,
  "completed_tasks": ["DEV-001", "DEV-002", "DEV-003", "DEV-004", "DEV-005", "DEV-006", "DEV-007", "DEV-008", "DEV-009", "DEV-010"],
  "in_progress_tasks": [],
  "blocked_tasks": [],
  "metrics": {
    "uptime": "99.95%",
    "lighthouse_score": 94,
    "deploy_count": 45,
    "avg_deploy_time": "2m 15s",
    "error_rate": "0.02%"
  }
}
```

---

**DevOps Agent is ready to deploy and monitor Clearway MVP in production.**
