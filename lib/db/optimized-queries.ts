/**
 * Optimized Database Queries
 * Performance & Scaling Agent - Task PERF-002
 *
 * This file contains hand-optimized SQL queries for performance-critical operations.
 * Uses raw SQL with proper indexing for complex queries.
 */

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * Parameters for optimized capital calls query
 */
export interface GetCapitalCallsParams {
  userId: string;
  status?: string[];
  fundNames?: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Optimized capital calls query with proper indexing
 * Uses raw SQL to avoid N+1 queries and optimize joins
 */
export async function getCapitalCallsOptimized(params: GetCapitalCallsParams) {
  const {
    userId,
    status,
    fundNames,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = params;

  // Build dynamic WHERE clause
  const conditions: string[] = [`cc."userId" = '${userId}'`];

  if (status && status.length > 0) {
    const statusList = status.map(s => `'${s}'`).join(', ');
    conditions.push(`cc.status IN (${statusList})`);
  }

  if (fundNames && fundNames.length > 0) {
    const fundList = fundNames.map(f => `'${f.replace(/'/g, "''")}'`).join(', ');
    conditions.push(`cc."fundName" IN (${fundList})`);
  }

  if (startDate) {
    conditions.push(`cc."dueDate" >= '${startDate.toISOString()}'`);
  }

  if (endDate) {
    conditions.push(`cc."dueDate" <= '${endDate.toISOString()}'`);
  }

  const whereClause = conditions.join(' AND ');

  // Execute optimized query with subquery for document data
  const result = await db.$queryRawUnsafe<any[]>(`
    SELECT
      cc.*,
      json_build_object(
        'id', d.id,
        'fileName', d."fileName",
        'fileUrl', d."fileUrl",
        'mimeType', d."mimeType",
        'uploadedAt', d."uploadedAt"
      ) as document
    FROM "CapitalCall" cc
    LEFT JOIN "Document" d ON d.id = cc."documentId"
    WHERE ${whereClause}
    ORDER BY cc."dueDate" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  return result;
}

/**
 * Get total count for pagination (optimized)
 */
export async function getCapitalCallsCount(params: GetCapitalCallsParams): Promise<number> {
  const { userId, status, fundNames, startDate, endDate } = params;

  const conditions: string[] = [`"userId" = '${userId}'`];

  if (status && status.length > 0) {
    const statusList = status.map(s => `'${s}'`).join(', ');
    conditions.push(`status IN (${statusList})`);
  }

  if (fundNames && fundNames.length > 0) {
    const fundList = fundNames.map(f => `'${f.replace(/'/g, "''")}'`).join(', ');
    conditions.push(`"fundName" IN (${fundList})`);
  }

  if (startDate) {
    conditions.push(`"dueDate" >= '${startDate.toISOString()}'`);
  }

  if (endDate) {
    conditions.push(`"dueDate" <= '${endDate.toISOString()}'`);
  }

  const whereClause = conditions.join(' AND ');

  const result = await db.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM "CapitalCall" WHERE ${whereClause}`
  );

  return Number(result[0].count);
}

/**
 * Dashboard metrics with single optimized query
 * Replaces multiple round trips with one query using CTEs
 */
export async function getDashboardMetricsOptimized(userId: string) {
  const result = await db.$queryRaw<
    Array<{
      total_calls: number;
      total_amount: Prisma.Decimal;
      avg_response_hours: number | null;
      upcoming_count: number;
      overdue_count: number;
      payment_rate: number | null;
    }>
  >`
    WITH stats AS (
      SELECT
        COUNT(*)::int as total_calls,
        COALESCE(SUM("amountDue"), 0) as total_amount,
        AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_response_hours,
        COUNT(*) FILTER (
          WHERE status = 'APPROVED'
          AND "dueDate" BETWEEN NOW() AND NOW() + INTERVAL '30 days'
        )::int as upcoming_count,
        COUNT(*) FILTER (
          WHERE status = 'APPROVED'
          AND "dueDate" < NOW()
        )::int as overdue_count,
        (
          COUNT(*) FILTER (WHERE status = 'PAID')::float /
          NULLIF(COUNT(*)::float, 0)
        ) * 100 as payment_rate
      FROM "CapitalCall"
      WHERE "userId" = ${userId}
    )
    SELECT * FROM stats
  `;

  if (result.length === 0) {
    return {
      total_calls: 0,
      total_amount: 0,
      avg_response_hours: 0,
      upcoming_count: 0,
      overdue_count: 0,
      payment_rate: 0,
    };
  }

  return {
    ...result[0],
    total_amount: Number(result[0].total_amount),
    avg_response_hours: result[0].avg_response_hours || 0,
    payment_rate: result[0].payment_rate || 0,
  };
}

/**
 * Get fund performance summary (optimized aggregation)
 */
export async function getFundPerformanceOptimized(userId: string) {
  const result = await db.$queryRaw<
    Array<{
      fund_name: string;
      total_calls: number;
      total_amount: Prisma.Decimal;
      avg_amount: Prisma.Decimal;
      pending_count: number;
      approved_count: number;
      paid_count: number;
    }>
  >`
    SELECT
      "fundName" as fund_name,
      COUNT(*)::int as total_calls,
      COALESCE(SUM("amountDue"), 0) as total_amount,
      COALESCE(AVG("amountDue"), 0) as avg_amount,
      COUNT(*) FILTER (WHERE status = 'PENDING_REVIEW')::int as pending_count,
      COUNT(*) FILTER (WHERE status = 'APPROVED')::int as approved_count,
      COUNT(*) FILTER (WHERE status = 'PAID')::int as paid_count
    FROM "CapitalCall"
    WHERE "userId" = ${userId}
    GROUP BY "fundName"
    ORDER BY total_amount DESC
  `;

  return result.map(r => ({
    ...r,
    total_amount: Number(r.total_amount),
    avg_amount: Number(r.avg_amount),
  }));
}

/**
 * Get recent activity with efficient pagination
 */
export async function getRecentActivityOptimized(
  userId: string,
  limit: number = 20,
  offset: number = 0
) {
  const result = await db.$queryRaw<
    Array<{
      id: string;
      type: string;
      fund_name: string;
      amount: Prisma.Decimal;
      status: string;
      due_date: Date;
      created_at: Date;
    }>
  >`
    SELECT
      cc.id,
      'CAPITAL_CALL' as type,
      cc."fundName" as fund_name,
      cc."amountDue" as amount,
      cc.status,
      cc."dueDate" as due_date,
      cc."createdAt" as created_at
    FROM "CapitalCall" cc
    WHERE cc."userId" = ${userId}
    ORDER BY cc."createdAt" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return result.map(r => ({
    ...r,
    amount: Number(r.amount),
  }));
}

