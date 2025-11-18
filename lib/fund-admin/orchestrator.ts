/**
 * Unified Fund Admin Sync Orchestrator
 * Task FA-006: BullMQ queue for daily and on-demand syncs
 */

import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { db } from '@/lib/db';
import { SSCAuthClient } from './ssc/auth';
import { SSCCapitalCallSyncService } from './ssc/capital-calls';
import { InvestorRosterSyncService } from './ssc/investor-sync';
import { CartaFundAdminClient } from './carta/client';
import { type SyncType } from './types';

// ============================================
// REDIS CONNECTION
// ============================================

const createRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
  });
};

// ============================================
// SYNC JOB TYPES
// ============================================

export interface SyncJobData {
  administrator: string;
  accountId: string;
  syncType: SyncType;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  since?: string; // ISO date string
}

// ============================================
// QUEUE CONFIGURATION
// ============================================

export const fundAdminSyncQueue = new Queue<SyncJobData>('fund-admin-sync', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 seconds
    },
    removeOnComplete: {
      age: 7 * 24 * 3600, // Keep for 7 days
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 30 * 24 * 3600, // Keep failed jobs for 30 days
    },
  },
});

// ============================================
// ORCHESTRATOR CLASS
// ============================================

export class FundAdminOrchestrator {
  /**
   * Schedule daily syncs for all active connections
   * Should be called by a cron job (e.g., every day at 2 AM)
   */
  async scheduleDailySyncs(): Promise<number> {
    const connections = await db.fundAdminConnection.findMany({
      where: {
        status: 'ACTIVE',
        syncEnabled: true,
      },
    });

    let scheduled = 0;

    for (const connection of connections) {
      try {
        // Schedule capital call sync
        await fundAdminSyncQueue.add(
          'sync-capital-calls',
          {
            administrator: connection.administrator,
            accountId: connection.accountId,
            syncType: 'CAPITAL_CALLS',
            priority: 'NORMAL',
          },
          {
            jobId: `${connection.administrator}-${connection.accountId}-capital-calls-${new Date().toISOString().split('T')[0]}`,
          }
        );

        // Schedule investor sync (less frequent, can be done weekly)
        const dayOfWeek = new Date().getDay();
        if (dayOfWeek === 1) {
          // Monday
          await fundAdminSyncQueue.add(
            'sync-investors',
            {
              administrator: connection.administrator,
              accountId: connection.accountId,
              syncType: 'INVESTORS',
              priority: 'NORMAL',
            },
            {
              jobId: `${connection.administrator}-${connection.accountId}-investors-${new Date().toISOString().split('T')[0]}`,
            }
          );
        }

        scheduled++;
      } catch (error) {
        console.error(
          `Failed to schedule sync for ${connection.administrator} account ${connection.accountId}:`,
          error
        );
      }
    }

    return scheduled;
  }

  /**
   * Trigger an immediate sync for a specific connection
   */
  async syncNow(
    connectionId: string,
    syncType: SyncType
  ): Promise<Job<SyncJobData>> {
    const connection = await db.fundAdminConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    return fundAdminSyncQueue.add(
      'sync-on-demand',
      {
        administrator: connection.administrator,
        accountId: connection.accountId,
        syncType,
        priority: 'HIGH',
      },
      {
        priority: 1, // High priority
      }
    );
  }

  /**
   * Sync all active connections immediately (for testing/admin)
   */
  async syncAll(syncType: SyncType): Promise<Job<SyncJobData>[]> {
    const connections = await db.fundAdminConnection.findMany({
      where: {
        status: 'ACTIVE',
        syncEnabled: true,
      },
    });

    const jobs = await Promise.all(
      connections.map((connection) =>
        fundAdminSyncQueue.add('sync-all', {
          administrator: connection.administrator,
          accountId: connection.accountId,
          syncType,
          priority: 'NORMAL',
        })
      )
    );

    return jobs;
  }

  /**
   * Get sync queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      fundAdminSyncQueue.getWaitingCount(),
      fundAdminSyncQueue.getActiveCount(),
      fundAdminSyncQueue.getCompletedCount(),
      fundAdminSyncQueue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed,
    };
  }

  /**
   * Get failed jobs for manual review
   */
  async getFailedJobs(limit = 50) {
    const failed = await fundAdminSyncQueue.getFailed(0, limit);
    return failed.map((job) => ({
      id: job.id,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    }));
  }

