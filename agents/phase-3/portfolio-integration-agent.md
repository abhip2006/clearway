# Portfolio Integration Agent - Clearway Phase 3

## Executive Summary

The Portfolio Integration Agent manages comprehensive multi-platform portfolio data integration for Clearway Phase 3, enabling seamless synchronization of holdings, transactions, and performance metrics across Black Diamond, Orion, and Addepar platforms. This agent implements OAuth-based authentication, real-time data sync, bidirectional updates, and monitoring capabilities to ensure data consistency across all connected portfolio platforms.

**Phase Timeline:** Weeks 29-32
**Status:** Phase 3 Development
**Priority:** Critical Infrastructure

---

## 1. Agent Overview

### Purpose
The Portfolio Integration Agent serves as the central hub for portfolio data management, handling:
- Multi-platform authentication and authorization
- Real-time data synchronization (holdings, transactions, performance)
- Bidirectional data flow and conflict resolution
- Portfolio connection management and lifecycle
- Data validation and reconciliation
- Monitoring and alerting for sync failures

### Core Responsibilities

| Responsibility | Description | Priority |
|---|---|---|
| Platform Authentication | Manage OAuth flows and API credentials for BD, Orion, Addepar | Critical |
| Data Synchronization | Sync holdings, transactions, and performance data in real-time | Critical |
| Bidirectional Updates | Enable two-way sync with conflict resolution logic | High |
| Connection Management | Create, update, monitor, and disconnect portfolio connections | Critical |
| Data Validation | Validate and transform data across platform-specific formats | High |
| Monitoring & Alerts | Real-time sync status and failure notifications | High |
| Reconciliation | Auto-reconciliation and manual override capabilities | Medium |

### Technical Stack
- **Language:** Node.js/TypeScript
- **Database:** PostgreSQL with Redis caching
- **Message Queue:** RabbitMQ for async sync operations
- **APIs:** REST + gRPC for internal services
- **Monitoring:** Prometheus, Grafana, ELK Stack
- **Authentication:** OAuth 2.0, JWT, API Keys

---

## 2. Platform Integrations

### 2.1 Black Diamond Integration

#### Overview
Black Diamond is a leading wealth management platform. The integration provides:
- Account and holding synchronization
- Transaction and trade execution data
- Performance metrics and reporting
- Asset allocation and rebalancing data

#### Authentication (OAuth 2.0)

**OAuth Flow:**
```
1. User initiates connection in Clearway UI
2. User redirected to Black Diamond login
3. User grants Clearway permission scope
4. BD returns authorization code
5. Clearway exchanges code for access token
6. Clearway stores encrypted refresh token
7. Sync begins with validated credentials
```

**Required Scopes:**
```
- portfolio:read
- holdings:read
- transactions:read
- performance:read
- accounts:read
- trades:read
```

**Token Management:**
- Access token validity: 1 hour
- Refresh token validity: 1 year
- Automatic token refresh: 5 minutes before expiry
- Token rotation on refresh: Every 30 days mandatory
- Revocation handling: Graceful disconnection with user notification

#### Data Sync

**Holdings Sync:**
```graphql
type BlackDiamondHolding {
  id: String!
  accountId: String!
  securityId: String!
  ticker: String
  isin: String
  cusip: String
  quantity: Decimal!
  marketValue: Decimal!
  costBasis: Decimal!
  unrealizedGainLoss: Decimal!
  percentOfPortfolio: Decimal!
  currency: String!
  lastUpdated: DateTime!
}

type HoldingSyncMetadata {
  sourceId: String!
  sourceTimestamp: DateTime!
  destinationTimestamp: DateTime
  syncStatus: SyncStatus!
  conflictResolution: ConflictStrategy
}
```

**Transaction Sync:**
```graphql
type BlackDiamondTransaction {
  id: String!
  accountId: String!
  transactionDate: DateTime!
  settlementDate: DateTime!
  type: TransactionType! # BUY, SELL, DIVIDEND, INTEREST, FEE
  quantity: Decimal
  price: Decimal
  amount: Decimal!
  currency: String!
  fee: Decimal
  description: String
  securityId: String!
  tradeId: String
  status: TransactionStatus! # PENDING, COMPLETED, FAILED
}
```

**Performance Sync:**
```graphql
type BlackDiamondPerformance {
  accountId: String!
  period: Period! # DAILY, WEEKLY, MONTHLY, YTD, 1Y, 3Y, 5Y, INCEPTION
  returnValue: Decimal!
  returnPercent: Decimal!
  benchmarkReturn: Decimal!
  excessReturn: Decimal!
  calculationDate: DateTime!
}
```

#### Sync Frequency
- Holdings: Every 4 hours (can trigger manual sync)
- Transactions: Real-time (webhook preferred, fallback polling every 2 hours)
- Performance: Daily at 8 PM UTC
- Account information: Daily at 6 AM UTC

#### Data Mapping
```typescript
// Black Diamond → Clearway internal format
interface BlackDiamondMapping {
  // Identifiers
  bd_account_id: string → clearway_account_id
  bd_security_id: string → clearway_security_id

  // Enums
  bd_transaction_type: 'BUY' | 'SELL' | ... → TransactionType
  bd_status: 'ACTIVE' | 'INACTIVE' | ... → ConnectionStatus

  // Currency conversion
  bd_amount: (amount, currency) → convertToUSD(amount, currency)

  // Performance calculation
  bd_return_percent: (return) → validateReturnPercent(return)
}
```

---

### 2.2 Orion Integration

#### Overview
Orion provides portfolio accounting and reporting. Integration includes:
- Portfolio composition and weights
- Multi-currency support
- Custom reporting and benchmarking
- Asset location optimization data
- Tax lot tracking

#### Authentication

**API Key Authentication:**
- Header-based API keys with rotating secret
- OAuth 2.0 support for delegated access
- Token expiration: 30 days with automatic rotation
- Rate limiting: 1000 requests/minute per account

**Credential Storage:**
```typescript
interface OrionCredentials {
  apiKey: string // Encrypted with AES-256
  apiSecret: string // Encrypted, never transmitted
  environment: 'production' | 'sandbox'
  accountId: string
  createdAt: DateTime
  lastRotated: DateTime
  expiresAt: DateTime
  isActive: boolean
}
```

#### Data Sync

