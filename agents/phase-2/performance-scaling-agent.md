# Performance & Scaling Agent ⚡

## Role
Specialized agent responsible for performance optimization, horizontal scaling, caching strategies, CDN configuration, database optimization, load testing, and infrastructure scaling. Ensures Clearway can handle enterprise workload (10,000+ users, 1M+ capital calls).

## Primary Responsibilities

1. **Database Optimization**
   - Query optimization and indexing
   - Read replicas configuration
   - Connection pooling (PgBouncer)
   - Database sharding strategy
   - Materialized views for analytics

2. **Caching Architecture**
   - Redis multi-layer caching
   - CDN configuration (Cloudflare)
   - Edge caching strategies
   - Cache invalidation patterns
   - API response caching

3. **Application Performance**
   - Code splitting and lazy loading
   - Image optimization and lazy loading
   - Bundle size reduction
   - Server-side rendering optimization
   - API route optimization

4. **Load Balancing & Scaling**
   - Auto-scaling configuration
   - Load balancer setup
   - Regional deployment
   - Failover strategies
   - Blue-green deployments

5. **Monitoring & Alerting**
   - Performance metrics (APM)
   - Real User Monitoring (RUM)
   - Synthetic monitoring
   - Capacity planning
   - Performance budgets

## Tech Stack

### Caching
- **Redis** for application caching
- **Cloudflare CDN** for edge caching
- **Vercel Edge Network**

### Database
- **Neon** with read replicas
- **PgBouncer** for connection pooling
- **TimescaleDB** for time-series data

### Monitoring
- **New Relic APM**
- **Datadog** for infrastructure monitoring
- **Grafana** for custom dashboards

### Load Testing
- **k6** for load testing
- **Artillery** for API testing

## Phase 2 Features

### Week 15-16: Performance Optimization

**Task PERF-001: Redis Caching Layer**
```typescript
// lib/cache/redis.ts

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export enum CacheKey {
  CAPITAL_CALLS_LIST = 'capital-calls:list',
  CAPITAL_CALL_DETAIL = 'capital-call:detail',
  DASHBOARD_METRICS = 'dashboard:metrics',
  USER_PROFILE = 'user:profile',
  FUND_LIST = 'funds:list',
}

export class CacheService {
  /**
   * Get cached value with automatic JSON parsing
   */
  static async get<T>(key: string): Promise<T | null> {
    const cached = await redis.get(key);
    if (!cached) return null;

    try {
      return JSON.parse(cached) as T;
    } catch {
      return cached as T;
    }
  }

  /**
   * Set cached value with TTL
   */
  static async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await redis.setex(key, ttlSeconds, serialized);
  }

  /**
   * Delete cached value
   */
  static async del(key: string | string[]): Promise<void> {
    if (Array.isArray(key)) {
      await redis.del(...key);
    } else {
      await redis.del(key);
    }
  }

  /**
   * Get or set pattern
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Invalidate cache by pattern
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  /**
   * Multi-layer cache: Redis + In-memory
   */
  private static memoryCache = new Map<string, { value: any; expiresAt: number }>();

  static async getMultiLayer<T>(key: string): Promise<T | null> {
    // Check in-memory first (fastest)
    const memCached = this.memoryCache.get(key);
    if (memCached && memCached.expiresAt > Date.now()) {
      return memCached.value as T;
    }

    // Check Redis (network call)
    const redisCached = await this.get<T>(key);
    if (redisCached) {
      // Populate memory cache
      this.memoryCache.set(key, {
        value: redisCached,
        expiresAt: Date.now() + 60000, // 1 minute in memory
      });
      return redisCached;
    }

    return null;
  }

  static async setMultiLayer(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    // Set in both caches
    await this.set(key, value, ttlSeconds);
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + Math.min(ttlSeconds * 1000, 60000),
    });
  }
}

// Usage example
export async function getCachedCapitalCalls(userId: string) {
  return CacheService.getOrSet(
    `${CacheKey.CAPITAL_CALLS_LIST}:${userId}`,
    async () => {
      return db.capitalCall.findMany({
        where: { userId },
        orderBy: { dueDate: 'desc' },
      });
    },
    300 // 5 minutes
  );
}
```

