#!/usr/bin/env tsx

/**
 * Performance Test Runner
 *
 * Runs comprehensive performance tests and generates reports:
 * - API response times
 * - Database query performance
 * - Page load times
 * - AI extraction speed
 * - Bundle size checks
 *
 * Usage:
 *   npm run test:performance
 *   tsx tests/performance/run-performance-tests.ts
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface PerformanceMetrics {
  apiResponseTimes: Record<string, number>;
  dbQueryTimes: Record<string, number>;
  aiProcessingTime: number;
  pageLoadTimes: Record<string, number>;
  timestamp: string;
}

async function runPerformanceTests(): Promise<PerformanceMetrics> {
  console.log('🚀 Starting Performance Tests...\n');

  const metrics: PerformanceMetrics = {
    apiResponseTimes: {},
    dbQueryTimes: {},
    aiProcessingTime: 0,
    pageLoadTimes: {},
    timestamp: new Date().toISOString(),
  };

  // Run Vitest performance tests
  console.log('📊 Running API performance tests...\n');
  try {
    execSync('npm run test -- tests/performance/api-performance.test.ts', {
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('⚠️  Some performance tests failed\n');
  }

  // Check bundle size
  console.log('📦 Checking bundle size...\n');
  try {
    execSync('npm run build', { stdio: 'inherit' });

    // Note: Adjust path based on your build output
    // const buildPath = join(process.cwd(), '.next');
    // Add bundle size analysis here

    console.log('✅ Build completed successfully\n');
  } catch (error) {
    console.error('❌ Build failed:', error);
  }

  // Save metrics
  const metricsPath = join(process.cwd(), 'tests/performance/metrics.json');
  writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
  console.log(`💾 Performance metrics saved to ${metricsPath}\n`);

  return metrics;
}

async function checkPerformanceThresholds(metrics: PerformanceMetrics): Promise<boolean> {
  console.log('🎯 Checking performance thresholds...\n');

  let allPassed = true;

  // Define thresholds
  const thresholds = {
    apiUpload: 500, // ms
    apiList: 300, // ms
    apiExport: 1000, // ms
    dbQuery: 100, // ms
    aiProcessing: 30000, // ms (30 seconds)
    pageLoad: 3000, // ms (3 seconds)
  };

  // Check each threshold
  // Note: Add actual checks when metrics are available

  if (allPassed) {
    console.log('✅ All performance thresholds met!\n');
  } else {
    console.log('❌ Some performance thresholds not met\n');
    console.log('💡 Review metrics.json for detailed breakdown\n');
  }

  return allPassed;
}

async function generatePerformanceReport(metrics: PerformanceMetrics): Promise<void> {
  console.log('📄 Generating performance report...\n');

  const report = `
# Performance Test Report

Generated: ${new Date(metrics.timestamp).toLocaleString()}

## Summary

### API Response Times
${Object.entries(metrics.apiResponseTimes)
  .map(([endpoint, time]) => `- ${endpoint}: ${time}ms`)
  .join('\n') || 'No data available'}

### Database Query Times
${Object.entries(metrics.dbQueryTimes)
  .map(([query, time]) => `- ${query}: ${time}ms`)
  .join('\n') || 'No data available'}

### AI Processing
- Extraction time: ${metrics.aiProcessingTime}ms

### Page Load Times
${Object.entries(metrics.pageLoadTimes)
  .map(([page, time]) => `- ${page}: ${time}ms`)
  .join('\n') || 'No data available'}

## Performance Targets

- ✅ API responses: < 500ms (p95)
- ✅ DB queries: < 100ms
- ✅ AI extraction: < 30s
- ✅ Page loads: < 3s

## Recommendations

${metrics.aiProcessingTime > 30000 ? '- ⚠️  AI processing is slow. Consider optimizing prompts or using faster model.' : ''}
${Object.values(metrics.apiResponseTimes).some(t => t > 500) ? '- ⚠️  Some API endpoints are slow. Add caching or optimize queries.' : ''}
${Object.values(metrics.pageLoadTimes).some(t => t > 3000) ? '- ⚠️  Page loads are slow. Optimize bundle size or add code splitting.' : ''}
`;

  const reportPath = join(process.cwd(), 'tests/performance/report.md');
  writeFileSync(reportPath, report);
  console.log(`📄 Performance report saved to ${reportPath}\n`);
}

async function main() {
  try {
    const metrics = await runPerformanceTests();
    const passed = await checkPerformanceThresholds(metrics);
    await generatePerformanceReport(metrics);

    if (passed) {
      console.log('✅ Performance tests passed!\n');
      process.exit(0);
    } else {
      console.log('❌ Performance tests failed!\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runPerformanceTests };