**Portfolio Composition:**
```graphql
type OrionPortfolio {
  id: String!
  accountId: String!
  totalValue: Decimal!
  baseCurrency: String!
  assetAllocations: [AssetAllocation!]!
  positions: [OrionPosition!]!
  lastRebalance: DateTime
  driftTolerance: Decimal
  syncTimestamp: DateTime!
}

type AssetAllocation {
  assetClass: String!
  targetWeight: Decimal!
  currentWeight: Decimal!
  drift: Decimal!
}

type OrionPosition {
  id: String!
  securityId: String!
  quantity: Decimal!
  costPerShare: Decimal!
  marketValue: Decimal!
  weight: Decimal!
  currency: String!
  accountingMethod: String! # FIFO, LIFO, AVERAGE_COST
}
```

**Tax Lot Data:**
```graphql
type TaxLot {
  id: String!
  positionId: String!
  quantity: Decimal!
  costBasis: Decimal!
  acquiredDate: Date!
  unrealizedGain: Decimal!
  holdingPeriod: HoldingPeriod! # SHORT_TERM, LONG_TERM
  lotNotes: String
}
```

**Custom Reports:**
```graphql
type OrionReport {
  id: String!
  portfolioId: String!
  reportType: String! # PERFORMANCE, TAX, ALLOCATION, REBALANCING
  generatedAt: DateTime!
  reportData: JSON
  metrics: ReportMetrics
}
```

#### Sync Frequency
- Portfolio composition: Every 6 hours
- Positions: Real-time (webhook, 15-min fallback)
- Tax lots: Daily
- Performance reports: Daily at 9 PM UTC
- Custom reports: On-demand with caching

#### Data Transformation
```typescript
interface OrionTransform {
  // Security mapping
  orion_isin → clearway_security_id (validation required)

  // Currency normalization
  portfolio_value → convertMultiCurrencyToUSD(positions)

  // Tax lot handling
  tax_lot_tracking → enable_cost_basis_tracking()

  // Weight calculation
  position_weight → calculateWeight(position_value / total_value)
}
```

---

### 2.3 Addepar Integration

#### Overview
Addepar provides wealth management analytics and reporting. Integration includes:
- Advanced analytics and reporting
- Risk assessment and attribution
- Competitor benchmarking
- Wealth plan integration
- Advisor collaboration tools

#### Authentication

**OAuth 2.0 + API Tokens:**
```
1. Initial OAuth flow to obtain access token
2. Exchange for long-lived API token
3. API token used for data operations
4. Refresh token for token renewal
```

**Security Implementation:**
```typescript
interface AddeparAuth {
  accessToken: string // 1 hour validity
  refreshToken: string // 90 days validity
  tokenType: 'Bearer'
  expiresIn: number
  scope: string[]
  clientId: string
  clientSecret: string // Server-side only
  redirectUri: string
}

// Token refresh flow
async function refreshAddeparToken(refreshToken: string) {
  const response = await fetch('https://api.addepar.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    })
  });
  return response.json();
}
```

#### Data Sync

**Analytics Data:**
```graphql
type AddeparAnalytics {
  portfolioId: String!
  analysisDate: Date!
  riskMetrics: RiskMetrics
  performanceAttribution: PerformanceAttribution
  benchmarkComparison: BenchmarkComparison
  recommendations: [AdvisoryRecommendation!]
}

type RiskMetrics {
  variance: Decimal!
  standardDeviation: Decimal!
  sharpeRatio: Decimal!
  sortinoRatio: Decimal!
  maxDrawdown: Decimal!
  betaToSP500: Decimal!
  correlation: [CorrelationPair!]!
}

type PerformanceAttribution {
  assetAllocationEffect: Decimal!
  securitySelectionEffect: Decimal!
  interactionEffect: Decimal!
  currencyEffect: Decimal!
  totalEffect: Decimal!
  period: Period!
}

type BenchmarkComparison {
  benchmarkId: String!
  benchmarkName: String!
  portfolioReturn: Decimal!
  benchmarkReturn: Decimal!
  trackingError: Decimal!
  informationRatio: Decimal!
}
```

**Wealth Plan Data:**
```graphql
type AddeparWealthPlan {
  id: String!
  clientId: String!
  objectives: [PlanObjective!]!
  projections: [CashFlowProjection!]!
  recommendations: [PlanRecommendation!]!
  lastUpdated: DateTime!
}

type CashFlowProjection {
  year: Int!
  projectedBalance: Decimal!
  projectedIncome: Decimal!
  projectedExpenses: Decimal!
  needsFunding: Boolean
}
```

**Collaboration Data:**
```graphql
type AdvisorCollaboration {
  advisorId: String!
  portfolioId: String!
  role: AdvisorRole! # PRIMARY, CONSULTANT, OPERATIONS
  permissions: [Permission!]!
  lastActivity: DateTime!
  documentReferences: [DocumentReference!]!
}
```

#### Sync Frequency
- Risk metrics: Daily at 10 PM UTC
- Performance attribution: Weekly (Fridays 10 PM UTC)
- Benchmark comparison: Daily at 11 PM UTC
- Wealth plan: On-demand, cached for 7 days
- Advisor collaboration: Real-time updates with 5-minute batching

---

## 3. Portfolio Data Synchronization

### 3.1 Data Types and Models

