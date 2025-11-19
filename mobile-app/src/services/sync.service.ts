import { database } from '../db/database';
import { useCapitalCallsStore } from '../store/capital-calls.store';
import { useAuthStore } from '../store/auth.store';
import NetInfo from '@react-native-community/netinfo';
import { Q } from '@nozbe/watermelondb';

const API_URL = process.env.API_URL || 'https://api.clearway.app';

export class SyncService {
  private isSyncing = false;
  private syncInterval: NodeJS.Timer | null = null;

  /**
   * Initialize sync
   */
  async initialize(): Promise<void> {
    // Monitor network state
    NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        this.syncPendingChanges();
      }
    });

    // Periodic sync check (every 5 minutes)
    this.syncInterval = setInterval(() => {
      this.syncPendingChanges();
    }, 5 * 60 * 1000);

    // Initial sync
    await this.syncPendingChanges();
  }

  /**
   * Sync pending changes to server
   */
  async syncPendingChanges(): Promise<void> {
    if (this.isSyncing) return;

    this.isSyncing = true;
    try {
      const collection = database.get('sync_queue');
      const pendingItems = await collection
        .query(Q.where('retry_count', Q.lt(3)))
        .fetch();

      for (const item of pendingItems) {
        await this.syncItem(item);
      }

      // Fetch latest data from server
      await this.pullLatestData();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync single item
   */
  private async syncItem(item: any): Promise<void> {
    try {
      const payload = JSON.parse(item.payload);

      const response = await fetch(
        `${API_URL}/sync/${item.entityType.toLowerCase()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${useAuthStore.getState().token}`,
          },
          body: JSON.stringify({
            action: item.action,
            data: payload,
          }),
        }
      );

      if (response.ok) {
        await item.markAsSynced();
      } else {
        await item.incrementRetry();
      }
    } catch (error) {
      console.error('Item sync failed:', error);
      await item.incrementRetry();
    }
  }

  /**
   * Pull latest data from server
   */
  private async pullLatestData(): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/sync/pull`, {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();

      // Update capital calls
      if (data.capitalCalls) {
        const collection = database.get('capital_calls');
        await database.write(async () => {
          for (const call of data.capitalCalls) {
            await collection.create((record: any) => {
              record.fundId = call.fundId;
              record.amount = call.amount;
              record.dueDate = call.dueDate;
              record.status = call.status;
              record.syncStatus = 'SYNCED';
            });
          }
        });
        useCapitalCallsStore.setState({
          capitalCalls: data.capitalCalls,
        });
      }
    } catch (error) {
      console.error('Pull data failed:', error);
    }
  }

  /**
   * Queue action for sync
   */
  async queueAction(
    entityType: string,
    entityId: string,
    action: string,
    payload: any
  ): Promise<void> {
    const collection = database.get('sync_queue');
    await database.write(async () => {
      await collection.create((record: any) => {
        record.entityType = entityType;
        record.entityId = entityId;
        record.action = action;
        record.payload = JSON.stringify(payload);
        record.retryCount = 0;
      });
    });

    // Try to sync immediately if online
    this.syncPendingChanges();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export const syncService = new SyncService();
