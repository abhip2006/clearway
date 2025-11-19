/**
 * Sync Engine
 * Orchestrates synchronization operations across all portfolio platforms
 */

import { PortfolioConnection, Platform } from '../../models/PortfolioConnection';
import { SyncOperation, SyncDirection, DataType, SyncOperationStatus } from '../../models/SyncOperation';
import { BlackDiamondService } from '../integrations/BlackDiamondService';
import { OrionService } from '../integrations/OrionService';
import { AddeparService } from '../integrations/AddeparService';
import { ConflictResolver } from './ConflictResolver';

interface SyncResult {
  success: boolean;
  operation: SyncOperation;
  errors: any[];
}

interface SyncConfig {
  blackDiamond: any;
  orion: any;
  addepar: any;
}

export class SyncEngine {
  private blackDiamondService: BlackDiamondService;
  private orionService: OrionService;
  private addeparService: AddeparService;
  private conflictResolver: ConflictResolver;

  constructor(config: SyncConfig) {
    this.blackDiamondService = new BlackDiamondService(config.blackDiamond);
    this.orionService = new OrionService(config.orion);
    this.addeparService = new AddeparService(config.addepar);
    this.conflictResolver = new ConflictResolver();
  }

  /**
   * Start a synchronization operation
   */
  async sync(
    connection: PortfolioConnection,
    dataTypes: DataType[] = [DataType.ALL],
    force: boolean = false
  ): Promise<SyncResult> {
    // Create sync operation record
    const operation: SyncOperation = {
      id: this.generateId(),
      connectionId: connection.id,
      direction: SyncDirection.PULL,
      dataType: dataTypes.length === 1 ? dataTypes[0] : DataType.ALL,
      status: SyncOperationStatus.PENDING,
      startedAt: new Date(),
      completedAt: undefined,
      recordsProcessed: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date()
    };

    try {
      // Save operation to database
      await this.saveSyncOperation(operation);

      // Update status to in progress
      operation.status = SyncOperationStatus.IN_PROGRESS;
      await this.updateSyncOperation(operation);

      // Execute sync based on platform
      const results = await this.executePlatformSync(connection, dataTypes);

      // Update operation with results
      operation.status = SyncOperationStatus.COMPLETED;
      operation.completedAt = new Date();
      operation.recordsProcessed = results.processed;
      operation.recordsInserted = results.inserted;
      operation.recordsUpdated = results.updated;
      operation.recordsSkipped = results.skipped;
      operation.recordsFailed = results.failed;

      await this.updateSyncOperation(operation);

      // Update connection metadata
      await this.updateConnectionAfterSync(connection, operation);

      return {
        success: true,
        operation,
        errors: results.errors || []
      };
    } catch (error: any) {
      // Handle sync failure
      operation.status = SyncOperationStatus.FAILED;
      operation.completedAt = new Date();
      operation.errorDetails = {
        message: error.message,
        stack: error.stack
      };

      await this.updateSyncOperation(operation);
      await this.handleSyncFailure(connection, operation, error);

      return {
        success: false,
        operation,
        errors: [error]
      };
    }
  }

