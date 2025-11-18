# Performance Optimization Quick Start

## Setup (5 minutes)

### 1. Install Redis

**Option A: Docker (Recommended for Development)**
```bash
docker run -d -p 6379:6379 redis:latest
```

**Option B: Redis Cloud (Recommended for Production)**
- Sign up at https://redis.com/try-free/
- Create a database
- Copy connection string

### 2. Configure Environment

Add to `.env`:
```bash
REDIS_URL=redis://localhost:6379
# Or for Redis Cloud:
# REDIS_URL=redis://default:password@redis-12345.redis.cloud:12345
```

### 3. Run Migrations

```bash
# Apply materialized views
psql $DATABASE_URL -f prisma/migrations/add_materialized_views.sql

# Or manually in Neon console
# Copy contents of prisma/migrations/add_materialized_views.sql
```

### 4. Test Cache Connection

```bash
node -e "const Redis = require('ioredis'); const redis = new Redis(process.env.REDIS_URL); redis.ping().then(() => console.log('✓ Redis connected')).catch(e => console.error('✗ Redis error:', e));"
```

## Usage

### Caching in API Routes

```typescript
import { CacheService, getCachedCapitalCalls } from '@/lib/cache';

// Option 1: Use helper functions
export async function GET(req: Request) {
  const userId = getCurrentUserId(req);
  const calls = await getCachedCapitalCalls(userId);
  return Response.json(calls);
}

// Option 2: Custom caching
export async function GET(req: Request) {
  const data = await CacheService.getOrSet(
    'my-cache-key',
    async () => {
      // Fetch data from database
      return db.myModel.findMany();
    },
    300 // 5 minutes
  );
  return Response.json(data);
}
```

### Cache Invalidation

```typescript
import { invalidateCapitalCallCache } from '@/lib/cache';

// After creating/updating capital call
await db.capitalCall.update({ ... });
await invalidateCapitalCallCache(capitalCallId, userId);
```

### Using Optimized Queries

```typescript
import {
  getCapitalCallsOptimized,
  getDashboardMetricsOptimized
} from '@/lib/db';

// Optimized capital calls query
const calls = await getCapitalCallsOptimized({
  userId,
  status: ['APPROVED', 'PENDING_REVIEW'],
  limit: 50,
  offset: 0,
});

// Optimized dashboard metrics
const metrics = await getDashboardMetricsOptimized(userId);
```

## Scheduled Tasks

### Refresh Materialized Views (Hourly)

**Vercel Cron Job** (recommended):
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/refresh-views",
    "schedule": "0 * * * *"
  }]
}
```

**Manual Refresh**:
```bash
npm run cache:refresh
```

**Node Script**:
```bash
tsx scripts/refresh-materialized-views.ts
```

## Load Testing

### Install K6

```bash
# macOS
brew install k6

# Linux
curl https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz -L | tar xvz
sudo cp k6-v0.48.0-linux-amd64/k6 /usr/local/bin

# Windows
choco install k6
```

### Run Tests

```bash
# Quick load test
npm run test:load

# Stress test (find breaking point)
npm run test:load:stress

# Spike test (sudden traffic)
npm run test:load:spike

# Soak test (2+ hours)
npm run test:load:soak

# All tests
npm run test:load:all
```

### Custom Test

```bash
k6 run \
  -e BASE_URL=https://staging.clearway.com \
  -e AUTH_TOKEN=your_token \
  tests/load/k6-capital-calls.js
```

## Monitoring

### Check Cache Stats

```typescript
import { CacheService } from '@/lib/cache';

const stats = await CacheService.getStats();
console.log(`Memory cache: ${stats.memoryKeys} keys`);
console.log(`Redis cache: ${stats.redisKeys} keys`);
```

### Monitor Redis

```bash
# Connect to Redis CLI
redis-cli -u $REDIS_URL

# Monitor commands in real-time
MONITOR

# Get info
INFO stats

# Check memory usage
INFO memory

# List keys by pattern
KEYS capital-calls:*
```

### Database Performance

```typescript
import { getDatabaseStats } from '@/lib/db';

const stats = await getDatabaseStats();
console.table(stats);
```

## Performance Checklist

### Before Deployment

- [ ] Redis is running and accessible
- [ ] `REDIS_URL` environment variable is set
- [ ] Materialized views are created
- [ ] Scheduled task for view refresh is configured
- [ ] Cache helper functions are integrated into API routes
- [ ] Load tests pass with target metrics

### After Deployment

- [ ] Run baseline load test
- [ ] Verify cache hit rate > 80%
- [ ] Check Redis memory usage
- [ ] Monitor API response times
- [ ] Set up alerts for performance degradation

## Troubleshooting

### Redis Connection Issues

```bash
# Check if Redis is running
redis-cli ping

# Test connection from Node
node -e "require('ioredis').default(process.env.REDIS_URL).ping().then(r => console.log(r))"

# Check connection string format
echo $REDIS_URL
# Should be: redis://[[username:]password@]host[:port][/database]
```

### Slow Queries

```sql
-- Check slow queries in PostgreSQL
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;
```

### Cache Not Working

```typescript
// Debug cache operations
import { CacheService } from '@/lib/cache';

// Check if Redis is connected
console.log('Redis connected:', CacheService.isConnected());

// Test set/get
await CacheService.set('test-key', 'test-value', 60);
const value = await CacheService.get('test-key');
console.log('Cache test:', value); // Should log: test-value
```

## Performance Metrics

### Target Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| API Response Time (p95) | < 500ms | K6 load tests |
| Cache Hit Rate | > 80% | Redis INFO stats |
| Database Query Time | < 100ms | pg_stat_statements |
| Concurrent Users | 10,000+ | K6 stress test |
| Error Rate | < 1% | K6 thresholds |

### Measuring Success

```bash
# Run load test and check metrics
npm run test:load

# Expected output:
# ✓ checks........................: 100.00%
# ✓ http_req_duration.............: p(95)=450ms
# ✓ http_req_failed...............: 0.00%
# ✓ successful_requests...........: count=15000+
```

## Quick Commands

```bash
# Start Redis locally
docker run -d -p 6379:6379 redis:latest

# Run migrations
psql $DATABASE_URL -f prisma/migrations/add_materialized_views.sql

# Refresh views
npm run cache:refresh

# Run load test
npm run test:load

# Check Redis keys
redis-cli -u $REDIS_URL --scan --pattern "capital-calls:*"

# Clear cache
redis-cli -u $REDIS_URL FLUSHDB

# Monitor Redis in real-time
redis-cli -u $REDIS_URL MONITOR
```

## Next Steps

1. **Integration**: Add caching to existing API routes
2. **Testing**: Run baseline load tests
3. **Monitoring**: Set up performance dashboards
4. **Optimization**: Tune cache TTLs based on metrics
5. **Scaling**: Configure auto-scaling based on load test results

## Resources

- [Redis Documentation](https://redis.io/docs/)
- [K6 Documentation](https://k6.io/docs/)
- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
- [Load Testing Guide](/tests/load/README.md)
- [Full Performance Report](/PERFORMANCE_SCALING_REPORT.md)