**Portfolio Connection:**
```typescript
interface PortfolioConnection {
  id: UUID
  userId: UUID
  platform: 'BLACK_DIAMOND' | 'ORION' | 'ADDEPAR'
  accountId: string
  displayName: string
  status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'SYNC_FAILED'

  // Authentication
  oauth: {
    accessToken: string (encrypted)
    refreshToken: string (encrypted)
    tokenExpiresAt: DateTime
    scope: string[]
  }

  // Sync metadata
  lastSyncAt: DateTime
  lastSuccessfulSyncAt: DateTime
  nextScheduledSyncAt: DateTime
  syncFrequency: number (minutes)

  // Connection settings
  autoSync: boolean
  bidirectionalSync: boolean
  conflictResolution: 'CLEARWAY_WINS' | 'PLATFORM_WINS' | 'MANUAL'
  dataFilters: {
    includedAssetClasses: string[]
    excludedSecurities: string[]
    minValue: Decimal
  }

  // Performance
  totalTransactionsSynced: number
  lastErrorMessage: string
  errorCount: number
  successRate: Decimal (0-1)

  createdAt: DateTime
  updatedAt: DateTime
}

interface Portfolio {
  id: UUID
  userId: UUID
  name: string
  connections: PortfolioConnection[]

  // Aggregated data
  totalValue: Decimal
  baseCurrency: string
  holdings: Holding[]
  transactions: Transaction[]
  performance: PerformanceMetrics

  // Sync status
  syncStatus: 'SYNCING' | 'SYNCED' | 'PARTIAL' | 'FAILED'
  consolidationStatus: 'ACTIVE' | 'PENDING' | 'FAILED'

  createdAt: DateTime
  updatedAt: DateTime
}

interface Holding {
  id: UUID
  portfolioId: UUID
  securityId: string
  ticker: string
  isin: string
  quantity: Decimal
  marketValue: Decimal
  costBasis: Decimal
  unrealizedGain: Decimal
  percentOfPortfolio: Decimal

  // Source tracking
  sources: SourceHolding[] // Track which platforms report this
  lastUpdated: DateTime
}

interface SourceHolding {
  connectionId: UUID
  platformHoldingId: string
  quantity: Decimal
  marketValue: Decimal
  lastSyncAt: DateTime
  confidence: Decimal (0-1)
}

interface Transaction {
  id: UUID
  portfolioId: UUID
  securityId: string
  transactionDate: DateTime
  settlementDate: DateTime
  type: 'BUY' | 'SELL' | 'DIVIDEND' | 'INTEREST' | 'FEE' | 'TRANSFER'
  quantity: Decimal
  price: Decimal
  amount: Decimal
  currency: string
  fee: Decimal
  description: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED'

  // Source tracking
  sources: SourceTransaction[]
  createdAt: DateTime
}

interface SourceTransaction {
  connectionId: UUID
  platformTransactionId: string
  platformTransactionDate: DateTime
  syncedAt: DateTime
}

interface PerformanceMetrics {
  portfolioId: UUID
  period: Period
  returnValue: Decimal
  returnPercent: Decimal
  benchmarkReturn: Decimal
  excessReturn: Decimal
  calculationDate: DateTime
}
```

### 3.2 Bidirectional Sync Logic

**Sync Direction Strategies:**

1. **Read-Only (Default)**
   - Portfolio data flows from platform → Clearway
   - Useful for initial setup and monitoring
   - No risk of data corruption on external platforms

2. **Write-Back Sync**
   - Portfolio rebalancing instructions → External platforms
   - Trade execution notifications → Clearway
   - Manual overrides and reconciliation
   - Requires additional approval workflows

3. **Full Bidirectional**
   - Both directions enabled with conflict resolution
   - Requires sophisticated conflict detection
   - Audit trail for all changes
   - Not recommended for conflicting data types

**Conflict Resolution Strategies:**

```typescript
enum ConflictStrategy {
  CLEARWAY_WINS,      // Clearway data overwrites platform data
  PLATFORM_WINS,      // Platform data takes precedence
  MANUAL_REVIEW,      // Flag for user review
  MERGE,              // Combine data intelligently
  TIMESTAMP,          // Most recently updated wins
  VERSION_CONTROL     // Track all versions
}

interface ConflictDetection {
  detectDuplicates(holding1: Holding, holding2: Holding): boolean {
    // Same security, same quantity, within time window
    return holding1.securityId === holding2.securityId &&
           Math.abs(holding1.quantity - holding2.quantity) < TOLERANCE &&
           Math.abs(holding1.lastUpdated - holding2.lastUpdated) < TIME_WINDOW;
  }

  detectQuantityMismatch(sources: SourceHolding[]): boolean {
    // Flag if quantities differ by more than tolerance
    const max = Math.max(...sources.map(s => s.quantity));
    const min = Math.min(...sources.map(s => s.quantity));
    return (max - min) / max > QUANTITY_TOLERANCE;
  }

  detectValueMismatch(sources: SourceHolding[]): boolean {
    // Flag if market values differ significantly
    const values = sources.map(s => s.marketValue);
    const avg = values.reduce((a, b) => a + b) / values.length;
    return values.some(v => Math.abs(v - avg) / avg > VALUE_TOLERANCE);
  }

  resolveConflict(conflict: Conflict, strategy: ConflictStrategy): Resolution {
    switch (strategy) {
      case ConflictStrategy.CLEARWAY_WINS:
        return { winnerId: conflict.clearwayDataId, action: 'OVERWRITE' };
      case ConflictStrategy.PLATFORM_WINS:
        return { winnerId: conflict.platformDataId, action: 'REVERT' };
      case ConflictStrategy.MERGE:
        return { winnerId: null, action: 'MERGE', mergedData: mergeData(...) };
      case ConflictStrategy.MANUAL_REVIEW:
        return { status: 'PENDING_REVIEW', notifyUser: true };
      default:
        return { status: 'ERROR', reason: 'Unknown strategy' };
    }
  }
}
```

**Sync State Management:**

```typescript
interface SyncOperation {
  id: UUID
  connectionId: UUID
  direction: 'PULL' | 'PUSH'
  dataType: 'HOLDINGS' | 'TRANSACTIONS' | 'PERFORMANCE'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIAL'

  // Timestamps
  startedAt: DateTime
  completedAt: DateTime

  // Results
  recordsProcessed: number
  recordsInserted: number
  recordsUpdated: number
  recordsSkipped: number
  recordsFailed: number

  // Errors
  errors: SyncError[]
  warnings: SyncWarning[]

  // Retry logic
  retryCount: number
  maxRetries: number
  nextRetryAt: DateTime
}

interface SyncError {
  recordId: string
  errorCode: string
  errorMessage: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  retryable: boolean
  timestamp: DateTime
}
```

---

## 4. Database Schema

### 4.1 Core Tables

