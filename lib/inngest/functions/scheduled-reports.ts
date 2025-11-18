// Inngest Function for Scheduled Reports
// Task AN-002: Custom Report Builder

import { inngest } from '@/lib/inngest/client';
import { ScheduledReportService } from '@/lib/reporting/scheduled-report-service';

export const executeScheduledReport = inngest.createFunction(
  { id: 'execute-scheduled-report' },
  { event: 'reports/scheduled.execute' },
  async ({ event, step }) => {
    const { scheduledReportId } = event.data;

    await step.run('execute-report', async () => {
      const service = new ScheduledReportService();
      await service.executeScheduledReport(scheduledReportId);
    });

    return { success: true };
  }
);

// Daily report executor
export const executeDailyReports = inngest.createFunction(
  { id: 'execute-daily-reports' },
  { cron: '0 9 * * *' }, // 9 AM daily
  async ({ step }) => {
    await step.run('get-daily-reports', async () => {
      const service = new ScheduledReportService();

      // Note: This would need to query all daily reports across all users
      // For now, this is a placeholder for the implementation
      console.log('Executing daily reports...');
    });

    return { success: true };
  }
);

// Weekly report executor
export const executeWeeklyReports = inngest.createFunction(
  { id: 'execute-weekly-reports' },
  { cron: '0 9 * * 1' }, // 9 AM Monday
  async ({ step }) => {
    await step.run('get-weekly-reports', async () => {
      const service = new ScheduledReportService();
      console.log('Executing weekly reports...');
    });

    return { success: true };
  }
);

// Monthly report executor
export const executeMonthlyReports = inngest.createFunction(
  { id: 'execute-monthly-reports' },
  { cron: '0 9 1 * *' }, // 9 AM 1st of month
  async ({ step }) => {
    await step.run('get-monthly-reports', async () => {
      const service = new ScheduledReportService();
      console.log('Executing monthly reports...');
    });

    return { success: true };
  }
);
