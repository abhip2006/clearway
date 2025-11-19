import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'capital_calls',
      columns: [
        { name: 'fund_id', type: 'string', isIndexed: true },
        { name: 'amount', type: 'number' },
        { name: 'due_date', type: 'string' },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'document_url', type: 'string', isOptional: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'sync_status', type: 'string' }, // 'SYNCED' | 'PENDING' | 'FAILED'
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'documents',
      columns: [
        { name: 'capital_call_id', type: 'string', isIndexed: true },
        { name: 'local_path', type: 'string' },
        { name: 'remote_url', type: 'string', isOptional: true },
        { name: 'status', type: 'string' }, // 'LOCAL' | 'UPLOADING' | 'UPLOADED'
        { name: 'file_size', type: 'number' },
        { name: 'mime_type', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'entity_type', type: 'string', isIndexed: true }, // 'CAPITAL_CALL', 'DOCUMENT'
        { name: 'entity_id', type: 'string', isIndexed: true },
        { name: 'action', type: 'string' }, // 'CREATE', 'UPDATE', 'DELETE'
        { name: 'payload', type: 'string' }, // JSON
        { name: 'retry_count', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'notifications',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'body', type: 'string' },
        { name: 'type', type: 'string' }, // 'CAPITAL_CALL', 'APPROVAL', 'NOTIFICATION'
        { name: 'related_id', type: 'string', isOptional: true },
        { name: 'read', type: 'boolean' },
        { name: 'action_url', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
