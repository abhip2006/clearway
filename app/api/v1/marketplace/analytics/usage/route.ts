// app/api/v1/marketplace/analytics/usage/route.ts
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-marketplace/utils';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return errorResponse('unauthorized', 'Authentication required', 401);

    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'month';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const developer = await db.developerAccount.findUnique({
      where: { userId: user.id },
      include: { marketplaceAPIKeys: true },
    });

    if (!developer) {
      return successResponse({
        requestCount: 0,
        errorCount: 0,
        totalLatencyMs: 0,
        bandwidthBytes: 0,
        byEndpoint: [],
      });
    }

    const apiKeyIds = developer.marketplaceAPIKeys.map((k) => k.id);

    const where: any = {
      apiKeyId: { in: apiKeyIds },
    };

    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (period === 'day') {
      where.timestamp = { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    } else if (period === 'week') {
      where.timestamp = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else {
      where.timestamp = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }

    const logs = await db.marketplaceAPIUsageLog.findMany({ where });

    const totalRequests = logs.length;
    const errorCount = logs.filter((l) => l.statusCode >= 400).length;
    const totalLatency = logs.reduce((sum, l) => sum + l.requestTimeMs, 0);
    const totalBandwidth = logs.reduce((sum, l) => sum + l.requestSizeBytes + l.responseSizeBytes, 0);

    const byEndpoint = logs.reduce((acc: any, log) => {
      const key = `${log.method} ${log.endpoint}`;
      if (!acc[key]) {
        acc[key] = { endpoint: log.endpoint, method: log.method, callCount: 0, errorCount: 0, totalLatencyMs: 0 };
      }
      acc[key].callCount++;
      if (log.statusCode >= 400) acc[key].errorCount++;
      acc[key].totalLatencyMs += log.requestTimeMs;
      return acc;
    }, {});

    const endpointStats = Object.values(byEndpoint).map((stat: any) => ({
      ...stat,
      avgLatencyMs: Math.round(stat.totalLatencyMs / stat.callCount),
      errorRate: ((stat.errorCount / stat.callCount) * 100).toFixed(2),
    }));

    return successResponse({
      period,
      requestCount: totalRequests,
      errorCount,
      totalLatencyMs: totalLatency,
      avgLatencyMs: totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0,
      bandwidthBytes: totalBandwidth,
      errorRate: totalRequests > 0 ? ((errorCount / totalRequests) * 100).toFixed(2) : '0',
      byEndpoint: endpointStats.sort((a: any, b: any) => b.callCount - a.callCount).slice(0, 10),
    });
  } catch (error) {
    console.error('Error getting usage analytics:', error);
    return errorResponse('internal_error', 'Failed to get usage analytics', 500);
  }
}
