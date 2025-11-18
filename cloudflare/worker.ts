/**
 * Cloudflare Workers for Edge Caching
 * Performance & Scaling Agent - Task PERF-003
 *
 * This worker provides edge caching for API responses and static assets
 * at Cloudflare's global CDN locations.
 *
 * Deploy with: wrangler deploy
 */

export interface Env {
  // KV namespace for edge caching
  EDGE_CACHE: KVNamespace;

  // Environment variables
  API_URL: string;
  CACHE_VERSION: string;
}

/**
 * Cache configuration for different route patterns
 */
const CACHE_CONFIG = {
  // Public API routes - cache for 1 hour
  '/api/public/': {
    ttl: 3600,
    cacheControl: 'public, max-age=3600',
    cacheable: true,
  },
  // Analytics endpoints - cache for 5 minutes
  '/api/analytics/': {
    ttl: 300,
    cacheControl: 'public, max-age=300',
    cacheable: true,
  },
  // Static assets - cache for 1 year
  '/static/': {
    ttl: 31536000,
    cacheControl: 'public, max-age=31536000, immutable',
    cacheable: true,
  },
  // Next.js static files - cache for 1 year
  '/_next/static/': {
    ttl: 31536000,
    cacheControl: 'public, max-age=31536000, immutable',
    cacheable: true,
  },
  // Images - cache for 24 hours
  '/_next/image': {
    ttl: 86400,
    cacheControl: 'public, max-age=86400',
    cacheable: true,
  },
};

/**
 * Get cache configuration for a URL path
 */
function getCacheConfig(pathname: string) {
  for (const [pattern, config] of Object.entries(CACHE_CONFIG)) {
    if (pathname.startsWith(pattern)) {
      return config;
    }
  }
  return null;
}

/**
 * Generate cache key from request
 */
function generateCacheKey(request: Request, cacheVersion: string): string {
  const url = new URL(request.url);
  const cacheKey = `${cacheVersion}:${url.pathname}${url.search}`;
  return cacheKey;
}

/**
 * Main worker handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const cacheConfig = getCacheConfig(url.pathname);

    // If route is not cacheable, pass through
    if (!cacheConfig?.cacheable) {
      return fetch(request);
    }

    // Only cache GET requests
    if (request.method !== 'GET') {
      return fetch(request);
    }

    // Try Cloudflare cache first
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);

    let response = await cache.match(cacheKey);

    if (response) {
      // Cache hit - add header to indicate
      const headers = new Headers(response.headers);
      headers.set('CF-Cache-Status', 'HIT');
      headers.set('X-Cache', 'HIT');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    // Cache miss - fetch from origin
    response = await fetch(request);

    // Only cache successful responses
    if (response.status === 200) {
      // Clone the response for caching
      const responseToCache = response.clone();
      const headers = new Headers(responseToCache.headers);

      // Add cache headers
      headers.set('Cache-Control', cacheConfig.cacheControl);
      headers.set('CF-Cache-Status', 'MISS');
      headers.set('X-Cache', 'MISS');
      headers.set('CDN-Cache-Control', cacheConfig.cacheControl);

      // Add CORS headers for API routes
      if (url.pathname.startsWith('/api/')) {
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        headers.set('Access-Control-Max-Age', '86400');
      }

      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers,
      });

      // Store in cache (don't await - let it happen in background)
      ctx.waitUntil(cache.put(cacheKey, cachedResponse.clone()));

      return cachedResponse;
    }

    // Don't cache error responses
    return response;
  },
};
