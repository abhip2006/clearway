import { Model } from '@nozbe/watermelondb';
import { field, readonly } from '@nozbe/watermelondb/decorators';

export class SyncQueue extends Model {
  static table = 'sync_queue';

  @field('entity_type') entityType!: string;
  @field('entity_id') entityId!: string;
  @field('action') action!: string;
  @field('payload') payload!: string;
  @field('retry_count') retryCount!: number;
  @field('last_error') lastError?: string;

  @readonly @field('created_at') createdAt!: number;

  async markAsSynced(): Promise<void> {
    await this.destroyPermanently();
  }

  async incrementRetry(): Promise<void> {
    await this.update((record) => {
      record.retryCount = this.retryCount + 1;
    });
  }
}
