/**
 * Lighthouse CI Configuration
 *
 * Runs Lighthouse performance audits on key pages to ensure:
 * - Fast page loads (< 3s)
 * - Good Core Web Vitals
 * - Accessibility compliance
 * - SEO best practices
 *
 * Usage:
 *   npm install -g @lhci/cli
 *   lhci autorun
 */

module.exports = {
  ci: {
    collect: {
      // URLs to test
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/upload',
        'http://localhost:3000/dashboard/calendar',
      ],
      // Run multiple times for consistency
      numberOfRuns: 3,
      // Start dev server before testing
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'Ready',
      startServerReadyTimeout: 60000,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance budgets
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }], // 1.5s
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // 2.5s
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }], // 300ms
        'speed-index': ['error', { maxNumericValue: 3000 }], // 3s

        // Core Web Vitals
        'interactive': ['error', { maxNumericValue: 3000 }], // 3s
        'max-potential-fid': ['error', { maxNumericValue: 100 }], // 100ms

        // Overall scores
        'categories:performance': ['warn', { minScore: 0.9 }], // 90%
        'categories:accessibility': ['warn', { minScore: 0.9 }], // 90%
        'categories:best-practices': ['warn', { minScore: 0.9 }], // 90%
        'categories:seo': ['warn', { minScore: 0.9 }], // 90%

        // Resource budgets
        'resource-summary:script:size': ['warn', { maxNumericValue: 500000 }], // 500KB JS
        'resource-summary:stylesheet:size': ['warn', { maxNumericValue: 100000 }], // 100KB CSS
        'resource-summary:image:size': ['warn', { maxNumericValue: 200000 }], // 200KB images
        'resource-summary:font:size': ['warn', { maxNumericValue: 100000 }], // 100KB fonts

        // Accessibility
        'color-contrast': 'error',
        'image-alt': 'warn',
        'label': 'warn',
        'button-name': 'warn',
        'link-name': 'warn',

        // Best practices
        'errors-in-console': 'warn',
        'uses-https': 'error',
        'uses-http2': 'warn',
      },
    },
    upload: {
      // Upload results to temporary storage for viewing
      target: 'temporary-public-storage',
    },
  },
};
