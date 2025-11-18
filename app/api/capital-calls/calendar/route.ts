// app/api/capital-calls/calendar/route.ts
// Task BE-006: Calendar Data Endpoint

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const CalendarQuerySchema = z.object({
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2020).max(2030).optional(),
});

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = CalendarQuerySchema.parse({
      month: searchParams.get('month'),
      year: searchParams.get('year'),
    });

    const now = new Date();
    const month = query.month ?? now.getMonth() + 1;
    const year = query.year ?? now.getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const capitalCalls = await db.capitalCall.findMany({
      where: {
        userId,
        status: 'APPROVED',
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        document: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    return Response.json(capitalCalls);
  } catch (error) {
    console.error('Calendar API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
