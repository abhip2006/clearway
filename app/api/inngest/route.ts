// app/api/inngest/route.ts
// Inngest API route handler

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { processDocument } from './functions/process-document';
import { sendReminders } from './functions/send-reminders';
import { classifyAndRouteDocument } from './functions/classify-and-route';
import { detectCapitalCallAnomalies } from './functions/detect-anomalies';
import { processCapitalCallEmail } from './functions/process-email';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Core functions
    processDocument,
    sendReminders,
    // Advanced AI functions (Phase 2)
    classifyAndRouteDocument,
    detectCapitalCallAnomalies,
    processCapitalCallEmail,
  ],
});