  /**
   * Execute sync for specific platform
   */
  private async executePlatformSync(
    connection: PortfolioConnection,
    dataTypes: DataType[]
  ): Promise<any> {
    const results = {
      processed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Determine which service to use
    let service;
    switch (connection.platform) {
      case Platform.BLACK_DIAMOND:
        service = this.blackDiamondService;
        break;
      case Platform.ORION:
        service = this.orionService;
        break;
      case Platform.ADDEPAR:
        service = this.addeparService;
        break;
      default:
        throw new Error(`Unsupported platform: ${connection.platform}`);
    }

    // Sync each data type
    for (const dataType of dataTypes) {
      try {
        const typeResult = await this.syncDataType(connection, service, dataType);
        results.processed += typeResult.processed;
        results.inserted += typeResult.inserted;
        results.updated += typeResult.updated;
        results.skipped += typeResult.skipped;
        results.failed += typeResult.failed;

        if (typeResult.errors) {
          results.errors.push(...typeResult.errors);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(error);
      }
    }

    return results;
  }

  /**
   * Sync specific data type
   */
  private async syncDataType(
    connection: PortfolioConnection,
    service: any,
    dataType: DataType
  ): Promise<any> {
    const results = {
      processed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as any[]
    };

    switch (dataType) {
      case DataType.HOLDINGS:
        return await this.syncHoldings(connection, service);

      case DataType.TRANSACTIONS:
        return await this.syncTransactions(connection, service);

      case DataType.PERFORMANCE:
        return await this.syncPerformance(connection, service);

      case DataType.ALL:
        const holdingsResult = await this.syncHoldings(connection, service);
        const transactionsResult = await this.syncTransactions(connection, service);
        const performanceResult = await this.syncPerformance(connection, service);

        return {
          processed: holdingsResult.processed + transactionsResult.processed + performanceResult.processed,
          inserted: holdingsResult.inserted + transactionsResult.inserted + performanceResult.inserted,
          updated: holdingsResult.updated + transactionsResult.updated + performanceResult.updated,
          skipped: holdingsResult.skipped + transactionsResult.skipped + performanceResult.skipped,
          failed: holdingsResult.failed + transactionsResult.failed + performanceResult.failed,
          errors: [...holdingsResult.errors, ...transactionsResult.errors, ...performanceResult.errors]
        };

      default:
        return results;
    }
  }

  /**
   * Sync holdings
   */
  private async syncHoldings(connection: PortfolioConnection, service: any): Promise<any> {
    const results = {
      processed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as any[]
    };

    try {
      let holdings;

      // Fetch holdings based on platform
      if (connection.platform === Platform.BLACK_DIAMOND) {
        holdings = await service.fetchHoldings(connection);
      } else if (connection.platform === Platform.ORION) {
        holdings = await service.fetchPositions(connection);
      } else {
        // Addepar doesn't have direct holdings, skip
        return results;
      }

      results.processed = holdings.length;

      // Process each holding
      for (const holding of holdings) {
        try {
          const existingHolding = await this.findExistingHolding(connection, holding.securityId);

          if (existingHolding) {
            // Check for conflicts
            const conflict = await this.conflictResolver.detectHoldingConflict(
              existingHolding,
              holding
            );

            if (conflict.hasConflict) {
              // Handle conflict based on strategy
              await this.conflictResolver.resolveHoldingConflict(
                connection,
                existingHolding,
                holding,
                connection.conflictResolution
              );
            }

            await this.updateHolding(existingHolding.id, holding);
            results.updated++;
          } else {
            await this.insertHolding(connection, holding);
            results.inserted++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            securityId: holding.securityId,
            error: error
          });
        }
      }
    } catch (error) {
      results.failed++;
      results.errors.push(error);
    }

    return results;
  }

  /**
   * Sync transactions
   */
  private async syncTransactions(connection: PortfolioConnection, service: any): Promise<any> {
    const results = {
      processed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as any[]
    };

    try {
      if (connection.platform === Platform.ADDEPAR) {
        // Addepar doesn't provide transaction data
        return results;
      }

      // Fetch transactions from last sync
      const lastSyncDate = connection.lastSuccessfulSyncAt || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const transactions = await service.fetchTransactions(connection, lastSyncDate);

      results.processed = transactions.length;

      for (const transaction of transactions) {
        try {
          const exists = await this.transactionExists(connection, transaction);

          if (exists) {
            results.skipped++;
          } else {
            await this.insertTransaction(connection, transaction);
            results.inserted++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            transaction: transaction,
            error: error
          });
        }
      }
    } catch (error) {
      results.failed++;
      results.errors.push(error);
    }

    return results;
  }

  /**
   * Sync performance metrics
   */
  private async syncPerformance(connection: PortfolioConnection, service: any): Promise<any> {
    const results = {
      processed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as any[]
    };

    try {
      const periods = ['DAILY', 'WEEKLY', 'MONTHLY', 'YTD', '1Y', '3Y', '5Y'];

      for (const period of periods) {
        try {
          let metrics;

          if (connection.platform === Platform.BLACK_DIAMOND) {
            metrics = await service.fetchPerformance(connection, period);
          } else if (connection.platform === Platform.ADDEPAR) {
            // Use analytics data for performance
            const analytics = await service.fetchAnalytics(connection);
            metrics = [analytics.performanceAttribution];
          } else {
            // Orion: fetch performance report
            const report = await service.fetchReport(connection, 'PERFORMANCE');
            metrics = report.metrics || [];
          }

          results.processed += metrics.length;

          for (const metric of metrics) {
            const existing = await this.findExistingMetric(connection, period, metric.calculationDate);

            if (existing) {
              await this.updatePerformanceMetric(existing.id, metric);
              results.updated++;
            } else {
              await this.insertPerformanceMetric(connection, metric);
              results.inserted++;
            }
          }
        } catch (error) {
          results.failed++;
          results.errors.push({ period, error });
        }
      }
    } catch (error) {
      results.failed++;
      results.errors.push(error);
    }

    return results;
  }

