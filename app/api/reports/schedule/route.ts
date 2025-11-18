// Scheduled Reports API
// Task AN-002: Custom Report Builder

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { ScheduledReportService } from '@/lib/reporting/scheduled-report-service';
import { ReportConfig } from '@/lib/reporting/report-builder';

export const dynamic = 'force-dynamic';

// Get all scheduled reports
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

    const service = new ScheduledReportService();
    const reports = await service.getScheduledReports(user.id);

    return Response.json(reports);
  } catch (error) {
    console.error('Get scheduled reports error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// Create a new scheduled report
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

    const body = await request.json();
    const { reportConfig, schedule, recipients } = body;

    if (!reportConfig || !schedule || !recipients) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Convert date strings to Date objects
    if (reportConfig.dateRange) {
      reportConfig.dateRange.start = new Date(reportConfig.dateRange.start);
      reportConfig.dateRange.end = new Date(reportConfig.dateRange.end);
    }

    const service = new ScheduledReportService();
    const scheduledReport = await service.createScheduledReport({
      userId: user.id,
      reportConfig: reportConfig as ReportConfig,
      schedule,
      recipients,
    });

    return Response.json(scheduledReport);
  } catch (error) {
    console.error('Create scheduled report error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Update a scheduled report
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { reportId, updates } = body;

    if (!reportId || !updates) {
      return new Response('Missing required fields', { status: 400 });
    }

    const service = new ScheduledReportService();
    const updatedReport = await service.updateScheduledReport(reportId, updates);

    return Response.json(updatedReport);
  } catch (error) {
    console.error('Update scheduled report error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// Delete a scheduled report
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);
    const reportId = url.searchParams.get('id');

    if (!reportId) {
      return new Response('Report ID is required', { status: 400 });
    }

    const service = new ScheduledReportService();
    await service.deleteScheduledReport(reportId);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete scheduled report error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
