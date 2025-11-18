/**
 * Refresh Materialized Views Script
 * Performance & Scaling Agent - Task PERF-002
 *
 * Run this script on a schedule (e.g., hourly via cron) to keep
 * materialized views up to date.
 *
 * Usage:
 *   tsx scripts/refresh-materialized-views.ts
 */

import { refreshAnalyticsMaterializedViews } from '@/lib/db/optimized-queries';

async function main() {
  console.log('Starting materialized views refresh...');
  console.log('Timestamp:', new Date().toISOString());

  try {
    const result = await refreshAnalyticsMaterializedViews();

    if (result.success) {
      console.log('✅ Materialized views refreshed successfully');
      process.exit(0);
    } else {
      console.error('❌ Failed to refresh materialized views:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error refreshing materialized views:', error);
    process.exit(1);
  }
}

main();
