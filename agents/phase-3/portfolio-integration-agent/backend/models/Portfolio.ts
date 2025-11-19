/**
 * Portfolio Model
 * Represents a consolidated portfolio combining data from multiple platforms
 */

export enum SyncStatus {
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED'
}

export enum ConsolidationStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  FAILED = 'FAILED'
}

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  totalValue?: number;
  baseCurrency: string;

  syncStatus: SyncStatus;
  consolidationStatus: ConsolidationStatus;

  // Portfolio settings
  includeAllConnections: boolean;
  weightedAverageMethod?: string;
  rebalancingThreshold?: number;

  createdAt: Date;
  updatedAt: Date;

  // Relations
  connections?: PortfolioConnectionMapping[];
  holdings?: Holding[];
  transactions?: Transaction[];
}

export interface PortfolioConnectionMapping {
  id: string;
  portfolioId: string;
  connectionId: string;
  weight?: number;
  includeInTotals: boolean;
  createdAt: Date;
}

export interface CreatePortfolioInput {
  name: string;
  baseCurrency?: string;
  connections?: string[];
  weightedAggregation?: boolean;
}

export interface PortfolioSummary {
  totalHoldings: number;
  totalTransactions: number;
  topHoldings: Holding[];
  assetAllocation: AssetAllocation[];
}

export interface AssetAllocation {
  assetClass: string;
  value: number;
  percentage: number;
}

export interface Holding {
  id: string;
  portfolioId: string;
  securityId: string;
  ticker?: string;
  isin?: string;
  cusip?: string;
  securityName?: string;

  quantity: number;
  marketValue: number;
  costBasis?: number;
  unrealizedGain?: number;
  percentOfPortfolio?: number;

  currency: string;
  assetClass?: string;

  lastUpdated?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Source tracking
  sources?: SourceHolding[];
}

export interface SourceHolding {
  id: string;
  holdingId: string;
  connectionId: string;

  platformHoldingId: string;
  platformAccountId?: string;

  quantity: number;
  marketValue: number;
  costBasis?: number;

  confidence?: number;

  lastSyncedAt?: Date;
  platformLastUpdated?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  portfolioId: string;
  securityId: string;

  transactionDate: Date;
  settlementDate?: Date;

  type: TransactionType;
  quantity?: number;
  price?: number;
  amount: number;
  currency: string;
  fee?: number;
  description?: string;

  status: TransactionStatus;

  createdAt: Date;
  updatedAt: Date;

  sources?: SourceTransaction[];
}

export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  DIVIDEND = 'DIVIDEND',
  INTEREST = 'INTEREST',
  FEE = 'FEE',
  TRANSFER = 'TRANSFER'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface SourceTransaction {
  id: string;
  transactionId: string;
  connectionId: string;

  platformTransactionId: string;
  platformTransactionDate?: Date;

  syncedAt?: Date;
  createdAt: Date;
}

export interface PerformanceMetric {
  id: string;
  portfolioId: string;

  period: Period;

  returnValue?: number;
  returnPercent?: number;
  benchmarkReturn?: number;
  excessReturn?: number;

  calculationDate: Date;

  createdAt: Date;
  updatedAt: Date;
}

export enum Period {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YTD = 'YTD',
  ONE_YEAR = '1Y',
  THREE_YEAR = '3Y',
  FIVE_YEAR = '5Y',
  INCEPTION = 'INCEPTION'
}
