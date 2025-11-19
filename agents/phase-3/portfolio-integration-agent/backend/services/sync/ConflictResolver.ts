/**
 * Conflict Resolver
 * Detects and resolves data conflicts between platforms
 */

import {
  PortfolioConflict,
  ConflictType,
  ConflictDataType,
  ConflictStatus,
  ConflictDetectionResult
} from '../../models/Conflict';
import { Holding, Transaction } from '../../models/Portfolio';
import { PortfolioConnection, ConflictResolution } from '../../models/PortfolioConnection';

// Tolerance thresholds
const QUANTITY_TOLERANCE = 0.01; // 1%
const VALUE_TOLERANCE = 0.02; // 2%
const TIME_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export class ConflictResolver {
  /**
   * Detect conflicts in holding data
   */
  async detectHoldingConflict(
    existingHolding: Holding,
    newHolding: Partial<Holding>
  ): Promise<ConflictDetectionResult> {
    const conflicts: ConflictType[] = [];

    // Check quantity mismatch
    if (newHolding.quantity && existingHolding.quantity) {
      const quantityDiff = Math.abs(newHolding.quantity - existingHolding.quantity);
      const quantityPercent = quantityDiff / existingHolding.quantity;

      if (quantityPercent > QUANTITY_TOLERANCE) {
        conflicts.push(ConflictType.QUANTITY_MISMATCH);
      }
    }

    // Check value mismatch
    if (newHolding.marketValue && existingHolding.marketValue) {
      const valueDiff = Math.abs(newHolding.marketValue - existingHolding.marketValue);
      const valuePercent = valueDiff / existingHolding.marketValue;

      if (valuePercent > VALUE_TOLERANCE) {
        conflicts.push(ConflictType.VALUE_MISMATCH);
      }
    }

    // Determine severity
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (conflicts.includes(ConflictType.QUANTITY_MISMATCH) || conflicts.includes(ConflictType.VALUE_MISMATCH)) {
      severity = 'MEDIUM';
    }

    return {
      hasConflict: conflicts.length > 0,
      conflictType: conflicts[0],
      severity,
      details: {
        conflicts,
        existingHolding,
        newHolding
      }
    };
  }

  /**
   * Detect conflicts across multiple sources
   */
  async detectMultiSourceConflict(
    holdings: Array<{ connectionId: string; holding: Partial<Holding> }>
  ): Promise<ConflictDetectionResult> {
    if (holdings.length < 2) {
      return { hasConflict: false, severity: 'LOW' };
    }

    const quantities = holdings.map(h => h.holding.quantity || 0);
    const values = holdings.map(h => h.holding.marketValue || 0);

    // Check quantity variance
    const maxQty = Math.max(...quantities);
    const minQty = Math.min(...quantities);
    const qtyVariance = maxQty > 0 ? (maxQty - minQty) / maxQty : 0;

    // Check value variance
    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
    const valueVariance = values.some(v => Math.abs(v - avgValue) / avgValue > VALUE_TOLERANCE);

    const conflicts: ConflictType[] = [];
    if (qtyVariance > QUANTITY_TOLERANCE) {
      conflicts.push(ConflictType.QUANTITY_MISMATCH);
    }
    if (valueVariance) {
      conflicts.push(ConflictType.VALUE_MISMATCH);
    }

    return {
      hasConflict: conflicts.length > 0,
      conflictType: conflicts[0],
      severity: conflicts.length > 1 ? 'HIGH' : 'MEDIUM',
      details: {
        conflicts,
        holdings,
        qtyVariance,
        valueVariance
      }
    };
  }

  /**
   * Resolve holding conflict based on strategy
   */
  async resolveHoldingConflict(
    connection: PortfolioConnection,
    existingHolding: Holding,
    newHolding: Partial<Holding>,
    strategy: ConflictResolution
  ): Promise<Holding> {
    switch (strategy) {
      case ConflictResolution.CLEARWAY_WINS:
        // Keep existing holding
        return existingHolding;

      case ConflictResolution.PLATFORM_WINS:
        // Use new holding data
        return {
          ...existingHolding,
          ...newHolding,
          updatedAt: new Date()
        };

      case ConflictResolution.MERGE:
        // Intelligently merge data
        return this.mergeHoldings(existingHolding, newHolding);

      case ConflictResolution.TIMESTAMP:
        // Use most recent data
        const existingTime = existingHolding.lastUpdated?.getTime() || 0;
        const newTime = newHolding.lastUpdated?.getTime() || 0;

        if (newTime > existingTime) {
          return {
            ...existingHolding,
            ...newHolding,
            updatedAt: new Date()
          };
        }
        return existingHolding;

      case ConflictResolution.MANUAL_REVIEW:
        // Create conflict record for manual review
        await this.createConflictRecord(
          connection.userId,
          existingHolding.portfolioId,
          ConflictType.QUANTITY_MISMATCH,
          ConflictDataType.HOLDING,
          existingHolding,
          newHolding
        );
        return existingHolding;

      default:
        return existingHolding;
    }
  }

  /**
   * Merge two holdings intelligently
   */
  private mergeHoldings(existing: Holding, incoming: Partial<Holding>): Holding {
    return {
      ...existing,
      // Use incoming quantity if provided
      quantity: incoming.quantity || existing.quantity,

      // Average market values if both exist
      marketValue: incoming.marketValue && existing.marketValue
        ? (incoming.marketValue + existing.marketValue) / 2
        : incoming.marketValue || existing.marketValue,

      // Keep existing cost basis unless incoming is more recent
      costBasis: incoming.costBasis || existing.costBasis,

      // Recalculate unrealized gain
      unrealizedGain: incoming.marketValue && existing.costBasis
        ? incoming.marketValue - existing.costBasis
        : existing.unrealizedGain,

      // Use most recent timestamp
      lastUpdated: incoming.lastUpdated || existing.lastUpdated,
      updatedAt: new Date()
    };
  }

  /**
   * Detect transaction duplicates
   */
  async detectTransactionDuplicate(
    existingTransactions: Transaction[],
    newTransaction: Partial<Transaction>
  ): Promise<ConflictDetectionResult> {
    for (const existing of existingTransactions) {
      // Check if transactions are duplicates
      const sameDate = this.datesMatch(existing.transactionDate, newTransaction.transactionDate);
      const sameSecurity = existing.securityId === newTransaction.securityId;
      const sameType = existing.type === newTransaction.type;
      const sameAmount = Math.abs((existing.amount || 0) - (newTransaction.amount || 0)) < 0.01;

      if (sameDate && sameSecurity && sameType && sameAmount) {
        return {
          hasConflict: true,
          conflictType: ConflictType.DUPLICATE,
          severity: 'LOW',
          details: {
            existingTransaction: existing,
            newTransaction
          }
        };
      }
    }

    return { hasConflict: false, severity: 'LOW' };
  }

  /**
   * Reconcile holdings across multiple platforms
   */
  async reconcileHoldings(
    portfolioId: string,
    holdings: Array<{ connectionId: string; platform: string; holdings: Partial<Holding>[] }>
  ): Promise<any> {
    const reconciliationResults = {
      totalSecurities: 0,
      conflicts: [] as any[],
      recommendations: [] as any[]
    };

    // Group holdings by security ID
    const securitiesMap = new Map<string, Array<{ connectionId: string; platform: string; holding: Partial<Holding> }>>();

    for (const source of holdings) {
      for (const holding of source.holdings) {
        if (!holding.securityId) continue;

        if (!securitiesMap.has(holding.securityId)) {
          securitiesMap.set(holding.securityId, []);
        }

        securitiesMap.get(holding.securityId)!.push({
          connectionId: source.connectionId,
          platform: source.platform,
          holding
        });
      }
    }

    reconciliationResults.totalSecurities = securitiesMap.size;

    // Check each security for conflicts
    for (const [securityId, sources] of securitiesMap.entries()) {
      if (sources.length > 1) {
        const conflict = await this.detectMultiSourceConflict(
          sources.map(s => ({ connectionId: s.connectionId, holding: s.holding }))
        );

        if (conflict.hasConflict) {
          reconciliationResults.conflicts.push({
            securityId,
            conflictType: conflict.conflictType,
            severity: conflict.severity,
            sources: sources.map(s => ({
              platform: s.platform,
              quantity: s.holding.quantity,
              value: s.holding.marketValue
            }))
          });

          // Generate recommendation
          reconciliationResults.recommendations.push({
            securityId,
            recommendation: this.generateRecommendation(conflict),
            reason: `Detected ${conflict.conflictType} across ${sources.length} platforms`
          });
        }
      }
    }

    return reconciliationResults;
  }

  /**
   * Generate recommendation for conflict resolution
   */
  private generateRecommendation(conflict: ConflictDetectionResult): string {
    switch (conflict.severity) {
      case 'HIGH':
        return 'MANUAL_REVIEW_REQUIRED';
      case 'MEDIUM':
        return 'USE_AVERAGE_VALUE';
      case 'LOW':
        return 'USE_MOST_RECENT';
      default:
        return 'NO_ACTION_NEEDED';
    }
  }

  /**
   * Create conflict record in database
   */
  private async createConflictRecord(
    userId: string,
    portfolioId: string,
    conflictType: ConflictType,
    dataType: ConflictDataType,
    clearwayData: any,
    platformData: any
  ): Promise<void> {
    const conflict: PortfolioConflict = {
      id: this.generateId(),
      portfolioId,
      conflictType,
      dataType,
      clearwayData,
      platformData,
      status: ConflictStatus.PENDING,
      createdAt: new Date()
    };

    // Save to database
    console.log('Creating conflict record:', conflict.id);
  }

  /**
   * Resolve conflict manually
   */
  async resolveConflictManually(
    conflictId: string,
    userId: string,
    resolution: 'CLEARWAY_WINS' | 'PLATFORM_WINS' | 'MERGE',
    mergedValue?: any
  ): Promise<void> {
    const conflict = await this.getConflict(conflictId);

    if (!conflict) {
      throw new Error('Conflict not found');
    }

    let resolvedData;
    switch (resolution) {
      case 'CLEARWAY_WINS':
        resolvedData = conflict.clearwayData;
        break;
      case 'PLATFORM_WINS':
        resolvedData = conflict.platformData;
        break;
      case 'MERGE':
        resolvedData = mergedValue;
        break;
    }

    // Update conflict status
    conflict.status = ConflictStatus.RESOLVED;
    conflict.resolutionStrategy = resolution;
    conflict.reviewedBy = userId;
    conflict.reviewedAt = new Date();
    conflict.resolvedAt = new Date();

    // Save resolution
    await this.updateConflict(conflict);

    // Apply resolved data
    await this.applyResolvedData(conflict, resolvedData);
  }

  /**
   * Check if two dates match (within time window)
   */
  private datesMatch(date1?: Date, date2?: Date): boolean {
    if (!date1 || !date2) return false;

    const diff = Math.abs(new Date(date1).getTime() - new Date(date2).getTime());
    return diff < TIME_WINDOW_MS;
  }

  /**
   * Helper methods (to be implemented with actual DB layer)
   */
  private async getConflict(conflictId: string): Promise<PortfolioConflict | null> {
    // Get from database
    return null;
  }

  private async updateConflict(conflict: PortfolioConflict): Promise<void> {
    // Update in database
    console.log('Updating conflict:', conflict.id);
  }

  private async applyResolvedData(conflict: PortfolioConflict, data: any): Promise<void> {
    // Apply resolved data to database
    console.log('Applying resolved data for conflict:', conflict.id);
  }

  private generateId(): string {
    return `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