  /**
   * Schedule automatic sync
   */
  async scheduleSync(connection: PortfolioConnection): Promise<void> {
    if (!connection.autoSync) {
      return;
    }

    const nextSyncAt = new Date(Date.now() + connection.syncFrequencyMinutes * 60 * 1000);

    // Update connection with next sync time
    await this.updateConnection(connection.id, { nextScheduledSyncAt: nextSyncAt });
  }

  /**
   * Retry failed sync operation
   */
  async retrySyncOperation(operation: SyncOperation): Promise<SyncResult> {
    if (operation.retryCount >= operation.maxRetries) {
      throw new Error('Max retries exceeded');
    }

    const connection = await this.getConnection(operation.connectionId);

    operation.retryCount++;
    operation.status = SyncOperationStatus.PENDING;
    operation.nextRetryAt = undefined;

    await this.updateSyncOperation(operation);

    const dataTypes = operation.dataType === DataType.ALL
      ? [DataType.HOLDINGS, DataType.TRANSACTIONS, DataType.PERFORMANCE]
      : [operation.dataType];

    return await this.sync(connection, dataTypes);
  }

  // Database operations (to be implemented with actual DB layer)
  private async saveSyncOperation(operation: SyncOperation): Promise<void> {
    // Save to database
    console.log('Saving sync operation:', operation.id);
  }

  private async updateSyncOperation(operation: SyncOperation): Promise<void> {
    // Update in database
    console.log('Updating sync operation:', operation.id);
  }

  private async updateConnectionAfterSync(connection: PortfolioConnection, operation: SyncOperation): Promise<void> {
    const updates: any = {
      lastSyncAt: new Date(),
      totalTransactionsSynced: connection.totalTransactionsSynced + operation.recordsProcessed
    };

    if (operation.status === SyncOperationStatus.COMPLETED) {
      updates.lastSuccessfulSyncAt = new Date();
      updates.errorCount = 0;
      updates.lastErrorMessage = null;

      // Calculate success rate
      const totalSyncs = await this.getTotalSyncCount(connection.id);
      const successfulSyncs = await this.getSuccessfulSyncCount(connection.id);
      updates.syncSuccessRate = successfulSyncs / totalSyncs;
    } else {
      updates.errorCount = connection.errorCount + 1;
      updates.lastErrorMessage = operation.errorDetails?.message;
    }

    await this.updateConnection(connection.id, updates);
  }

  private async handleSyncFailure(connection: PortfolioConnection, operation: SyncOperation, error: Error): Promise<void> {
    console.error(`Sync failed for connection ${connection.id}:`, error);

    // Schedule retry if applicable
    if (operation.retryCount < operation.maxRetries) {
      const retryDelay = Math.pow(2, operation.retryCount) * 60 * 1000; // Exponential backoff
      operation.nextRetryAt = new Date(Date.now() + retryDelay);
      await this.updateSyncOperation(operation);
    }
  }

  private async findExistingHolding(connection: PortfolioConnection, securityId: string): Promise<any> {
    // Query database for existing holding
    return null;
  }

  private async updateHolding(holdingId: string, holding: any): Promise<void> {
    // Update holding in database
    console.log('Updating holding:', holdingId);
  }

  private async insertHolding(connection: PortfolioConnection, holding: any): Promise<void> {
    // Insert holding into database
    console.log('Inserting holding for connection:', connection.id);
  }

  private async transactionExists(connection: PortfolioConnection, transaction: any): Promise<boolean> {
    // Check if transaction exists in database
    return false;
  }

  private async insertTransaction(connection: PortfolioConnection, transaction: any): Promise<void> {
    // Insert transaction into database
    console.log('Inserting transaction for connection:', connection.id);
  }

  private async findExistingMetric(connection: PortfolioConnection, period: string, date: Date): Promise<any> {
    // Query database for existing metric
    return null;
  }

  private async updatePerformanceMetric(metricId: string, metric: any): Promise<void> {
    // Update metric in database
    console.log('Updating performance metric:', metricId);
  }

  private async insertPerformanceMetric(connection: PortfolioConnection, metric: any): Promise<void> {
    // Insert metric into database
    console.log('Inserting performance metric for connection:', connection.id);
  }

  private async updateConnection(connectionId: string, updates: any): Promise<void> {
    // Update connection in database
    console.log('Updating connection:', connectionId);
  }

  private async getConnection(connectionId: string): Promise<PortfolioConnection> {
    // Get connection from database
    throw new Error('Not implemented');
  }

  private async getTotalSyncCount(connectionId: string): Promise<number> {
    // Get total sync count from database
    return 1;
  }

  private async getSuccessfulSyncCount(connectionId: string): Promise<number> {
    // Get successful sync count from database
    return 1;
  }

  private generateId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
