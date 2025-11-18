// app/api/inngest/route.ts
// Inngest API route handler

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { processDocument } from './functions/process-document';
import { sendReminders } from './functions/send-reminders';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processDocument,
    sendReminders,
  ],
});
