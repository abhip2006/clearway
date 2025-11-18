// Inngest Client
// Background jobs and workflow orchestration

import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'clearway',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