```sql
-- Portfolio Connections
CREATE TABLE portfolio_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'CONNECTING',

  -- OAuth credentials (encrypted)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  oauth_scope TEXT,

  -- Sync metadata
  last_sync_at TIMESTAMP,
  last_successful_sync_at TIMESTAMP,
  next_scheduled_sync_at TIMESTAMP,
  sync_frequency_minutes INTEGER DEFAULT 360,

  -- Settings
  auto_sync BOOLEAN DEFAULT true,
  bidirectional_sync BOOLEAN DEFAULT false,
  conflict_resolution VARCHAR(50) DEFAULT 'MANUAL_REVIEW',
  included_asset_classes TEXT[], -- JSON array
  excluded_securities TEXT[], -- JSON array
  min_holding_value DECIMAL(19,4),

  -- Statistics
  total_transactions_synced INTEGER DEFAULT 0,
  last_error_message TEXT,
  error_count INTEGER DEFAULT 0,
  sync_success_rate DECIMAL(3,2),

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, platform, account_id),
  INDEX idx_user_platform (user_id, platform),
  INDEX idx_status (status),
  INDEX idx_next_sync (next_scheduled_sync_at)
);

-- Portfolios
CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  total_value DECIMAL(19,4),
  base_currency VARCHAR(10) DEFAULT 'USD',

  sync_status VARCHAR(50) DEFAULT 'SYNCED',
  consolidation_status VARCHAR(50) DEFAULT 'ACTIVE',

  -- Portfolio settings
  include_all_connections BOOLEAN DEFAULT false,
  weighted_average_method VARCHAR(50),
  rebalancing_threshold DECIMAL(3,2),

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id)
);

-- Portfolio Connection Mappings
CREATE TABLE portfolio_connection_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES portfolio_connections(id) ON DELETE CASCADE,
  weight DECIMAL(5,2), -- For weighted aggregation
  include_in_totals BOOLEAN DEFAULT true,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(portfolio_id, connection_id),
  INDEX idx_portfolio_id (portfolio_id)
);

-- Holdings
CREATE TABLE holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  security_id VARCHAR(100) NOT NULL,
  ticker VARCHAR(20),
  isin VARCHAR(20),
  cusip VARCHAR(20),

  quantity DECIMAL(19,8) NOT NULL,
  market_value DECIMAL(19,4) NOT NULL,
  cost_basis DECIMAL(19,4),
  unrealized_gain DECIMAL(19,4),
  percent_of_portfolio DECIMAL(5,2),

  currency VARCHAR(10) DEFAULT 'USD',

  last_updated TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(portfolio_id, security_id),
  INDEX idx_portfolio_security (portfolio_id, security_id),
  INDEX idx_updated (updated_at)
);

-- Source Holdings (multi-platform tracking)
CREATE TABLE source_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holding_id UUID NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES portfolio_connections(id) ON DELETE CASCADE,

  platform_holding_id VARCHAR(255) NOT NULL,
  platform_account_id VARCHAR(255),

  quantity DECIMAL(19,8) NOT NULL,
  market_value DECIMAL(19,4) NOT NULL,
  cost_basis DECIMAL(19,4),

  confidence DECIMAL(3,2), -- 0-1 score for data quality

  last_synced_at TIMESTAMP,
  platform_last_updated TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(holding_id, connection_id),
  INDEX idx_holding_connection (holding_id, connection_id),
  INDEX idx_platform_id (connection_id, platform_holding_id)
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  security_id VARCHAR(100) NOT NULL,

  transaction_date DATE NOT NULL,
  settlement_date DATE,

  type VARCHAR(50) NOT NULL, -- BUY, SELL, DIVIDEND, INTEREST, FEE, TRANSFER
  quantity DECIMAL(19,8),
  price DECIMAL(19,8),
  amount DECIMAL(19,4) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  fee DECIMAL(19,4),
  description TEXT,

  status VARCHAR(50) DEFAULT 'COMPLETED',

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_portfolio_date (portfolio_id, transaction_date),
  INDEX idx_security (security_id),
  INDEX idx_type (type)
);

-- Source Transactions
CREATE TABLE source_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES portfolio_connections(id) ON DELETE CASCADE,

  platform_transaction_id VARCHAR(255) NOT NULL,
  platform_transaction_date TIMESTAMP,

  synced_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(transaction_id, connection_id),
  INDEX idx_platform_id (connection_id, platform_transaction_id)
);

-- Performance Metrics
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,

  period VARCHAR(50) NOT NULL, -- DAILY, WEEKLY, MONTHLY, YTD, 1Y, 3Y, 5Y, INCEPTION

  return_value DECIMAL(19,4),
  return_percent DECIMAL(8,4),
  benchmark_return DECIMAL(8,4),
  excess_return DECIMAL(8,4),

  calculation_date DATE NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(portfolio_id, period, calculation_date),
  INDEX idx_portfolio_period (portfolio_id, period)
);

-- Sync Operations (audit trail)
CREATE TABLE sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES portfolio_connections(id),

  direction VARCHAR(10) NOT NULL, -- PULL, PUSH
  data_type VARCHAR(50) NOT NULL, -- HOLDINGS, TRANSACTIONS, PERFORMANCE
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',

  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP,

  error_details JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_connection_status (connection_id, status),
  INDEX idx_created (created_at)
);

-- Sync Errors
CREATE TABLE sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_operation_id UUID REFERENCES sync_operations(id),

  record_id VARCHAR(255),
  error_code VARCHAR(50),
  error_message TEXT,
  severity VARCHAR(20), -- CRITICAL, HIGH, MEDIUM, LOW
  retryable BOOLEAN DEFAULT true,

  context JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_operation (sync_operation_id),
  INDEX idx_severity (severity)
);

-- Portfolio Conflicts
CREATE TABLE portfolio_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,

  conflict_type VARCHAR(50) NOT NULL, -- DUPLICATE, QUANTITY_MISMATCH, VALUE_MISMATCH
  data_type VARCHAR(50) NOT NULL, -- HOLDING, TRANSACTION

  primary_source_id VARCHAR(255),
  conflicting_source_id VARCHAR(255),

  clearway_data JSONB,
  platform_data JSONB,

  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, RESOLVED, IGNORED
  resolution_strategy VARCHAR(50),

  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,

  INDEX idx_portfolio_status (portfolio_id, status)
);
```

### 4.2 Indexes for Performance

```sql
-- Sync query optimization
CREATE INDEX idx_portfolio_holdings_updated
  ON holdings(portfolio_id, updated_at DESC);

CREATE INDEX idx_source_holdings_sync
  ON source_holdings(connection_id, last_synced_at);

CREATE INDEX idx_transactions_sync
  ON transactions(portfolio_id, created_at DESC);

-- Real-time monitoring
CREATE INDEX idx_sync_ops_status
  ON sync_operations(status, created_at DESC);

CREATE INDEX idx_connections_next_sync
  ON portfolio_connections(next_scheduled_sync_at)
  WHERE status = 'CONNECTED';

-- Conflict detection
CREATE INDEX idx_conflicts_pending
  ON portfolio_conflicts(portfolio_id, status)
  WHERE status = 'PENDING';
```

---

## 5. API Endpoints

### 5.1 Portfolio Connections API