/**
 * Refresh materialized views
 * Should be run on a schedule (e.g., hourly via cron job)
 */
export async function refreshAnalyticsMaterializedViews() {
  try {
    // Refresh monthly summary view
    await db.$executeRaw`
      REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_call_summary
    `;

    // Refresh fund performance view
    await db.$executeRaw`
      REFRESH MATERIALIZED VIEW CONCURRENTLY fund_performance_summary
    `;

    console.log('Materialized views refreshed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error refreshing materialized views:', error);
    return { success: false, error };
  }
}

/**
 * Query materialized view for monthly analytics
 */
export async function getMonthlyAnalytics(userId: string, months: number = 12) {
  const result = await db.$queryRaw<
    Array<{
      month: Date;
      call_count: number;
      total_amount: Prisma.Decimal;
      avg_amount: Prisma.Decimal;
      paid_count: number;
    }>
  >`
    SELECT
      month,
      call_count,
      total_amount,
      avg_amount,
      paid_count
    FROM monthly_call_summary
    WHERE "userId" = ${userId}
      AND month >= DATE_TRUNC('month', NOW() - INTERVAL '${months} months')
    ORDER BY month DESC
  `;

  return result.map(r => ({
    ...r,
    total_amount: Number(r.total_amount),
    avg_amount: Number(r.avg_amount),
  }));
}

/**
 * Query materialized view for fund performance
 */
export async function getFundAnalytics(userId: string) {
  const result = await db.$queryRaw<
    Array<{
      fund_name: string;
      total_calls: number;
      total_amount: Prisma.Decimal;
      avg_days_to_payment: number | null;
      on_time_rate: number | null;
    }>
  >`
    SELECT
      "fundName" as fund_name,
      total_calls,
      total_amount,
      avg_days_to_payment,
      on_time_rate
    FROM fund_performance_summary
    WHERE "userId" = ${userId}
    ORDER BY total_amount DESC
  `;

  return result.map(r => ({
    ...r,
    total_amount: Number(r.total_amount),
    avg_days_to_payment: r.avg_days_to_payment || 0,
    on_time_rate: r.on_time_rate || 0,
  }));
}

/**
 * Bulk update operation (more efficient than individual updates)
 */
export async function bulkUpdateCapitalCallStatus(
  ids: string[],
  status: string,
  userId: string
) {
  if (ids.length === 0) return { updated: 0 };

  const idList = ids.map(id => `'${id}'`).join(', ');

  const result = await db.$executeRawUnsafe(`
    UPDATE "CapitalCall"
    SET status = '${status}', "updatedAt" = NOW()
    WHERE id IN (${idList})
      AND "userId" = '${userId}'
  `);

  return { updated: result };
}

/**
 * Get database statistics for monitoring
 */
export async function getDatabaseStats() {
  const result = await db.$queryRaw<
    Array<{
      table_name: string;
      row_count: bigint;
      total_size: string;
      index_size: string;
    }>
  >`
    SELECT
      schemaname || '.' || tablename as table_name,
      n_live_tup as row_count,
      pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size,
      pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename)) as index_size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
  `;

  return result.map(r => ({
    ...r,
    row_count: Number(r.row_count),
  }));
}
