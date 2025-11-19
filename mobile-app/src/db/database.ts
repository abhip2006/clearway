import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Database } from '@nozbe/watermelondb';
import { schema } from './schema';
import { CapitalCall } from './models/CapitalCall';
import { Document } from './models/Document';
import { SyncQueue } from './models/SyncQueue';
import { Notification } from './models/Notification';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'clearway_mobile',
  jsi: true,
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [CapitalCall, Document, SyncQueue, Notification],
});
