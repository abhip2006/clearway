import { Model } from '@nozbe/watermelondb';
import { field, readonly } from '@nozbe/watermelondb/decorators';

export class CapitalCall extends Model {
  static table = 'capital_calls';

  @field('fund_id') fundId!: string;
  @field('amount') amount!: number;
  @field('due_date') dueDate!: string;
  @field('status') status!: string;
  @field('document_url') documentUrl?: string;
  @field('sync_status') syncStatus!: string;
  @field('synced_at') syncedAt?: number;

  @readonly @field('created_at') createdAt!: number;
  @readonly @field('updated_at') updatedAt!: number;
}
