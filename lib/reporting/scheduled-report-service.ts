// Task AN-002: Scheduled Report Service
// Analytics & Reporting Agent - Week 11-12

import { db } from '@/lib/db';
import { ReportBuilder, ReportConfig } from './report-builder';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export class ScheduledReportService {
  async createScheduledReport(params: {
    userId: string;
    reportConfig: ReportConfig;
    schedule: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    recipients: string[];
  }) {
    const scheduledReport = await db.scheduledReport.create({
      data: {
        userId: params.userId,
        name: params.reportConfig.name,
        config: params.reportConfig as any,
        schedule: params.schedule,
        recipients: params.recipients,
        active: true,
      },
    });

    // Schedule with Inngest
    // Cron schedules:
    // Daily: 0 9 * * * (9 AM daily)
    // Weekly: 0 9 * * 1 (9 AM Monday)
    // Monthly: 0 9 1 * * (9 AM 1st of month)
    const cronSchedule = {
      DAILY: '0 9 * * *',
      WEEKLY: '0 9 * * 1',
      MONTHLY: '0 9 1 * *',
    }[params.schedule];

    // Note: In production, you would use Inngest to schedule this
    // await inngest.send({
    //   name: 'reports.schedule',
    //   data: {
    //     scheduledReportId: scheduledReport.id,
    //     cronSchedule,
    //   },
    // });

    return scheduledReport;
  }

  async executeScheduledReport(scheduledReportId: string) {
    try {
      const scheduled = await db.scheduledReport.findUnique({
        where: { id: scheduledReportId },
      });

      if (!scheduled || !scheduled.active) {
        return;
      }

      // Generate report
      const builder = new ReportBuilder();
      const reportConfig = scheduled.config as any as ReportConfig;

      // Update date range to current period
      const now = new Date();
      if (scheduled.schedule === 'DAILY') {
        reportConfig.dateRange = {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
          end: now,
        };
      } else if (scheduled.schedule === 'WEEKLY') {
        reportConfig.dateRange = {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
          end: now,
        };
      } else if (scheduled.schedule === 'MONTHLY') {
        reportConfig.dateRange = {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 0),
        };
      }

      const reportBuffer = await builder.generateReport(
        reportConfig,
        scheduled.userId
      );

      // Determine file extension
      const fileExtension = reportConfig.format.toLowerCase();
      const attachmentName = `${scheduled.name}_${new Date().toISOString().split('T')[0]}.${fileExtension}`;

      // Email to recipients
      for (const recipient of scheduled.recipients) {
        await resend.emails.send({
          from: 'Clearway Reports <reports@clearway.com>',
          to: recipient,
          subject: `Scheduled Report: ${scheduled.name}`,
          text: `Please find attached your scheduled ${scheduled.schedule.toLowerCase()} report.`,
          attachments: [
            {
              filename: attachmentName,
              content: reportBuffer,
            },
          ],
        });
      }

      // Log execution
      await db.reportExecution.create({
        data: {
          scheduledReportId: scheduled.id,
          executedAt: new Date(),
          recipientCount: scheduled.recipients.length,
          status: 'SUCCESS',
        },
      });
    } catch (error) {
      // Log error
      await db.reportExecution.create({
        data: {
          scheduledReportId: scheduledReportId,
          executedAt: new Date(),
          recipientCount: 0,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
  }

  async getScheduledReports(userId: string) {
    return db.scheduledReport.findMany({
      where: { userId },
      include: {
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateScheduledReport(
    reportId: string,
    updates: {
      active?: boolean;
      recipients?: string[];
      schedule?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    }
  ) {
    return db.scheduledReport.update({
      where: { id: reportId },
      data: updates,
    });
  }

  async deleteScheduledReport(reportId: string) {
    return db.scheduledReport.delete({
      where: { id: reportId },
    });
  }
}
