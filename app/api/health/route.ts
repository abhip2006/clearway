/**
 * Health Check Endpoint
 *
 * This endpoint is used for:
 * - Uptime monitoring (e.g., UptimeRobot, Pingdom)
 * - Load balancer health checks
 * - Deployment verification
 *
 * Returns:
 * - 200 OK when all systems are operational
 * - 500 Error when critical systems are down
 */

import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version?: string;
  checks: {
    database: 'ok' | 'error';
    environment: 'ok' | 'error';
  };
  error?: string;
}

export async function GET() {
  try {
    // Check database connection
    await db.$queryRaw`SELECT 1`;

    // Check critical environment variables
    const hasRequiredEnv =
      !!process.env.DATABASE_URL &&
      !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      !!process.env.CLERK_SECRET_KEY;

    const checks: HealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      checks: {
        database: 'ok',
        environment: hasRequiredEnv ? 'ok' : 'error',
      },
    };

    // If environment check fails, return unhealthy status
    if (!hasRequiredEnv) {
      checks.status = 'unhealthy';
      checks.error = 'Missing required environment variables';
      return NextResponse.json(checks, { status: 500 });
    }

    return NextResponse.json(checks, { status: 200 });
  } catch (error) {
    const checks: HealthCheck = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'error',
        environment: 'ok',
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(checks, { status: 500 });
  }
}