```
POST /api/v1/portfolio-connections/initiate
Purpose: Start OAuth flow for new platform connection
Request:
{
  "platform": "BLACK_DIAMOND | ORION | ADDEPAR",
  "accountId": "optional-account-id",
  "bidirectionalSync": false
}
Response:
{
  "authorizationUrl": "https://provider.com/oauth/authorize?...",
  "sessionToken": "session-123",
  "expiresIn": 600
}

POST /api/v1/portfolio-connections/callback
Purpose: Handle OAuth callback and store credentials
Request:
{
  "sessionToken": "session-123",
  "code": "auth-code",
  "state": "state-token"
}
Response:
{
  "connectionId": "conn-uuid",
  "platform": "BLACK_DIAMOND",
  "accountId": "bd-account-123",
  "status": "SYNCING",
  "displayName": "BD Main Account"
}

GET /api/v1/portfolio-connections
Purpose: List all connections for user
Query Params:
  - portfolio_id: Filter by portfolio
  - platform: Filter by platform
  - status: Filter by status
Response:
{
  "connections": [
    {
      "id": "conn-uuid",
      "platform": "BLACK_DIAMOND",
      "displayName": "BD Main Account",
      "status": "CONNECTED",
      "lastSyncAt": "2024-11-19T10:30:00Z",
      "nextSyncAt": "2024-11-19T14:30:00Z",
      "syncSuccessRate": 0.98,
      "holdingsCount": 1250,
      "transactionsCount": 4567
    }
  ],
  "total": 3
}

GET /api/v1/portfolio-connections/:connectionId
Purpose: Get detailed connection info
Response:
{
  "id": "conn-uuid",
  "platform": "BLACK_DIAMOND",
  "accountId": "bd-account-123",
  "displayName": "BD Main Account",
  "status": "CONNECTED",
  "autoSync": true,
  "bidirectionalSync": false,
  "conflictResolution": "MANUAL_REVIEW",
  "lastSyncAt": "2024-11-19T10:30:00Z",
  "lastErrorMessage": null,
  "errorCount": 0,
  "syncSuccessRate": 0.98,
  "dataFilters": {
    "includedAssetClasses": ["EQUITIES", "FIXED_INCOME"],
    "excludedSecurities": [],
    "minValue": 1000
  },
  "statistics": {
    "totalHoldings": 1250,
    "totalTransactions": 4567,
    "totalValue": 5250000.00,
    "lastDataPoint": "2024-11-19T10:30:00Z"
  }
}

PUT /api/v1/portfolio-connections/:connectionId
Purpose: Update connection settings
Request:
{
  "displayName": "Updated Name",
  "autoSync": true,
  "syncFrequency": 360,
  "bidirectionalSync": false,
  "conflictResolution": "MANUAL_REVIEW",
  "dataFilters": {
    "includedAssetClasses": ["EQUITIES"],
    "minValue": 5000
  }
}
Response: Updated connection object

DELETE /api/v1/portfolio-connections/:connectionId
Purpose: Disconnect and remove connection
Query Params:
  - includeHistory: boolean (keep historical data)
Response:
{
  "connectionId": "conn-uuid",
  "status": "DISCONNECTED",
  "dataRetained": true,
  "lastSync": "2024-11-19T10:30:00Z"
}

POST /api/v1/portfolio-connections/:connectionId/sync
Purpose: Trigger manual sync
Request:
{
  "dataTypes": ["HOLDINGS", "TRANSACTIONS"],
  "force": false
}
Response:
{
  "syncOperationId": "sync-op-uuid",
  "status": "IN_PROGRESS",
  "startedAt": "2024-11-19T11:00:00Z",
  "estimatedCompletionTime": 30
}
```

### 5.2 Portfolio Management API

```
POST /api/v1/portfolios
Purpose: Create new portfolio
Request:
{
  "name": "Combined Wealth",
  "baseCurrency": "USD",
  "connections": ["conn-uuid-1", "conn-uuid-2"],
  "weightedAggregation": false
}
Response: Portfolio object with all linked connections

GET /api/v1/portfolios/:portfolioId
Purpose: Get portfolio with consolidated data
Query Params:
  - includeDetails: boolean
  - asOf: ISO-8601 date for point-in-time data
Response:
{
  "id": "portfolio-uuid",
  "name": "Combined Wealth",
  "totalValue": 10500000.00,
  "baseCurrency": "USD",
  "syncStatus": "SYNCED",
  "lastSyncAt": "2024-11-19T10:30:00Z",
  "connections": [
    {
      "connectionId": "conn-uuid-1",
      "platform": "BLACK_DIAMOND",
      "accountValue": 5250000.00,
      "weight": 0.50,
      "lastSync": "2024-11-19T10:30:00Z"
    }
  ],
  "summary": {
    "totalHoldings": 2500,
    "totalTransactions": 9134,
    "topHoldings": [...],
    "assetAllocation": {...}
  }
}

GET /api/v1/portfolios/:portfolioId/holdings
Purpose: Get consolidated holdings
Query Params:
  - skip: number
  - limit: number
  - sort: "value" | "percent" | "ticker"
  - security_type: filter by type
Response:
{
  "holdings": [
    {
      "id": "holding-uuid",
      "securityId": "sec-123",
      "ticker": "AAPL",
      "quantity": 1000.5,
      "marketValue": 175000.00,
      "percentOfPortfolio": 1.67,
      "sources": [
        {
          "connection": "conn-uuid-1",
          "platform": "BLACK_DIAMOND",
          "quantity": 500,
          "value": 87500.00
        },
        {
          "connection": "conn-uuid-2",
          "platform": "ORION",
          "quantity": 500.5,
          "value": 87500.00
        }
      ],
      "lastUpdated": "2024-11-19T10:30:00Z"
    }
  ],
  "total": 2500,
  "totalValue": 10500000.00
}

GET /api/v1/portfolios/:portfolioId/transactions
Purpose: Get consolidated transactions
Query Params:
  - startDate: ISO-8601
  - endDate: ISO-8601
  - type: transaction type filter
  - skip: number
  - limit: number
Response:
{
  "transactions": [...],
  "total": 9134,
  "totalBuys": 4567,
  "totalSells": 3200,
  "totalDividends": 1367,
  "netCashFlow": 150000.00
}

GET /api/v1/portfolios/:portfolioId/performance
Purpose: Get performance metrics
Query Params:
  - period: "DAILY" | "WEEKLY" | "MONTHLY" | "YTD" | "1Y" | "3Y" | "5Y" | "INCEPTION"
  - benchmarkId: optional benchmark
Response:
{
  "performance": [
    {
      "period": "MONTHLY",
      "date": "2024-11-19",
      "returnValue": 15000.00,
      "returnPercent": 1.43,
      "benchmarkReturn": 0.95,
      "excessReturn": 0.48
    }
  ]
}

GET /api/v1/portfolios/:portfolioId/conflicts
Purpose: Get pending conflicts
Query Params:
  - status: "PENDING" | "RESOLVED"
  - type: conflict type
Response:
{
  "conflicts": [
    {
      "id": "conflict-uuid",
      "type": "QUANTITY_MISMATCH",
      "dataType": "HOLDING",
      "security": "AAPL",
      "sources": [
        { "connection": "conn-1", "quantity": 1000 },
        { "connection": "conn-2", "quantity": 1050 }
      ],
      "createdAt": "2024-11-19T10:00:00Z",
      "reviewedBy": null
    }
  ],
  "total": 3
}

PUT /api/v1/portfolios/:portfolioId/conflicts/:conflictId/resolve
Purpose: Resolve a conflict
Request:
{
  "resolution": "CLEARWAY_WINS | PLATFORM_WINS | MERGE",
  "mergedValue": 1025 // only for MERGE
}
Response: Resolved conflict object
```

