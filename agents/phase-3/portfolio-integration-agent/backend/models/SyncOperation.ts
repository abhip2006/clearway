/**
 * Sync Operation Model
 * Tracks synchronization operations and errors
 */

export enum SyncDirection {
  PULL = 'PULL',
  PUSH = 'PUSH'
}

export enum DataType {
  HOLDINGS = 'HOLDINGS',
  TRANSACTIONS = 'TRANSACTIONS',
  PERFORMANCE = 'PERFORMANCE',
  ALL = 'ALL'
}

export enum SyncOperationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL'
}

export interface SyncOperation {
  id: string;
  connectionId: string;

  direction: SyncDirection;
  dataType: DataType;
  status: SyncOperationStatus;

  startedAt?: Date;
  completedAt?: Date;

  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;

  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;

  errorDetails?: any;

  createdAt: Date;
}

export interface SyncError {
  id: string;
  syncOperationId: string;

  recordId?: string;
  errorCode?: string;
  errorMessage?: string;
  severity: ErrorSeverity;
  retryable: boolean;

  context?: any;

  createdAt: Date;
}

export enum ErrorSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export interface SyncStatistics {
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  successRate: number;
}

export interface StartSyncInput {
  dataTypes?: DataType[];
  force?: boolean;
}

export interface SyncOperationDetails extends SyncOperation {
  duration?: string;
  statistics: SyncStatistics;
  errors: SyncError[];
  warnings: any[];
}
