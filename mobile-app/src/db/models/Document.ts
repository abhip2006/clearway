import { Model } from '@nozbe/watermelondb';
import { field, readonly } from '@nozbe/watermelondb/decorators';

export class Document extends Model {
  static table = 'documents';

  @field('capital_call_id') capitalCallId!: string;
  @field('local_path') localPath!: string;
  @field('remote_url') remoteUrl?: string;
  @field('status') status!: string;
  @field('file_size') fileSize!: number;
  @field('mime_type') mimeType!: string;

  @readonly @field('created_at') createdAt!: number;
}