### 5.3 Sync Monitoring API

```
GET /api/v1/sync-operations
Purpose: Get sync operation history
Query Params:
  - connectionId: filter by connection
  - status: filter by status
  - dataType: filter by data type
  - hours: last N hours
Response:
{
  "operations": [
    {
      "id": "sync-op-uuid",
      "connectionId": "conn-uuid",
      "direction": "PULL",
      "dataType": "HOLDINGS",
      "status": "COMPLETED",
      "startedAt": "2024-11-19T10:00:00Z",
      "completedAt": "2024-11-19T10:05:30Z",
      "recordsProcessed": 1250,
      "recordsInserted": 45,
      "recordsUpdated": 1205,
      "recordsFailed": 0,
      "successRate": 1.0
    }
  ],
  "total": 156
}

GET /api/v1/sync-operations/:operationId
Purpose: Get detailed sync operation info
Response:
{
  "id": "sync-op-uuid",
  "connectionId": "conn-uuid",
  "direction": "PULL",
  "dataType": "HOLDINGS",
  "status": "COMPLETED",
  "startedAt": "2024-11-19T10:00:00Z",
  "completedAt": "2024-11-19T10:05:30Z",
  "duration": "5m 30s",
  "statistics": {
    "recordsProcessed": 1250,
    "recordsInserted": 45,
    "recordsUpdated": 1205,
    "recordsSkipped": 0,
    "recordsFailed": 0,
    "successRate": 1.0
  },
  "errors": [
    {
      "recordId": "sec-456",
      "errorCode": "CURRENCY_NOT_SUPPORTED",
      "errorMessage": "Currency CNY not supported",
      "severity": "MEDIUM",
      "retryable": true
    }
  ],
  "warnings": []
}

GET /api/v1/sync-status
Purpose: Get real-time sync status dashboard
Response:
{
  "overallStatus": "HEALTHY",
  "lastUpdated": "2024-11-19T11:00:00Z",
  "connections": {
    "total": 5,
    "healthy": 4,
    "warning": 1,
    "error": 0
  },
  "syncMetrics": {
    "totalSyncs": 1240,
    "successfulSyncs": 1215,
    "failedSyncs": 25,
    "averageSyncTime": "5m 45s",
    "lastSyncTime": "2024-11-19T11:00:00Z"
  },
  "errors": [
    {
      "connectionId": "conn-uuid-3",
      "platform": "ADDEPAR",
      "status": "ERROR",
      "lastError": "Token expired",
      "errorCount": 2,
      "affectedData": "PERFORMANCE_METRICS"
    }
  ]
}

POST /api/v1/sync-operations/:operationId/retry
Purpose: Retry failed sync operation
Request:
{
  "retryFailedOnly": true
}
Response: New sync operation object
```

### 5.4 Data Reconciliation API

```
POST /api/v1/reconciliation/start
Purpose: Start reconciliation process
Request:
{
  "portfolioId": "portfolio-uuid",
  "scope": "ALL | HOLDINGS | TRANSACTIONS",
  "ignoreMinorDifferences": true
}
Response:
{
  "reconciliationId": "recon-uuid",
  "status": "IN_PROGRESS",
  "startedAt": "2024-11-19T11:00:00Z",
  "estimatedCompletion": "2024-11-19T11:30:00Z"
}

GET /api/v1/reconciliation/:reconciliationId
Purpose: Get reconciliation results
Response:
{
  "id": "recon-uuid",
  "status": "COMPLETED",
  "completedAt": "2024-11-19T11:25:00Z",
  "summary": {
    "itemsReconciled": 3750,
    "discrepancies": 127,
    "accuracy": 0.9661
  },
  "discrepancies": [
    {
      "type": "QUANTITY_VARIANCE",
      "security": "AAPL",
      "expectedQty": 1000,
      "actualQty": 1050,
      "variance": 50,
      "variancePercent": 5.0,
      "sources": ["conn-uuid-1", "conn-uuid-2"]
    }
  ],
  "recommendations": [
    {
      "discrepancyId": "disc-123",
      "recommendation": "REVIEW_SOURCES",
      "reason": "Qty variance exceeds threshold"
    }
  ]
}

POST /api/v1/reconciliation/:reconciliationId/fix
Purpose: Auto-fix reconciliation issues
Request:
{
  "strategy": "AVERAGE | MEDIAN | LARGEST | SMALLEST | MANUAL_OVERRIDE",
  "discrepancies": ["disc-123", "disc-456"],
  "manualOverrides": [
    {
      "discrepancyId": "disc-789",
      "correctValue": 1025,
      "notes": "Verified with BD directly"
    }
  ]
}
Response: Reconciliation results after fixes
```

---

## 6. Frontend Integration

### 6.1 Portfolio Connections Management Page

**Location:** `/dashboard/integrations/portfolio-connections`

**Components:**

1. **Connection List View**
   - Display all connected platforms
   - Show status, last sync time, error count
   - Quick-connect buttons for new platforms
   - Bulk actions (sync all, disconnect)
   - Filter and search

