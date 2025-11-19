/**
 * Portfolio Connection Model
 * Represents a connection to an external portfolio platform
 */

export enum Platform {
  BLACK_DIAMOND = 'BLACK_DIAMOND',
  ORION = 'ORION',
  ADDEPAR = 'ADDEPAR'
}

export enum ConnectionStatus {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  SYNC_FAILED = 'SYNC_FAILED'
}

export enum ConflictResolution {
  CLEARWAY_WINS = 'CLEARWAY_WINS',
  PLATFORM_WINS = 'PLATFORM_WINS',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  MERGE = 'MERGE',
  TIMESTAMP = 'TIMESTAMP'
}

export interface OAuthCredentials {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  scope: string[];
}

export interface DataFilters {
  includedAssetClasses?: string[];
  excludedSecurities?: string[];
  minValue?: number;
}

export interface ConnectionStatistics {
  totalHoldings: number;
  totalTransactions: number;
  totalValue: number;
  lastDataPoint: Date;
}

export interface PortfolioConnection {
  id: string;
  userId: string;
  platform: Platform;
  accountId: string;
  displayName?: string;
  status: ConnectionStatus;

  // OAuth credentials (encrypted)
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  oauthScope?: string;

  // Sync metadata
  lastSyncAt?: Date;
  lastSuccessfulSyncAt?: Date;
  nextScheduledSyncAt?: Date;
  syncFrequencyMinutes: number;

  // Settings
  autoSync: boolean;
  bidirectionalSync: boolean;
  conflictResolution: ConflictResolution;
  includedAssetClasses?: string[];
  excludedSecurities?: string[];
  minHoldingValue?: number;

  // Statistics
  totalTransactionsSynced: number;
  lastErrorMessage?: string;
  errorCount: number;
  syncSuccessRate?: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePortfolioConnectionInput {
  platform: Platform;
  accountId?: string;
  bidirectionalSync?: boolean;
  displayName?: string;
  syncFrequencyMinutes?: number;
  dataFilters?: DataFilters;
}

export interface UpdatePortfolioConnectionInput {
  displayName?: string;
  autoSync?: boolean;
  syncFrequencyMinutes?: number;
  bidirectionalSync?: boolean;
  conflictResolution?: ConflictResolution;
  dataFilters?: DataFilters;
}
