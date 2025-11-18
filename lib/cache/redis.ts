/**
 * Redis Caching Service for Clearway
 * Performance & Scaling Agent - Task PERF-001
 *
 * Multi-layer caching strategy:
 * 1. In-memory cache (fastest, 60s TTL)
 * 2. Redis cache (fast, configurable TTL)
 * 3. Database (fallback)
 */

import Redis from 'ioredis';

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

// Handle Redis connection
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

// Attempt to connect (non-blocking)
redis.connect().catch((err) => {
  console.error('Failed to connect to Redis:', err);
});

/**
 * Cache key prefixes for different data types
 */
export enum CacheKey {
  CAPITAL_CALLS_LIST = 'capital-calls:list',
  CAPITAL_CALL_DETAIL = 'capital-call:detail',
  DASHBOARD_METRICS = 'dashboard:metrics',
  USER_PROFILE = 'user:profile',
  FUND_LIST = 'funds:list',
  ANALYTICS_MONTHLY = 'analytics:monthly',
  ANALYTICS_FUND = 'analytics:fund',
}

/**
 * Redis Caching Service
 * Provides multi-layer caching with automatic fallback
 */
export class CacheService {
  /**
   * Get cached value with automatic JSON parsing
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      if (!cached) return null;

      try {
        return JSON.parse(cached) as T;
      } catch {
        return cached as T;
      }
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  static async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      await redis.setex(key, ttlSeconds, serialized);
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  /**
   * Delete cached value
   */
  static async del(key: string | string[]): Promise<void> {
    try {
      if (Array.isArray(key)) {
        if (key.length > 0) {
          await redis.del(...key);
        }
      } else {
        await redis.del(key);
      }
    } catch (error) {
      console.error('Redis del error:', error);
    }
  }

  /**
   * Get or set pattern - cache-aside strategy
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch from source
    const value = await fetcher();

    // Store in cache for next time
    await this.set(key, value, ttlSeconds);

    return value;
  }

  /**
   * Invalidate cache by pattern
   * Warning: KEYS command can be slow on large datasets
   * Consider using SCAN in production
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis invalidatePattern error:', error);
    }
  }

  /**
   * Multi-layer cache: Redis + In-memory
   * Provides sub-millisecond access for hot data
   */
  private static memoryCache = new Map<string, { value: any; expiresAt: number }>();

  static async getMultiLayer<T>(key: string): Promise<T | null> {
    // Layer 1: Check in-memory cache (fastest, <1ms)
    const memCached = this.memoryCache.get(key);
    if (memCached && memCached.expiresAt > Date.now()) {
      return memCached.value as T;
    }

    // Layer 2: Check Redis (network call, ~1-5ms)
    const redisCached = await this.get<T>(key);
    if (redisCached) {
      // Populate memory cache for next request
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

  /**
   * Invalidate both memory and Redis cache
   */
  static async invalidateMultiLayer(key: string): Promise<void> {
    this.memoryCache.delete(key);
    await this.del(key);
  }

  /**
   * Clear expired items from memory cache (cleanup)
   * Should be called periodically
   */
  static cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    memoryKeys: number;
    redisKeys: number;
    redisInfo?: any;
  }> {
    try {
      const redisInfo = await redis.info('stats');
      const keyCount = await redis.dbsize();

      return {
        memoryKeys: this.memoryCache.size,
        redisKeys: keyCount,
        redisInfo,
      };
    } catch (error) {
      console.error('Redis getStats error:', error);
      return {
        memoryKeys: this.memoryCache.size,
        redisKeys: 0,
      };
    }
  }

  /**
   * Increment a counter (useful for rate limiting, metrics)
   */
  static async increment(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const value = await redis.incr(key);
      if (ttlSeconds && value === 1) {
        await redis.expire(key, ttlSeconds);
      }
      return value;
    } catch (error) {
      console.error('Redis increment error:', error);
      return 0;
    }
  }

  /**
   * Get multiple keys at once (more efficient than multiple get calls)
   */
  static async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (keys.length === 0) return [];

      const values = await redis.mget(...keys);
      return values.map(val => {
        if (!val) return null;
        try {
          return JSON.parse(val) as T;
        } catch {
          return val as T;
        }
      });
    } catch (error) {
      console.error('Redis mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Check if Redis is connected
   */
  static isConnected(): boolean {
    return redis.status === 'ready';
  }
}

// Cleanup memory cache every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    CacheService.cleanupMemoryCache();
  }, 5 * 60 * 1000);
}

export { redis };
export default CacheService;
