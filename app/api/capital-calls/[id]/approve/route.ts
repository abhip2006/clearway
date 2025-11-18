// app/api/capital-calls/[id]/approve/route.ts
// Task BE-004: Approve Capital Call

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const ApproveSchema = z.object({
  fundName: z.string().min(1),
  amountDue: z.number().positive(),
  currency: z.string().default('USD'),
  dueDate: z.coerce.date(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  routingNumber: z.string().optional(),
  wireReference: z.string().optional(),
  investorEmail: z.string().email().optional(),
  investorAccount: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const validatedData = ApproveSchema.parse(body);

    // Verify ownership
    const capitalCall = await db.capitalCall.findUnique({
      where: { id: params.id },
      include: { document: true },
    });

    if (!capitalCall || capitalCall.userId !== userId) {
      return new Response('Not Found', { status: 404 });
    }

    // Update capital call with reviewed data
    const updated = await db.capitalCall.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        status: 'APPROVED',
        reviewedAt: new Date(),
        approvedAt: new Date(),
      },
    });

    // Update document status
    await db.document.update({
      where: { id: capitalCall.documentId },
      data: { status: 'APPROVED' },
    });

    return Response.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    console.error('Approval error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