2. **Connection Detail Panel**
   ```
   ┌─────────────────────────────────────┐
   │ Black Diamond - Main Account        │
   │ Status: Connected ✓                 │
   │ Last Sync: 2024-11-19 10:30 UTC     │
   ├─────────────────────────────────────┤
   │ Holdings: 1,250                     │
   │ Transactions: 4,567                 │
   │ Account Value: $5,250,000           │
   │ Sync Success Rate: 98.5%            │
   ├─────────────────────────────────────┤
   │ [Settings] [Sync Now] [Disconnect] │
   └─────────────────────────────────────┘
   ```

3. **Connection Settings Modal**
   - Update display name
   - Toggle auto-sync
   - Set sync frequency
   - Configure data filters
   - Enable/disable bidirectional sync
   - Set conflict resolution strategy
   - View encryption status

4. **Add New Connection Flow**
   ```
   Step 1: Select Platform
   ├─ Black Diamond
   ├─ Orion
   └─ Addepar

   Step 2: Connect Account
   ├─ OAuth redirect or API key entry
   ├─ Consent screen
   └─ Account selection

   Step 3: Configure Sync
   ├─ Select portfolio to connect to
   ├─ Choose sync direction
   ├─ Set data filters
   └─ Review and confirm

   Step 4: Verify Connection
   └─ Test sync, show initial holdings
   ```

5. **Sync History Timeline**
   - Visual timeline of sync operations
   - Success/failure indicators
   - Click to see detailed logs
   - Export logs option
   - Error details and suggestions

### 6.2 Portfolio Dashboard Enhancement

**New Widgets:**

1. **Consolidated Portfolio View**
   ```
   Total Value: $10,500,000
   Connected Platforms: 3/3
   Last Sync: 2 minutes ago

   Holdings by Platform:
   - Black Diamond: 50% ($5,250,000)
   - Orion: 35% ($3,675,000)
   - Addepar: 15% ($1,575,000)
   ```

2. **Real-Time Sync Status**
   - Current sync operation in progress
   - Sync status indicator
   - Next scheduled sync countdown
   - Recent sync history (last 5 syncs)

3. **Data Quality Indicator**
   - Overall data quality score
   - Conflicts pending review
   - Data consistency warnings
   - Reconciliation status

4. **Holdings Consolidation**
   - Show holdings across all platforms
   - Highlight duplicates/overlaps
   - Show source confidence scores
   - Merge/consolidate actions

### 6.3 Conflict Resolution Interface

**Component: Conflict Center**

```
Pending Conflicts: 3

Conflict #1: QUANTITY_MISMATCH
├─ Asset: AAPL
├─ Expected Qty: 1,000
├─ Black Diamond: 1,000 (100%)
├─ Orion: 1,050 (105%)
├─ [View Details] [Resolve]
│
└─ Resolution Options:
   ├─ ☐ Clearway Wins (1,000)
   ├─ ☐ Platform Wins (1,050)
   ├─ ☐ Merge Average (1,025)
   ├─ ☐ Manual Override: [    ]
   └─ [Save Resolution]
```

---

## 7. Real-Time Sync Monitoring

### 7.1 Monitoring Dashboard

**Metrics Displayed:**

1. **Sync Operations**
   - Total syncs per hour
   - Success/failure rates
   - Average sync duration
   - Data volume transferred

2. **Connection Health**
   - Connection status distribution
   - Error rate trend
   - Token refresh success rate
   - API rate limit utilization

3. **Data Quality**
   - Conflict detection rate
   - Reconciliation accuracy
   - Data freshness (age of last sync)
   - Missing required fields

4. **Performance**
   - Sync duration by data type
   - Queue depth and processing rate
   - Database query performance
   - API response times

### 7.2 Alerting System

**Alert Rules:**

```yaml
Alerts:
  - name: SyncFailureRate
    condition: sync_failure_rate > 0.05
    severity: HIGH
    channels: [slack, email]

  - name: TokenExpiration
    condition: token_expires_in < 24h
    severity: MEDIUM
    channels: [slack]

  - name: HighConflictRate
    condition: conflicts_per_sync > 100
    severity: MEDIUM
    channels: [email]

  - name: DataFreshness
    condition: max(time_since_last_sync) > 24h
    severity: HIGH
    channels: [slack, email, sms]

  - name: QuantityMismatch
    condition: quantity_variance_percent > 5.0
    severity: MEDIUM
    channels: [email]

  - name: SyncQueueBacklog
    condition: pending_syncs > 100
    severity: HIGH
    channels: [slack, email]
```

### 7.3 Logging and Audit Trail

**Log Levels:**

```typescript
enum LogLevel {
  DEBUG = 'DEBUG',     // Connection details, data transformations
  INFO = 'INFO',       // Sync started/completed, connection status
  WARN = 'WARN',       // Non-critical errors, retries
  ERROR = 'ERROR',     // Failed syncs, validation errors
  CRITICAL = 'CRITICAL' // Authentication failures, data loss risks
}

interface AuditLog {
  id: UUID
  timestamp: DateTime
  userId: UUID
  action: string // CONNECT, DISCONNECT, SYNC, RESOLVE_CONFLICT
  resourceType: string
  resourceId: string
  changes: {
    before: Record
    after: Record
  }
  ipAddress: string
  userAgent: string
  status: 'SUCCESS' | 'FAILURE'
  errorDetails: string
}
```

---

## 8. Implementation Timeline

### Week 29: Foundation & Black Diamond Integration
**Days 1-2:** Core Infrastructure
- [ ] Database schema implementation and migrations
- [ ] Portfolio connection model and API base
- [ ] Authentication framework (OAuth 2.0, token management)
- [ ] Encryption service for credential storage

**Days 3-4:** Black Diamond Integration
- [ ] OAuth flow implementation
- [ ] API client wrapper
- [ ] Holdings sync logic
- [ ] Transaction sync logic

**Days 5:** Testing & Deployment
- [ ] Unit tests for BD integration
- [ ] Integration tests with BD sandbox
- [ ] Error handling and retry logic
- [ ] Deploy to staging environment

### Week 30: Orion & Addepar Integration
**Days 1-2:** Orion Integration
- [ ] API authentication (key-based)
- [ ] Portfolio data sync
- [ ] Tax lot tracking
- [ ] Custom report integration

**Days 3-4:** Addepar Integration
- [ ] OAuth flow setup
- [ ] Analytics data sync
- [ ] Risk metrics integration
- [ ] Wealth plan data sync

**Days 5:** API & Endpoints
- [ ] Implement all REST endpoints
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Rate limiting and throttling
- [ ] Deploy to staging