  /**
   * Retry a failed job
   */
  async retryFailedJob(jobId: string): Promise<void> {
    const job = await fundAdminSyncQueue.getJob(jobId);
    if (job) {
      await job.retry();
    }
  }

  /**
   * Clear all completed jobs (for cleanup)
   */
  async cleanCompleted(): Promise<void> {
    await fundAdminSyncQueue.clean(0, 100, 'completed');
  }
}

// ============================================
// WORKER IMPLEMENTATION
// ============================================

/**
 * Worker to process fund admin sync jobs
 * This should run in a separate process or server
 */
export const createSyncWorker = () => {
  return new Worker<SyncJobData>(
    'fund-admin-sync',
    async (job) => {
      const { administrator, accountId, syncType, since } = job.data;

      console.log(
        `Processing sync job: ${administrator} ${accountId} ${syncType}`
      );

      try {
        // Get appropriate sync service
        const syncService = await getSyncService(administrator, accountId);

        let result;

        // Execute sync based on type
        if (syncType === 'CAPITAL_CALLS') {
          result = await syncService.syncCapitalCalls(
            since ? new Date(since) : undefined
          );
        } else if (syncType === 'INVESTORS') {
          result = await syncService.syncInvestors(accountId);
        } else {
          throw new Error(`Unsupported sync type: ${syncType}`);
        }

        // Update last sync time
        await db.fundAdminConnection.updateMany({
          where: {
            administrator,
            accountId,
          },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus:
              result.failed === 0 ? 'SUCCESS' : 'PARTIAL_FAILURE',
          },
        });

        return result;
      } catch (error) {
        console.error(
          `Sync job failed for ${administrator} ${accountId}:`,
          error
        );

        // Update connection status
        await db.fundAdminConnection.updateMany({
          where: {
            administrator,
            accountId,
          },
          data: {
            lastSyncStatus: 'FAILURE',
          },
        });

        throw error; // Re-throw to mark job as failed
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 5, // Process 5 syncs concurrently
      limiter: {
        max: 10, // Max 10 jobs
        duration: 1000, // Per second
      },
    }
  );
};

// ============================================
// SYNC SERVICE FACTORY
// ============================================

/**
 * Get appropriate sync service based on administrator
 */
async function getSyncService(
  administrator: string,
  accountId: string
): Promise<{
  syncCapitalCalls: (since?: Date) => Promise<{ synced: number; failed: number; errors: any[] }>;
  syncInvestors: (fundId: string) => Promise<{ new: number; updated: number; unmapped: number }>;
}> {
  switch (administrator) {
    case 'SSC_GENEVA': {
      const authClient = new SSCAuthClient(
        process.env.SSC_CLIENT_ID!,
        process.env.SSC_CLIENT_SECRET!,
        process.env.SSC_API_URL!
      );

      return {
        syncCapitalCalls: async (since?: Date) => {
          const service = new SSCCapitalCallSyncService(authClient, accountId);
          return service.syncCapitalCalls(since);
        },
        syncInvestors: async (fundId: string) => {
          const service = new InvestorRosterSyncService(authClient, accountId);
          return service.syncInvestorRoster(fundId);
        },
      };
    }

    case 'CARTA': {
      const client = new CartaFundAdminClient(process.env.CARTA_API_KEY!);

      return {
        syncCapitalCalls: async (since?: Date) => {
          // Implement Carta capital call sync
          const calls = await client.getCapitalCalls(accountId, { since });
          // Process calls similar to Geneva sync
          return { synced: calls.length, failed: 0, errors: [] };
        },
        syncInvestors: async (fundId: string) => {
          // Implement Carta investor sync
          const investors = await client.getInvestors(fundId);
          // Process investors similar to Geneva sync
          return { new: investors.length, updated: 0, unmapped: 0 };
        },
      };
    }

    case 'JUNIPER_SQUARE':
    case 'ALTVIA':
    case 'ALLVUE':
      throw new Error(`${administrator} integration not yet implemented`);

    default:
      throw new Error(`Unsupported administrator: ${administrator}`);
  }
}
