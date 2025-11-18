/**
 * Caching Strategy for Clearway MVP
 *
 * This file defines caching configurations and utilities for the application.
 *
 * Caching Layers:
 * 1. Next.js Static Site Generation (SSG) - For marketing pages
 * 2. Next.js Incremental Static Regeneration (ISR) - For semi-static content
 * 3. API Response Caching - For frequently accessed data
 * 4. Edge Caching - Via Vercel Edge Network
 */

/**
 * Cache durations in seconds
 */
export const CacheDurations = {
  // No caching - for sensitive or real-time data
  NONE: 0,

  // Short cache - 5 minutes for frequently changing data
  SHORT: 300,

  // Medium cache - 1 hour for semi-static data
  MEDIUM: 3600,

  // Long cache - 24 hours for mostly static data
  LONG: 86400,

  // Week cache - 7 days for static assets
  WEEK: 604800,
} as const;

/**
 * Cache-Control header builder
 *
 * @param duration - Cache duration in seconds
 * @param isPrivate - Whether cache is private (user-specific) or public
 * @param revalidate - Enable stale-while-revalidate
 */
export function getCacheControl(
  duration: number,
  isPrivate: boolean = true,
  revalidate: boolean = false
): string {
  if (duration === 0) {
    return 'no-store, no-cache, must-revalidate';
  }

  const visibility = isPrivate ? 'private' : 'public';
  const maxAge = `max-age=${duration}`;
  const swr = revalidate ? `, stale-while-revalidate=${duration}` : '';

  return `${visibility}, ${maxAge}${swr}`;
}

/**
 * Standard cache headers for API responses
 */
export const CacheHeaders = {
  // No caching for sensitive data
  noCache: () => ({
    'Cache-Control': getCacheControl(CacheDurations.NONE),
  }),

  // 5 minutes cache for frequently changing data
  short: (isPrivate: boolean = true) => ({
    'Cache-Control': getCacheControl(CacheDurations.SHORT, isPrivate, true),
  }),

  // 1 hour cache for semi-static data
  medium: (isPrivate: boolean = true) => ({
    'Cache-Control': getCacheControl(CacheDurations.MEDIUM, isPrivate, true),
  }),

  // 24 hours cache for static data
  long: (isPrivate: boolean = true) => ({
    'Cache-Control': getCacheControl(CacheDurations.LONG, isPrivate, true),
  }),
} as const;