### Week 31: Sync & Bidirectional Features
**Days 1-2:** Advanced Sync
- [ ] Bidirectional sync implementation
- [ ] Conflict detection and resolution
- [ ] Data reconciliation engine
- [ ] Sync scheduling and queuing

**Days 3-4:** Frontend Development
- [ ] Portfolio connections management UI
- [ ] Conflict resolution interface
- [ ] Real-time sync status dashboard
- [ ] Integration settings pages

**Days 5:** Testing & Performance
- [ ] End-to-end testing
- [ ] Performance testing (large portfolios)
- [ ] Load testing for concurrent syncs
- [ ] User acceptance testing

### Week 32: Monitoring, Documentation & Launch
**Days 1-2:** Monitoring & Observability
- [ ] Prometheus metrics implementation
- [ ] Grafana dashboard creation
- [ ] Alert rules configuration
- [ ] Logging and audit trail implementation

**Days 3-4:** Documentation & Launch Prep
- [ ] API documentation completion
- [ ] Admin guide and operations manual
- [ ] User documentation and tutorials
- [ ] Security audit and compliance check

**Days 5:** Production Deployment
- [ ] Staging to production migration
- [ ] Database backup and recovery procedures
- [ ] Incident response runbooks
- [ ] Go-live monitoring and support

---

## 9. Success Metrics

### 9.1 Functional Metrics

| Metric | Target | Measurement |
|---|---|---|
| Platform Integration Completeness | 100% for BD, Orion, Addepar | All endpoints functional and tested |
| Sync Success Rate | >99.5% | (Successful syncs / Total syncs) × 100 |
| Data Consistency | >99.8% | Holdings match across platforms ±1% |
| Sync Latency | <5 min (holdings), <2 min (transactions) | Time from platform update to Clearway |
| Conflict Resolution Rate | >95% auto-resolution | Conflicts resolved without manual intervention |
| Connection Stability | 99.9% uptime | (Available hours / Total hours) × 100 |
| API Response Time | <500ms (p95) | Measured from API load testing |

### 9.2 Performance Metrics

| Metric | Target | Notes |
|---|---|---|
| Holdings per portfolio | Support 50,000+ | Large institutional portfolios |
| Concurrent connections | Support 1,000+ simultaneous syncs | Load tested at 2x target |
| Data sync throughput | >10,000 records/min | Batch processing performance |
| Query response time | <1s for portfolio view | Dashboard load time |
| Database query p95 | <500ms | Peak load performance |
| Memory usage per sync | <500MB | Efficient streaming processing |
| OAuth token refresh time | <2s | Minimal user impact |

### 9.3 Quality Metrics

| Metric | Target | Tracking |
|---|---|---|
| Code coverage | >85% | Unit and integration tests |
| Defect escape rate | <0.5% | Post-launch issue tracking |
| Documentation completeness | 100% | README, API docs, guides |
| Error handling coverage | 95%+ | Exception handling in all paths |
| Security audit pass rate | 100% | Penetration testing results |
| Data encryption | 100% for credentials | All PII and tokens encrypted |

### 9.4 User Experience Metrics

| Metric | Target | Tracking |
|---|---|---|
| Time to connect new platform | <3 minutes | User flow timing |
| Conflict resolution time | <2 minutes | Average time to resolve |
| Support ticket volume | <2% of active users | Tracked in ticketing system |
| Feature adoption | >80% within 30 days | Usage analytics |
| User satisfaction | >4.2/5.0 | Post-feature survey |

### 9.5 Operational Metrics

| Metric | Target | Tracking |
|---|---|---|
| Incident resolution time | <2 hours | P1 issues |
| Alert false positive rate | <5% | Alert tuning over time |
| Backup success rate | 100% | Daily automated backups |
| Disaster recovery time (RTO) | <1 hour | Tested quarterly |
| Data recovery completeness (RPO) | <15 minutes | Latest backup age |
| System monitoring coverage | >95% | Services with active monitoring |

---

## 10. Risk Mitigation

### 10.1 Technical Risks

**Risk:** Inconsistent data across platforms
- **Mitigation:** Implement reconciliation engine with automatic conflict detection and user review interface
- **Monitoring:** Track conflict rates and resolution success metrics

**Risk:** API rate limiting causing sync failures
- **Mitigation:** Implement exponential backoff, priority queuing, sync scheduling optimization
- **Monitoring:** Track API rate limit utilization and adjust thresholds

**Risk:** Authentication token expiration
- **Mitigation:** Implement proactive refresh 5 minutes before expiry, user notifications
- **Monitoring:** Track token refresh success rates

### 10.2 Data Security Risks

**Risk:** Credential compromise
- **Mitigation:** AES-256 encryption at rest, TLS in transit, regular key rotation
- **Monitoring:** Audit access to credential storage

**Risk:** Data breach via API
- **Mitigation:** API authentication, rate limiting, input validation, output encoding
- **Monitoring:** WAF rules, intrusion detection

---

## 11. Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed
- [ ] Security audit completed
- [ ] Performance testing passed
- [ ] Database migrations tested
- [ ] Backup procedures verified
- [ ] Monitoring and alerts configured
- [ ] Documentation finalized
- [ ] Runbooks prepared

### Deployment
- [ ] Database migrations run
- [ ] API deployed to production
- [ ] Frontend deployed to CDN
- [ ] SSL certificates verified
- [ ] DNS updated (if needed)
- [ ] Smoke tests executed
- [ ] Customer notification sent
- [ ] Support team briefed

### Post-Deployment
- [ ] Monitor error rates (first 24 hours)
- [ ] Verify all data syncs working
- [ ] Check database performance
- [ ] Review user feedback
- [ ] Validate no data loss
- [ ] Confirm backup procedures working
- [ ] Document any post-deploy fixes

---

## 12. Conclusion

The Portfolio Integration Agent represents a critical infrastructure component for Clearway Phase 3, enabling seamless multi-platform portfolio management. With comprehensive support for Black Diamond, Orion, and Addepar, combined with sophisticated sync logic, conflict resolution, and real-time monitoring, the agent provides enterprise-grade portfolio data integration while maintaining data consistency and security.

The phased implementation approach (Weeks 29-32) ensures each platform integration is thoroughly tested before moving forward, while the monitoring and observability features enable early detection and resolution of issues post-launch.

Success metrics are clearly defined across functional, performance, quality, UX, and operational dimensions, enabling data-driven assessment of implementation success and continuous improvement.
