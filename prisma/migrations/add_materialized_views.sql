-- Performance & Scaling Agent - Task PERF-002
-- Materialized Views for Analytics
-- These views improve query performance for analytics dashboards

-- Drop existing views if they exist
DROP MATERIALIZED VIEW IF EXISTS monthly_call_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS fund_performance_summary CASCADE;

-- ============================================
-- Monthly Call Summary
-- Aggregates capital calls by month and user
-- Updated: Hourly (via cron job)
-- ============================================
CREATE MATERIALIZED VIEW monthly_call_summary AS
SELECT
  DATE_TRUNC('month', "dueDate") as month,
  "userId",
  COUNT(*) as call_count,
  SUM("amountDue") as total_amount,
  AVG("amountDue") as avg_amount,
  COUNT(*) FILTER (WHERE status = 'PAID') as paid_count,
  COUNT(*) FILTER (WHERE status = 'APPROVED') as approved_count,
  COUNT(*) FILTER (WHERE status = 'PENDING_REVIEW') as pending_count
FROM "CapitalCall"
GROUP BY DATE_TRUNC('month', "dueDate"), "userId";

-- Create indexes for fast lookups
CREATE INDEX idx_monthly_summary_user_month
  ON monthly_call_summary(month DESC, "userId");

CREATE INDEX idx_monthly_summary_user
  ON monthly_call_summary("userId");

-- ============================================
-- Fund Performance Summary
-- Aggregates metrics by fund and user
-- Updated: Hourly (via cron job)
-- ============================================
CREATE MATERIALIZED VIEW fund_performance_summary AS
SELECT
  "fundName",
  "userId",
  COUNT(*) as total_calls,
  SUM("amountDue") as total_amount,
  AVG("amountDue") as avg_amount,
  -- Calculate average days to payment (for paid calls only)
  AVG(
    CASE
      WHEN status = 'PAID' AND "approvedAt" IS NOT NULL
      THEN EXTRACT(EPOCH FROM ("approvedAt" - "createdAt")) / 86400
      ELSE NULL
    END
  ) as avg_days_to_payment,
  -- Calculate on-time payment rate
  CASE
    WHEN COUNT(*) FILTER (WHERE status = 'PAID') > 0
    THEN (
      COUNT(*) FILTER (WHERE status = 'PAID' AND "approvedAt" <= "dueDate")::float /
      COUNT(*) FILTER (WHERE status = 'PAID')::float
    )
    ELSE NULL
  END as on_time_rate,
  -- Status breakdown
  COUNT(*) FILTER (WHERE status = 'PAID') as paid_count,
  COUNT(*) FILTER (WHERE status = 'APPROVED') as approved_count,
  COUNT(*) FILTER (WHERE status = 'PENDING_REVIEW') as pending_count,
  COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected_count
FROM "CapitalCall"
GROUP BY "fundName", "userId";

-- Create indexes for fast lookups
CREATE INDEX idx_fund_summary_user
  ON fund_performance_summary("userId");

CREATE INDEX idx_fund_summary_fund
  ON fund_performance_summary("fundName");

CREATE INDEX idx_fund_summary_user_fund
  ON fund_performance_summary("userId", "fundName");

-- ============================================
-- Additional Indexes on Base Tables
-- These improve query performance for common patterns
-- ============================================

-- Composite index for user + status queries
CREATE INDEX IF NOT EXISTS idx_capital_call_user_status
  ON "CapitalCall"("userId", status);

-- Composite index for user + dueDate queries
CREATE INDEX IF NOT EXISTS idx_capital_call_user_duedate
  ON "CapitalCall"("userId", "dueDate" DESC);

-- Composite index for user + fundName queries
CREATE INDEX IF NOT EXISTS idx_capital_call_user_fund
  ON "CapitalCall"("userId", "fundName");

-- Index for amount range queries
CREATE INDEX IF NOT EXISTS idx_capital_call_amount
  ON "CapitalCall"("amountDue");

-- Index for date range queries on approvedAt
CREATE INDEX IF NOT EXISTS idx_capital_call_approved_at
  ON "CapitalCall"("approvedAt") WHERE "approvedAt" IS NOT NULL;

-- Composite index for document lookups
CREATE INDEX IF NOT EXISTS idx_document_user_status
  ON "Document"("userId", status);

-- Composite index for organization documents
CREATE INDEX IF NOT EXISTS idx_document_org_uploaded
  ON "Document"("organizationId", "uploadedAt" DESC)
  WHERE "organizationId" IS NOT NULL;

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON MATERIALIZED VIEW monthly_call_summary IS
  'Aggregated capital call metrics by month and user. Refreshed hourly.';

COMMENT ON MATERIALIZED VIEW fund_performance_summary IS
  'Fund performance metrics including payment rates and response times. Refreshed hourly.';

-- ============================================
-- Refresh Function
-- Call this to update the materialized views
-- ============================================

-- Note: In production, set up a cron job or scheduled task to run:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_call_summary;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY fund_performance_summary;
