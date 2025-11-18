/**
 * Cache Helper Functions
 * Performance & Scaling Agent - Task PERF-001
 *
 * Provides convenient wrappers for common caching operations
 */

import { db } from '@/lib/db';
import { CacheService, CacheKey } from './redis';

/**
 * Get cached capital calls for a user
 */
export async function getCachedCapitalCalls(userId: string) {
  return CacheService.getOrSet(
    `${CacheKey.CAPITAL_CALLS_LIST}:${userId}`,
    async () => {
      return db.capitalCall.findMany({
        where: { userId },
        orderBy: { dueDate: 'desc' },
        include: {
          document: {
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
            },
          },
        },
      });
    },
    300 // 5 minutes
  );
}

/**
 * Get cached capital call detail
 */
export async function getCachedCapitalCall(id: string, userId: string) {
  return CacheService.getOrSet(
    `${CacheKey.CAPITAL_CALL_DETAIL}:${id}`,
    async () => {
      return db.capitalCall.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          document: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    },
    600 // 10 minutes
  );
}

/**
 * Get cached dashboard metrics with multi-layer caching
 * Hot data that benefits from in-memory cache
 */
export async function getCachedDashboardMetrics(userId: string) {
  const cacheKey = `${CacheKey.DASHBOARD_METRICS}:${userId}`;

  // Try multi-layer cache first
  const cached = await CacheService.getMultiLayer(cacheKey);
  if (cached) return cached;

  // Fetch from database
  const metrics = await db.capitalCall.groupBy({
    by: ['status'],
    where: { userId },
    _count: { id: true },
    _sum: { amountDue: true },
  });

  const result = {
    totalCalls: metrics.reduce((sum, m) => sum + m._count.id, 0),
    totalAmount: metrics.reduce((sum, m) => sum + Number(m._sum.amountDue || 0), 0),
    byStatus: metrics.reduce((acc, m) => {
      acc[m.status] = {
        count: m._count.id,
        amount: Number(m._sum.amountDue || 0),
      };
      return acc;
    }, {} as Record<string, { count: number; amount: number }>),
  };

  // Store in multi-layer cache
  await CacheService.setMultiLayer(cacheKey, result, 300); // 5 minutes

  return result;
}

/**
 * Get cached user profile
 */
export async function getCachedUserProfile(userId: string) {
  return CacheService.getOrSet(
    `${CacheKey.USER_PROFILE}:${userId}`,
    async () => {
      return db.user.findUnique({
        where: { id: userId },
        include: {
          organization: true,
        },
      });
    },
    3600 // 1 hour (user data changes less frequently)
  );
}

/**
 * Get cached fund list for a user
 */
export async function getCachedFundList(userId: string) {
  return CacheService.getOrSet(
    `${CacheKey.FUND_LIST}:${userId}`,
    async () => {
      const funds = await db.capitalCall.groupBy({
        by: ['fundName'],
        where: { userId },
        _count: { id: true },
        _sum: { amountDue: true },
      });

      return funds.map(f => ({
        name: f.fundName,
        callCount: f._count.id,
        totalAmount: Number(f._sum.amountDue || 0),
      }));
    },
    600 // 10 minutes
  );
}

/**
 * Invalidate all caches for a user
 * Call this when user data changes
 */
export async function invalidateUserCache(userId: string) {
  await Promise.all([
    CacheService.invalidatePattern(`${CacheKey.CAPITAL_CALLS_LIST}:${userId}`),
    CacheService.invalidatePattern(`${CacheKey.DASHBOARD_METRICS}:${userId}`),
    CacheService.invalidatePattern(`${CacheKey.USER_PROFILE}:${userId}`),
    CacheService.invalidatePattern(`${CacheKey.FUND_LIST}:${userId}`),
  ]);
}

/**
 * Invalidate cache when capital call is created/updated
 */
export async function invalidateCapitalCallCache(capitalCallId: string, userId: string) {
  await Promise.all([
    CacheService.del(`${CacheKey.CAPITAL_CALL_DETAIL}:${capitalCallId}`),
    CacheService.invalidateMultiLayer(`${CacheKey.CAPITAL_CALLS_LIST}:${userId}`),
    CacheService.invalidateMultiLayer(`${CacheKey.DASHBOARD_METRICS}:${userId}`),
    CacheService.del(`${CacheKey.FUND_LIST}:${userId}`),
  ]);
}

/**
 * Batch fetch multiple capital calls (more efficient than individual queries)
 */
export async function getCachedCapitalCallsBatch(ids: string[]) {
  const keys = ids.map(id => `${CacheKey.CAPITAL_CALL_DETAIL}:${id}`);
  const cached = await CacheService.mget<any>(keys);

  // Find which IDs need to be fetched
  const missingIndices: number[] = [];
  const missingIds: string[] = [];

  cached.forEach((value, index) => {
    if (value === null) {
      missingIndices.push(index);
      missingIds.push(ids[index]);
    }
  });

  // Fetch missing items from database
  if (missingIds.length > 0) {
    const freshData = await db.capitalCall.findMany({
      where: { id: { in: missingIds } },
      include: {
        document: true,
      },
    });

    // Cache the fresh data
    await Promise.all(
      freshData.map(item =>
        CacheService.set(`${CacheKey.CAPITAL_CALL_DETAIL}:${item.id}`, item, 600)
      )
    );

    // Update the cached array
    freshData.forEach(item => {
      const originalIndex = ids.indexOf(item.id);
      if (originalIndex !== -1) {
        cached[originalIndex] = item;
      }
    });
  }

  return cached.filter(item => item !== null);
}

/**
 * Warm up cache for common queries
 * Can be called during deployment or scheduled periodically
 */
export async function warmupCache(userId: string) {
  console.log(`Warming up cache for user ${userId}`);

  await Promise.all([
    getCachedCapitalCalls(userId),
    getCachedDashboardMetrics(userId),
    getCachedUserProfile(userId),
    getCachedFundList(userId),
  ]);

  console.log(`Cache warmed up for user ${userId}`);
}
