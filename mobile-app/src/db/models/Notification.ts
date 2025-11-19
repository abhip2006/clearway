import { Model } from '@nozbe/watermelondb';
import { field, readonly } from '@nozbe/watermelondb/decorators';

export class Notification extends Model {
  static table = 'notifications';

  @field('title') title!: string;
  @field('body') body!: string;
  @field('type') type!: string;
  @field('related_id') relatedId?: string;
  @field('read') read!: boolean;
  @field('action_url') actionUrl?: string;

  @readonly @field('created_at') createdAt!: number;
}
