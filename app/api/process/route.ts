// app/api/process/route.ts
// Task BE-002: Trigger Processing Job

import { auth } from '@clerk/nextjs/server';
import { inngest } from '@/lib/inngest';
import { db } from '@/lib/db';
import { z } from 'zod';

const ProcessRequestSchema = z.object({
  documentId: z.string().cuid(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { documentId } = ProcessRequestSchema.parse(body);

    // Verify document belongs to user
    const document = await db.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.userId !== userId) {
      return new Response('Not Found', { status: 404 });
    }

    // Trigger background processing
    await inngest.send({
      name: 'document.uploaded',
      data: { documentId },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Process trigger error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
