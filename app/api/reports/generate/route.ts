// Report Generation API
// Task AN-002: Custom Report Builder

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { ReportBuilder, ReportConfig } from '@/lib/reporting/report-builder';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    const config: ReportConfig = await request.json();

    // Validate config
    if (!config.name || !config.format || !config.dateRange) {
      return new Response('Invalid report configuration', { status: 400 });
    }

    // Convert date strings to Date objects
    config.dateRange.start = new Date(config.dateRange.start);
    config.dateRange.end = new Date(config.dateRange.end);

    const builder = new ReportBuilder();
    const reportBuffer = await builder.generateReport(config, user.id);

    // Determine content type and filename
    const contentTypes = {
      EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      PDF: 'application/pdf',
      CSV: 'text/csv',
    };

    const extensions = {
      EXCEL: 'xlsx',
      PDF: 'pdf',
      CSV: 'csv',
    };

    const contentType = contentTypes[config.format];
    const filename = `${config.name}_${new Date().toISOString().split('T')[0]}.${extensions[config.format]}`;

    return new Response(reportBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
