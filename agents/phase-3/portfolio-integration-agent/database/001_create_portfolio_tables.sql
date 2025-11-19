-- Portfolio Integration Agent - Database Schema Migration
-- Phase 3: Weeks 29-32
-- Creates all necessary tables for portfolio integration functionality

-- ==========================================
-- Portfolio Connections Table
-- ==========================================
CREATE TABLE IF NOT EXISTS portfolio_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('BLACK_DIAMOND', 'ORION', 'ADDEPAR')),
  account_id VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'CONNECTING' CHECK (status IN ('CONNECTING', 'CONNECTED', 'DISCONNECTED', 'ERROR', 'SYNC_FAILED')),

  -- OAuth credentials (encrypted at application level)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  oauth_scope TEXT,

  -- Sync metadata
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_successful_sync_at TIMESTAMP WITH TIME ZONE,
  next_scheduled_sync_at TIMESTAMP WITH TIME ZONE,
  sync_frequency_minutes INTEGER DEFAULT 360,

  -- Settings
  auto_sync BOOLEAN DEFAULT true,
  bidirectional_sync BOOLEAN DEFAULT false,
  conflict_resolution VARCHAR(50) DEFAULT 'MANUAL_REVIEW' CHECK (conflict_resolution IN ('CLEARWAY_WINS', 'PLATFORM_WINS', 'MANUAL_REVIEW', 'MERGE', 'TIMESTAMP')),
  included_asset_classes TEXT[],
  excluded_securities TEXT[],
  min_holding_value DECIMAL(19,4),

  -- Statistics
  total_transactions_synced INTEGER DEFAULT 0,
  last_error_message TEXT,
  error_count INTEGER DEFAULT 0,
  sync_success_rate DECIMAL(5,4),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_user_platform_account UNIQUE(user_id, platform, account_id)
);

CREATE INDEX idx_portfolio_connections_user_platform ON portfolio_connections(user_id, platform);
CREATE INDEX idx_portfolio_connections_status ON portfolio_connections(status);
CREATE INDEX idx_portfolio_connections_next_sync ON portfolio_connections(next_scheduled_sync_at) WHERE status = 'CONNECTED';

-- ==========================================
-- Portfolios Table
-- ==========================================
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  total_value DECIMAL(19,4),
  base_currency VARCHAR(10) DEFAULT 'USD',

  sync_status VARCHAR(50) DEFAULT 'SYNCED' CHECK (sync_status IN ('SYNCING', 'SYNCED', 'PARTIAL', 'FAILED')),
  consolidation_status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (consolidation_status IN ('ACTIVE', 'PENDING', 'FAILED')),

  -- Portfolio settings
  include_all_connections BOOLEAN DEFAULT false,
  weighted_average_method VARCHAR(50),
  rebalancing_threshold DECIMAL(5,2),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);

-- ==========================================
-- Portfolio Connection Mappings
-- ==========================================
CREATE TABLE IF NOT EXISTS portfolio_connection_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES portfolio_connections(id) ON DELETE CASCADE,
  weight DECIMAL(5,2),
  include_in_totals BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_portfolio_connection UNIQUE(portfolio_id, connection_id)
);

CREATE INDEX idx_portfolio_connection_mappings_portfolio ON portfolio_connection_mappings(portfolio_id);
CREATE INDEX idx_portfolio_connection_mappings_connection ON portfolio_connection_mappings(connection_id);

-- ==========================================
-- Holdings Table
-- ==========================================
CREATE TABLE IF NOT EXISTS holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  security_id VARCHAR(100) NOT NULL,
  ticker VARCHAR(20),
  isin VARCHAR(20),
  cusip VARCHAR(20),
  security_name VARCHAR(255),

  quantity DECIMAL(19,8) NOT NULL,
  market_value DECIMAL(19,4) NOT NULL,
  cost_basis DECIMAL(19,4),
  unrealized_gain DECIMAL(19,4),
  percent_of_portfolio DECIMAL(5,2),

  currency VARCHAR(10) DEFAULT 'USD',
  asset_class VARCHAR(50),

  last_updated TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_portfolio_security UNIQUE(portfolio_id, security_id)
);

CREATE INDEX idx_holdings_portfolio_security ON holdings(portfolio_id, security_id);
CREATE INDEX idx_holdings_updated ON holdings(updated_at DESC);
CREATE INDEX idx_holdings_portfolio_updated ON holdings(portfolio_id, updated_at DESC);
CREATE INDEX idx_holdings_ticker ON holdings(ticker);

-- ==========================================
-- Source Holdings (Multi-platform tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS source_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holding_id UUID NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES portfolio_connections(id) ON DELETE CASCADE,

  platform_holding_id VARCHAR(255) NOT NULL,
  platform_account_id VARCHAR(255),

  quantity DECIMAL(19,8) NOT NULL,
  market_value DECIMAL(19,4) NOT NULL,
  cost_basis DECIMAL(19,4),

  confidence DECIMAL(3,2),

  last_synced_at TIMESTAMP WITH TIME ZONE,
  platform_last_updated TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_holding_connection UNIQUE(holding_id, connection_id)
);

CREATE INDEX idx_source_holdings_holding_connection ON source_holdings(holding_id, connection_id);
CREATE INDEX idx_source_holdings_platform_id ON source_holdings(connection_id, platform_holding_id);
CREATE INDEX idx_source_holdings_sync ON source_holdings(connection_id, last_synced_at);

