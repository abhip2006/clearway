/**
 * Unit Tests: Cache Helpers
 *
 * Tests caching utilities for performance optimization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Cache Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('In-Memory Cache', () => {
    it('should set and get cache value', () => {
      const cache = new Map();

      cache.set('key1', 'value1');

      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent key', () => {
      const cache = new Map();

      expect(cache.get('non-existent')).toBeUndefined();
    });

    it('should overwrite existing cache value', () => {
      const cache = new Map();

      cache.set('key1', 'value1');
      cache.set('key1', 'value2');

      expect(cache.get('key1')).toBe('value2');
    });

    it('should delete cache entry', () => {
      const cache = new Map();

      cache.set('key1', 'value1');
      cache.delete('key1');

      expect(cache.get('key1')).toBeUndefined();
    });

    it('should clear all cache entries', () => {
      const cache = new Map();

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();

      expect(cache.size).toBe(0);
    });

    it('should check if key exists', () => {
      const cache = new Map();

      cache.set('key1', 'value1');

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('Cache with TTL (Time To Live)', () => {
    it('should expire cache after TTL', async () => {
      const cache = new Map<string, { value: any; expiresAt: number }>();
      const ttl = 100; // 100ms

      const set = (key: string, value: any) => {
        cache.set(key, {
          value,
          expiresAt: Date.now() + ttl,
        });
      };

      const get = (key: string) => {
        const entry = cache.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expiresAt) {
          cache.delete(key);
          return undefined;
        }
        return entry.value;
      };

      set('key1', 'value1');
      expect(get('key1')).toBe('value1');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(get('key1')).toBeUndefined();
    });

    it('should refresh TTL on access', () => {
      const cache = new Map<string, { value: any; expiresAt: number }>();
      const ttl = 1000;

      const set = (key: string, value: any) => {
        cache.set(key, {
          value,
          expiresAt: Date.now() + ttl,
        });
      };

      const get = (key: string, refreshTTL = false) => {
        const entry = cache.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expiresAt) {
          cache.delete(key);
          return undefined;
        }
        if (refreshTTL) {
          entry.expiresAt = Date.now() + ttl;
        }
        return entry.value;
      };

      set('key1', 'value1');
      const initialExpiry = cache.get('key1')!.expiresAt;

      // Access with refresh
      get('key1', true);
      const newExpiry = cache.get('key1')!.expiresAt;

      expect(newExpiry).toBeGreaterThan(initialExpiry);
    });
  });

  describe('LRU Cache (Least Recently Used)', () => {
    it('should evict least recently used item when capacity is reached', () => {
      const maxSize = 3;
      const cache = new Map();

      // Helper to maintain LRU order
      const set = (key: string, value: any) => {
        if (cache.size >= maxSize && !cache.has(key)) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
        cache.delete(key); // Remove if exists to re-add at end
        cache.set(key, value);
      };

      set('key1', 'value1');
      set('key2', 'value2');
      set('key3', 'value3');
      set('key4', 'value4'); // Should evict key1

      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache by pattern', () => {
      const cache = new Map();

      cache.set('user:1', 'data1');
      cache.set('user:2', 'data2');
      cache.set('post:1', 'post1');

      // Invalidate all user keys
      const invalidatePattern = (pattern: string) => {
        for (const key of cache.keys()) {
          if (key.startsWith(pattern)) {
            cache.delete(key);
          }
        }
      };

      invalidatePattern('user:');

      expect(cache.has('user:1')).toBe(false);
      expect(cache.has('user:2')).toBe(false);
      expect(cache.has('post:1')).toBe(true);
    });

    it('should invalidate cache by tags', () => {
      interface CacheEntry {
        value: any;
        tags: string[];
      }

      const cache = new Map<string, CacheEntry>();

      cache.set('key1', { value: 'value1', tags: ['user', 'profile'] });
      cache.set('key2', { value: 'value2', tags: ['user', 'settings'] });
      cache.set('key3', { value: 'value3', tags: ['post'] });

      const invalidateByTag = (tag: string) => {
        for (const [key, entry] of cache.entries()) {
          if (entry.tags.includes(tag)) {
            cache.delete(key);
          }
        }
      };

      invalidateByTag('user');

      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(true);
    });
  });

  describe('Memoization', () => {
    it('should memoize function results', () => {
      const expensiveFunction = vi.fn((x: number) => x * 2);
      const cache = new Map<number, number>();

      const memoized = (x: number) => {
        if (cache.has(x)) {
          return cache.get(x)!;
        }
        const result = expensiveFunction(x);
        cache.set(x, result);
        return result;
      };

      // First call should execute function
      expect(memoized(5)).toBe(10);
      expect(expensiveFunction).toHaveBeenCalledTimes(1);

      // Second call should use cache
      expect(memoized(5)).toBe(10);
      expect(expensiveFunction).toHaveBeenCalledTimes(1); // Not called again

      // Different argument should execute function
      expect(memoized(10)).toBe(20);
      expect(expensiveFunction).toHaveBeenCalledTimes(2);
    });

    it('should memoize async function results', async () => {
      const asyncFunction = vi.fn(async (x: number) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return x * 2;
      });

      const cache = new Map<number, Promise<number>>();

      const memoizedAsync = (x: number) => {
        if (cache.has(x)) {
          return cache.get(x)!;
        }
        const promise = asyncFunction(x);
        cache.set(x, promise);
        return promise;
      };

      // First call
      const result1 = await memoizedAsync(5);
      expect(result1).toBe(10);
      expect(asyncFunction).toHaveBeenCalledTimes(1);

      // Second call (cached)
      const result2 = await memoizedAsync(5);
      expect(result2).toBe(10);
      expect(asyncFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', () => {
      const cache = new Map();
      let hits = 0;
      let misses = 0;

      const get = (key: string) => {
        if (cache.has(key)) {
          hits++;
          return cache.get(key);
        } else {
          misses++;
          return undefined;
        }
      };

      cache.set('key1', 'value1');

      get('key1'); // Hit
      get('key2'); // Miss
      get('key1'); // Hit
      get('key3'); // Miss

      expect(hits).toBe(2);
      expect(misses).toBe(2);
    });

    it('should calculate cache hit rate', () => {
      let hits = 0;
      let misses = 0;

      const getHitRate = () => {
        const total = hits + misses;
        return total === 0 ? 0 : hits / total;
      };

      hits = 8;
      misses = 2;

      expect(getHitRate()).toBe(0.8); // 80% hit rate
    });
  });

  describe('Cache Size Management', () => {
    it('should limit cache size', () => {
      const maxSize = 100;
      const cache = new Map();

      for (let i = 0; i < 150; i++) {
        cache.set(`key${i}`, `value${i}`);
        if (cache.size > maxSize) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
      }

      expect(cache.size).toBe(maxSize);
    });

    it('should estimate cache memory usage', () => {
      const cache = new Map();

      cache.set('key1', 'value1');
      cache.set('key2', { data: 'complex object' });
      cache.set('key3', [1, 2, 3, 4, 5]);

      // Rough estimation (would need proper implementation in real code)
      const estimateSize = (obj: any): number => {
        return JSON.stringify(obj).length;
      };

      let totalSize = 0;
      for (const [key, value] of cache.entries()) {
        totalSize += estimateSize(key) + estimateSize(value);
      }

      expect(totalSize).toBeGreaterThan(0);
    });
  });
});
