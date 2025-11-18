// Langfuse LLM Observability Client
// Tracks and monitors all LLM API calls

import { Langfuse } from 'langfuse';

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST,
});

// Flush on shutdown to ensure all traces are sent
if (typeof window === 'undefined') {
  process.on('SIGINT', async () => {
    await langfuse.shutdownAsync();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await langfuse.shutdownAsync();
    process.exit(0);
  });
}
