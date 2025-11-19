/**
 * Portfolio Conflict Model
 * Tracks data conflicts between platforms requiring resolution
 */

export enum ConflictType {
  DUPLICATE = 'DUPLICATE',
  QUANTITY_MISMATCH = 'QUANTITY_MISMATCH',
  VALUE_MISMATCH = 'VALUE_MISMATCH',
  MISSING_SOURCE = 'MISSING_SOURCE'
}

export enum ConflictDataType {
  HOLDING = 'HOLDING',
  TRANSACTION = 'TRANSACTION'
}

export enum ConflictStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  IGNORED = 'IGNORED'
}

export interface PortfolioConflict {
  id: string;
  portfolioId: string;

  conflictType: ConflictType;
  dataType: ConflictDataType;

  primarySourceId?: string;
  conflictingSourceId?: string;

  clearwayData?: any;
  platformData?: any;

  status: ConflictStatus;
  resolutionStrategy?: string;

  reviewedBy?: string;
  reviewedAt?: Date;

  createdAt: Date;
  resolvedAt?: Date;
}

export interface ConflictSource {
  connection: string;
  platform: string;
  quantity?: number;
  value?: number;
  data?: any;
}

export interface ResolveConflictInput {
  resolution: 'CLEARWAY_WINS' | 'PLATFORM_WINS' | 'MERGE';
  mergedValue?: any;
}

export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflictType?: ConflictType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  details?: any;
}

export interface ReconciliationInput {
  portfolioId: string;
  scope: 'ALL' | 'HOLDINGS' | 'TRANSACTIONS';
  ignoreMinorDifferences?: boolean;
}

export interface ReconciliationResult {
  id: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  startedAt: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
  summary?: ReconciliationSummary;
  discrepancies?: Discrepancy[];
  recommendations?: Recommendation[];
}

export interface ReconciliationSummary {
  itemsReconciled: number;
  discrepancies: number;
  accuracy: number;
}

export interface Discrepancy {
  id: string;
  type: 'QUANTITY_VARIANCE' | 'VALUE_VARIANCE' | 'MISSING_DATA';
  security: string;
  expectedQty?: number;
  actualQty?: number;
  variance?: number;
  variancePercent?: number;
  sources: string[];
}

export interface Recommendation {
  discrepancyId: string;
  recommendation: string;
  reason: string;
}