-- ==========================================
-- Transactions Table
-- ==========================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  security_id VARCHAR(100) NOT NULL,

  transaction_date DATE NOT NULL,
  settlement_date DATE,

  type VARCHAR(50) NOT NULL CHECK (type IN ('BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'FEE', 'TRANSFER')),
  quantity DECIMAL(19,8),
  price DECIMAL(19,8),
  amount DECIMAL(19,4) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  fee DECIMAL(19,4),
  description TEXT,

  status VARCHAR(50) DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_portfolio_date ON transactions(portfolio_id, transaction_date DESC);
CREATE INDEX idx_transactions_security ON transactions(security_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_sync ON transactions(portfolio_id, created_at DESC);

-- ==========================================
-- Source Transactions
-- ==========================================
CREATE TABLE IF NOT EXISTS source_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES portfolio_connections(id) ON DELETE CASCADE,

  platform_transaction_id VARCHAR(255) NOT NULL,
  platform_transaction_date TIMESTAMP WITH TIME ZONE,

  synced_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_transaction_connection UNIQUE(transaction_id, connection_id)
);

CREATE INDEX idx_source_transactions_platform_id ON source_transactions(connection_id, platform_transaction_id);

-- ==========================================
-- Performance Metrics Table
-- ==========================================
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,

  period VARCHAR(50) NOT NULL CHECK (period IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YTD', '1Y', '3Y', '5Y', 'INCEPTION')),

  return_value DECIMAL(19,4),
  return_percent DECIMAL(8,4),
  benchmark_return DECIMAL(8,4),
  excess_return DECIMAL(8,4),

  calculation_date DATE NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_portfolio_period_date UNIQUE(portfolio_id, period, calculation_date)
);

CREATE INDEX idx_performance_metrics_portfolio_period ON performance_metrics(portfolio_id, period);

-- ==========================================
-- Sync Operations (Audit Trail)
-- ==========================================
CREATE TABLE IF NOT EXISTS sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES portfolio_connections(id),

  direction VARCHAR(10) NOT NULL CHECK (direction IN ('PULL', 'PUSH')),
  data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('HOLDINGS', 'TRANSACTIONS', 'PERFORMANCE', 'ALL')),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL')),

  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP WITH TIME ZONE,

  error_details JSONB,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_operations_connection_status ON sync_operations(connection_id, status);
CREATE INDEX idx_sync_operations_created ON sync_operations(created_at DESC);
CREATE INDEX idx_sync_operations_status ON sync_operations(status, created_at DESC);

-- ==========================================
-- Sync Errors
-- ==========================================
CREATE TABLE IF NOT EXISTS sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_operation_id UUID REFERENCES sync_operations(id) ON DELETE CASCADE,

  record_id VARCHAR(255),
  error_code VARCHAR(50),
  error_message TEXT,
  severity VARCHAR(20) CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  retryable BOOLEAN DEFAULT true,

  context JSONB,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_errors_operation ON sync_errors(sync_operation_id);
CREATE INDEX idx_sync_errors_severity ON sync_errors(severity);

-- ==========================================
-- Portfolio Conflicts
-- ==========================================
CREATE TABLE IF NOT EXISTS portfolio_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,

  conflict_type VARCHAR(50) NOT NULL CHECK (conflict_type IN ('DUPLICATE', 'QUANTITY_MISMATCH', 'VALUE_MISMATCH', 'MISSING_SOURCE')),
  data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('HOLDING', 'TRANSACTION')),

  primary_source_id UUID,
  conflicting_source_id UUID,

  clearway_data JSONB,
  platform_data JSONB,

  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED', 'IGNORED')),
  resolution_strategy VARCHAR(50),

  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_portfolio_conflicts_portfolio_status ON portfolio_conflicts(portfolio_id, status);
CREATE INDEX idx_portfolio_conflicts_pending ON portfolio_conflicts(portfolio_id, status) WHERE status = 'PENDING';

-- ==========================================
-- Tax Lots (for Orion integration)
-- ==========================================
CREATE TABLE IF NOT EXISTS tax_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holding_id UUID NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,

  quantity DECIMAL(19,8) NOT NULL,
  cost_basis DECIMAL(19,4) NOT NULL,
  acquired_date DATE NOT NULL,
  unrealized_gain DECIMAL(19,4),
  holding_period VARCHAR(20) CHECK (holding_period IN ('SHORT_TERM', 'LONG_TERM')),
  lot_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tax_lots_holding ON tax_lots(holding_id);

-- ==========================================
-- Trigger for updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_portfolio_connections_updated_at BEFORE UPDATE ON portfolio_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON holdings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_source_holdings_updated_at BEFORE UPDATE ON source_holdings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_performance_metrics_updated_at BEFORE UPDATE ON performance_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tax_lots_updated_at BEFORE UPDATE ON tax_lots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Comments
-- ==========================================
COMMENT ON TABLE portfolio_connections IS 'Stores connections to external portfolio platforms (Black Diamond, Orion, Addepar)';
COMMENT ON TABLE portfolios IS 'Consolidated portfolios combining data from multiple platforms';
COMMENT ON TABLE holdings IS 'Consolidated portfolio holdings across all platforms';
COMMENT ON TABLE source_holdings IS 'Tracks individual platform sources for each holding';
COMMENT ON TABLE transactions IS 'Portfolio transactions consolidated from all platforms';
COMMENT ON TABLE sync_operations IS 'Audit trail of all synchronization operations';
COMMENT ON TABLE portfolio_conflicts IS 'Data conflicts requiring manual review and resolution';
