// lib/tax/email-distribution.ts
// Tax & K-1 Agent - Email Distribution Service

import { db } from '../db';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Distribute K-1 document to investor via email
 */
export async function distributeK1ByEmail(
  taxDocumentId: string,
  recipientEmail: string,
  recipientName: string
): Promise<{ success: boolean; distributionId: string }> {
  const taxDocument = await db.taxDocument.findUnique({
    where: { id: taxDocumentId },
    include: {
      document: true,
    },
  });

  if (!taxDocument) {
    throw new Error('Tax document not found');
  }

  // Generate secure download link (expires in 30 days)
  const downloadToken = generateSecureToken();
  const downloadLink = `${process.env.NEXT_PUBLIC_APP_URL}/tax/download/${taxDocumentId}?token=${downloadToken}`;

  // Send email
  const emailResult = await resend.emails.send({
    from: 'Clearway Tax Documents <tax@clearway.com>',
    to: recipientEmail,
    subject: `Your ${taxDocument.taxYear} K-1 Tax Form is Ready`,
    html: buildK1EmailHTML(recipientName, taxDocument.taxYear, downloadLink),
  });

  // Create distribution record
  const distribution = await db.taxDistribution.create({
    data: {
      taxDocumentId,
      recipientEmail,
      recipientName,
      sentAt: new Date(),
      deliveryStatus: 'SENT',
      sendMethod: 'EMAIL',
    },
  });

  // Update tax document status
  await db.taxDocument.update({
    where: { id: taxDocumentId },
    data: {
      status: 'DISTRIBUTED',
      distributedAt: new Date(),
      deliveryStatus: 'SENT',
    },
  });

  return {
    success: true,
    distributionId: distribution.id,
  };
}

/**
 * Send reminder for unopened K-1
 */
export async function sendK1Reminder(distributionId: string): Promise<void> {
  const distribution = await db.taxDistribution.findUnique({
    where: { id: distributionId },
    include: {
      taxDocument: {
        include: {
          document: true,
        },
      },
    },
  });

  if (!distribution || distribution.openedAt) {
    return; // Already opened, no need to remind
  }

  const downloadLink = `${process.env.NEXT_PUBLIC_APP_URL}/tax/download/${distribution.taxDocumentId}`;

  await resend.emails.send({
    from: 'Clearway Tax Documents <tax@clearway.com>',
    to: distribution.recipientEmail,
    subject: `Reminder: Your ${distribution.taxDocument.taxYear} K-1 Tax Form`,
    html: buildReminderEmailHTML(
      distribution.recipientName || 'Investor',
      distribution.taxDocument.taxYear,
      downloadLink
    ),
  });

  // Update reminder count
  await db.taxDistribution.update({
    where: { id: distributionId },
    data: {
      remindersSent: { increment: 1 },
      lastReminderAt: new Date(),
    },
  });
}

/**
 * Batch distribute K-1s for a tax year
 */
export async function batchDistributeK1s(taxYear: number, fundId?: string): Promise<{
  sent: number;
  failed: number;
}> {
  const taxDocuments = await db.taxDocument.findMany({
    where: {
      taxYear,
      fundId: fundId || undefined,
      status: 'VALIDATED',
      distributedAt: null,
    },
    include: {
      document: {
        include: {
          user: true,
        },
      },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const taxDoc of taxDocuments) {
    try {
      await distributeK1ByEmail(
        taxDoc.id,
        taxDoc.document.user.email,
        taxDoc.document.user.name || 'Investor'
      );
      sent++;
    } catch (error) {
      console.error(`Failed to distribute K-1 ${taxDoc.id}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Build K-1 email HTML
 */
function buildK1EmailHTML(recipientName: string, taxYear: number, downloadLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #0066FF; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { margin-top: 40px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Your ${taxYear} K-1 Tax Form is Ready</h2>
    <p>Dear ${recipientName},</p>
    <p>Your Schedule K-1 tax form for the ${taxYear} tax year is now available for download.</p>
    <p>This form reports your share of income, deductions, and credits from your partnership investment. You will need this form to complete your ${taxYear} tax return.</p>
    <a href="${downloadLink}" class="button">Download Your K-1</a>
    <p><strong>Important Reminders:</strong></p>
    <ul>
      <li>Please save this form for your records</li>
      <li>Share with your tax preparer or CPA</li>
      <li>The IRS requires you to report this information on your tax return</li>
      <li>This download link will expire in 30 days</li>
    </ul>
    <p>If you have any questions about this K-1 or your investment, please contact us.</p>
    <p>Best regards,<br>Clearway Tax Team</p>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>For support, contact tax@clearway.com</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Build reminder email HTML
 */
function buildReminderEmailHTML(recipientName: string, taxYear: number, downloadLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #FF6B35; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { margin-top: 40px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Reminder: Your ${taxYear} K-1 Tax Form is Waiting</h2>
    <p>Dear ${recipientName},</p>
    <p>This is a friendly reminder that your Schedule K-1 tax form for ${taxYear} is available for download.</p>
    <p>Tax season is approaching, and you'll need this form to file your return.</p>
    <a href="${downloadLink}" class="button">Download Your K-1 Now</a>
    <p>Don't forget to share this with your tax preparer or CPA.</p>
    <p>Best regards,<br>Clearway Tax Team</p>
    <div class="footer">
      <p>This is an automated reminder. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate secure token for download links
 */
function generateSecureToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
