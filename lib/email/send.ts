// Email Sending Helpers
// Utility functions for sending transactional emails

import { resend } from '../email';
import { CapitalCallReminder } from './templates/capital-call-reminder';

export async function sendCapitalCallReminder(
  to: string,
  data: { fundName: string; amountDue: number; dueDate: Date }
) {
  try {
    const { data: emailData, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to,
      subject: `Capital Call Reminder - ${data.fundName}`,
      react: CapitalCallReminder(data),
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return emailData;
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}