**Task PERF-002: Database Query Optimization**
```typescript
// lib/db/optimized-queries.ts

import { db } from '@/lib/db';

/**
 * Optimized capital calls query with proper indexing
 */
export async function getCapitalCallsOptimized(params: {
  userId: string;
  status?: string[];
  fundNames?: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  // Use raw SQL for complex queries with proper indexes
  return db.$queryRaw`
    SELECT
      cc.*,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', p.id,
            'amount', p.amount,
            'paidAt', p."paidAt",
            'status', p.status
          ))
          FROM "Payment" p
          WHERE p."capitalCallId" = cc.id
        ),
        '[]'::json
      ) as payments
    FROM "CapitalCall" cc
    WHERE cc."userId" = ${params.userId}
      ${params.status ? sql`AND cc.status = ANY(${params.status})` : sql``}
      ${params.fundNames ? sql`AND cc."fundName" = ANY(${params.fundNames})` : sql``}
      ${params.startDate ? sql`AND cc."dueDate" >= ${params.startDate}` : sql``}
      ${params.endDate ? sql`AND cc."dueDate" <= ${params.endDate}` : sql``}
    ORDER BY cc."dueDate" DESC
    LIMIT ${params.limit || 50}
    OFFSET ${params.offset || 0}
  `;
}

/**
 * Dashboard metrics with single optimized query
 */
export async function getDashboardMetricsOptimized(userId: string) {
  // Single query instead of multiple round trips
  const result = await db.$queryRaw<Array<{
    total_calls: number;
    total_amount: number;
    avg_response_hours: number;
    upcoming_count: number;
    overdue_count: number;
    payment_rate: number;
  }>>`
    WITH stats AS (
      SELECT
        COUNT(*)::int as total_calls,
        COALESCE(SUM("amountDue"), 0) as total_amount,
        AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_response_hours,
        COUNT(*) FILTER (
          WHERE status = 'APPROVED'
          AND "dueDate" BETWEEN NOW() AND NOW() + INTERVAL '30 days'
        )::int as upcoming_count,
        COUNT(*) FILTER (
          WHERE status = 'APPROVED'
          AND "dueDate" < NOW()
        )::int as overdue_count,
        (
          COUNT(*) FILTER (WHERE status = 'PAID' AND "paidAt" <= "dueDate")::float /
          NULLIF(COUNT(*) FILTER (WHERE status = 'PAID')::float, 0)
        ) * 100 as payment_rate
      FROM "CapitalCall"
      WHERE "userId" = ${userId}
    )
    SELECT * FROM stats
  `;

  return result[0];
}

/**
 * Materialized view for analytics (updated hourly)
 */
export async function refreshAnalyticsMaterializedViews() {
  await db.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_call_summary`;
  await db.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY fund_performance_summary`;
}
```

**Migration for Materialized Views**:
```sql
-- prisma/migrations/add_materialized_views.sql

CREATE MATERIALIZED VIEW monthly_call_summary AS
SELECT
  DATE_TRUNC('month', "dueDate") as month,
  "userId",
  COUNT(*) as call_count,
  SUM("amountDue") as total_amount,
  AVG("amountDue") as avg_amount,
  COUNT(*) FILTER (WHERE status = 'PAID') as paid_count
FROM "CapitalCall"
GROUP BY DATE_TRUNC('month', "dueDate"), "userId";

CREATE INDEX idx_monthly_summary_user_month ON monthly_call_summary(month, "userId");

CREATE MATERIALIZED VIEW fund_performance_summary AS
SELECT
  "fundName",
  "userId",
  COUNT(*) as total_calls,
  SUM("amountDue") as total_amount,
  AVG(EXTRACT(EPOCH FROM ("paidAt" - "dueDate")) / 86400) as avg_days_to_payment,
  COUNT(*) FILTER (WHERE "paidAt" <= "dueDate")::float / NULLIF(COUNT(*) FILTER (WHERE "paidAt" IS NOT NULL), 0) as on_time_rate
FROM "CapitalCall"
WHERE status = 'PAID'
GROUP BY "fundName", "userId";

CREATE INDEX idx_fund_summary_user ON fund_performance_summary("userId");
```

**Task PERF-003: CDN & Edge Caching Configuration**
```typescript
// next.config.js

module.exports = {
  // ... existing config

  async headers() {
    return [
      {
        source: '/api/public/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/image:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400, // 24 hours
  },
};
```

**Cloudflare Workers for Edge Caching**:
```typescript
// cloudflare/worker.ts

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Cache API responses at edge
    if (url.pathname.startsWith('/api/public/')) {
      const cache = caches.default;
      const cacheKey = new Request(url.toString(), request);
      let response = await cache.match(cacheKey);

      if (!response) {
        response = await fetch(request);
        const headers = new Headers(response.headers);
        headers.set('Cache-Control', 'public, max-age=3600');
        response = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
        await cache.put(cacheKey, response.clone());
      }

      return response;
    }

    return fetch(request);
  },
};
```

**Task PERF-004: Load Testing Suite**
```typescript
// tests/load/k6-capital-calls.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const failureRate = new Rate('failed_requests');

export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '1m', target: 500 },   // Ramp up to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '1m', target: 1000 },  // Spike to 1000 users
    { duration: '2m', target: 1000 },  // Stay at 1000 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://clearway.com';

export default function () {
  // Test dashboard API
  const dashboardRes = http.get(`${BASE_URL}/api/analytics/dashboard`, {
    headers: {
      Authorization: `Bearer ${__ENV.AUTH_TOKEN}`,
    },
  });

  check(dashboardRes, {
    'dashboard status 200': (r) => r.status === 200,
    'dashboard response time < 500ms': (r) => r.timings.duration < 500,
  });

  failureRate.add(dashboardRes.status !== 200);

  sleep(1);

  // Test capital calls list
  const listRes = http.get(`${BASE_URL}/api/capital-calls`, {
    headers: {
      Authorization: `Bearer ${__ENV.AUTH_TOKEN}`,
    },
  });

  check(listRes, {
    'list status 200': (r) => r.status === 200,
    'list response time < 300ms': (r) => r.timings.duration < 300,
  });

  failureRate.add(listRes.status !== 200);

  sleep(2);
}
```

**Run Load Tests**:
```bash
k6 run --vus 100 --duration 10m tests/load/k6-capital-calls.js
```

## Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| API p95 Response Time | < 500ms | TBD | 🎯 |
| Database Query Time | < 100ms | TBD | 🎯 |
| Page Load (FCP) | < 1.5s | TBD | 🎯 |
| Time to Interactive | < 3s | TBD | 🎯 |
| Cache Hit Rate | > 80% | TBD | 🎯 |
| Concurrent Users | 10,000+ | TBD | 🎯 |

---

**Performance & Scaling Agent ready to handle enterprise-scale workloads with sub-second response times.**
