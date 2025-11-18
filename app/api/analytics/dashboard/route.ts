// Analytics Dashboard API
// Task AN-001: Real-Time Capital Call Dashboard

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Find user in database
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    // Fetch metrics in parallel for performance
    const [
      totalCalls,
      callsByMonth,
      callsByFund,
      statusBreakdown,
      avgResponseTime,
      overdueCalls,
      upcomingCalls,
    ] = await Promise.all([
      // Total capital calls
      db.capitalCall.count({ where: { userId: user.id } }),

      // Calls by month (last 12 months)
      db.$queryRaw<Array<{ month: string; count: number; amount: number }>>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', "dueDate"), 'Mon YYYY') as month,
          COUNT(*)::int as count,
          SUM("amountDue")::float / 1000000 as amount
        FROM "CapitalCall"
        WHERE "userId" = ${user.id}
          AND "dueDate" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "dueDate")
        ORDER BY DATE_TRUNC('month', "dueDate")
      `,

      // Calls by fund
      db.capitalCall.groupBy({
        by: ['fundName'],
        where: { userId: user.id },
        _count: true,
        _sum: { amountDue: true },
        orderBy: { _count: { _all: 'desc' } },
        take: 10,
      }),

      // Status breakdown
      db.capitalCall.groupBy({
        by: ['status'],
        where: { userId: user.id },
        _count: true,
      }),

      // Average response time (hours from created to approved)
      db.$queryRaw<Array<{ avg_hours: number }>>`
        SELECT AVG(EXTRACT(EPOCH FROM ("approvedAt" - "createdAt")) / 3600)::float as avg_hours
        FROM "CapitalCall"
        WHERE "userId" = ${user.id}
          AND status IN ('APPROVED', 'PAID')
          AND "approvedAt" IS NOT NULL
      `,

      // Overdue calls
      db.capitalCall.count({
        where: {
          userId: user.id,
          status: 'APPROVED',
          dueDate: { lt: new Date() },
          paidAt: null,
        },
      }),

      // Upcoming calls (next 30 days)
      db.capitalCall.count({
        where: {
          userId: user.id,
          status: 'APPROVED',
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          paidAt: null,
        },
      }),
    ]);

    // Total amount
    const totalAmount = await db.capitalCall.aggregate({
      where: { userId: user.id },
      _sum: { amountDue: true },
    });

    // Calculate payment rate (paid on time)
    const paidOnTime = await db.capitalCall.count({
      where: {
        userId: user.id,
        status: 'PAID',
        paidAt: {
          not: null,
        },
      },
    });

    const totalPaid = await db.capitalCall.count({
      where: { userId: user.id, status: 'PAID' },
    });

    // For payment rate, we need to compare paidAt with dueDate
    // This requires a raw query for accurate calculation
    const paidOnTimeAccurate = await db.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int as count
      FROM "CapitalCall"
      WHERE "userId" = ${user.id}
        AND status = 'PAID'
        AND "paidAt" <= "dueDate"
    `;

    const paymentRate = totalPaid > 0
      ? Math.round((Number(paidOnTimeAccurate[0]?.count || 0) / totalPaid) * 100)
      : 0;

    const dashboardMetrics = {
      totalCapitalCalls: totalCalls,
      totalAmount: totalAmount._sum.amountDue?.toNumber() || 0,
      avgResponseTime: Math.round(avgResponseTime[0]?.avg_hours || 0),
      paymentRate,
      overdueCount: overdueCalls,
      upcomingCount: upcomingCalls,
      callsByMonth,
      callsByFund: callsByFund.map(f => ({
        fundName: f.fundName,
        count: f._count,
        totalAmount: (f._sum.amountDue?.toNumber() || 0) / 1000000,
      })),
      paymentStatusBreakdown: statusBreakdown.map(s => ({
        status: s.status,
        count: s._count,
        percentage: totalCalls > 0 ? Math.round((s._count / totalCalls) * 100) : 0,
      })),
    };

    return Response.json(dashboardMetrics);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
