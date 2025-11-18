/**
 * Cache Module - Index
 * Performance & Scaling Agent - Task PERF-001
 */

export { CacheService, CacheKey, redis } from './redis';
export {
  getCachedCapitalCalls,
  getCachedCapitalCall,
  getCachedDashboardMetrics,
  getCachedUserProfile,
  getCachedFundList,
  invalidateUserCache,
  invalidateCapitalCallCache,
  getCachedCapitalCallsBatch,
  warmupCache,
} from './helpers';
