// app/api/inngest/functions/send-reminders.ts
// Task BE-007: Capital Call Reminder Job

import { inngest } from '@/lib/inngest';
import { Resend } from 'resend';
import { CapitalCallReminder } from '@/lib/email/templates/capital-call-reminder';
import { db } from '@/lib/db';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendReminders = inngest.createFunction(
  {
    id: 'send-capital-call-reminders',
  },
  { cron: '0 9 * * *' }, // Daily at 9am UTC
  async ({ step }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    sevenDaysFromNow.setHours(23, 59, 59, 999);

    // Get all capital calls due in next 7 days
    const upcomingCalls = await step.run('fetch-upcoming-calls', async () => {
      return await db.capitalCall.findMany({
        where: {
          status: 'APPROVED',
          dueDate: {
            gte: today,
            lte: sevenDaysFromNow,
          },
        },
        include: {
          user: true,
        },
      });
    });

    // Send reminders
    const results = await step.run('send-emails', async () => {
      const promises = upcomingCalls.map(async (call) => {
        const daysUntilDue = Math.ceil(
          (call.dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
        );

        // Send reminder at 7, 3, and 1 days before
        if ([7, 3, 1].includes(daysUntilDue)) {
          try {
            await resend.emails.send({
              from: 'Clearway <alerts@clearway.com>',
              to: call.user.email,
              subject: `Capital Call Due in ${daysUntilDue} Day${daysUntilDue > 1 ? 's' : ''}`,
              react: CapitalCallReminder({
                fundName: call.fundName,
                amountDue: call.amountDue,
                dueDate: call.dueDate,
              }),
            });
            return { success: true, callId: call.id };
          } catch (error) {
            console.error(`Failed to send reminder for ${call.id}:`, error);
            return { success: false, callId: call.id, error };
          }
        }
        return { skipped: true, callId: call.id };
      });

      return await Promise.all(promises);
    });

    return {
      totalCalls: upcomingCalls.length,
      results,
    };
  }
);
