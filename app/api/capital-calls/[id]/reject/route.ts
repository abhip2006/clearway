// app/api/capital-calls/[id]/reject/route.ts
// Task BE-005: Reject Capital Call

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const capitalCall = await db.capitalCall.findUnique({
      where: { id: params.id },
    });

    if (!capitalCall || capitalCall.userId !== userId) {
      return new Response('Not Found', { status: 404 });
    }

    await db.capitalCall.update({
      where: { id: params.id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
      },
    });

    await db.document.update({
      where: { id: capitalCall.documentId },
      data: { status: 'REJECTED' },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Rejection error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
