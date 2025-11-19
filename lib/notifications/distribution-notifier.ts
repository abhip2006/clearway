// Distribution Agent - Task DIST-002: Distribution Notification Engine
// Multi-channel notifications (email, SMS, in-app) for distribution events

import { db } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface NotificationParams {
  distributionId: string;
  investorId: string;
  type:
    | 'DISTRIBUTION_NOTICE'
    | 'PAYMENT_CONFIRMATION'
    | 'TAX_SUMMARY'
    | 'PAYMENT_FAILED';
}

export class DistributionNotifier {
  /**
   * Send distribution notification to investor
   */
  async sendNotification(params: NotificationParams) {
    const distribution = await db.distribution.findUnique({
      where: { id: params.distributionId },
      include: {
        fund: true,
        lines: {
          where: { investorId: params.investorId },
        },
      },
    });

    const investor = await db.investor.findUnique({
      where: { id: params.investorId },
      include: {
        preferences: {
          where: { fundId: distribution!.fundId },
        },
      },
    });

    if (!distribution || !investor) {
      throw new Error('Distribution or investor not found');
    }

    const line = distribution.lines[0];

    // Generate notification content using AI
    const { subject, htmlContent, plainText } = await this.generateContent(
      params.type,
      {
        distribution,
        investor,
        line,
      }
    );

    // Send via preferred channels
    const preferences = investor.preferences[0] || {};

    const notificationResults = [];

    if (preferences.emailNotifications !== false) {
      await this.sendEmail({
        to: investor.email,
        subject,
        html: htmlContent,
        text: plainText,
      });
      notificationResults.push('EMAIL');
    }

    if (preferences.smsNotifications && investor.phoneNumber) {
      await this.sendSMS({
        to: investor.phoneNumber,
        message: await this.generateSMSMessage(params.type, line),
      });
      notificationResults.push('SMS');
    }

    // Always send in-app notification
    if (investor.userId) {
      await this.triggerInAppNotification(investor.userId, {
        title: subject,
        message: plainText,
        type: params.type,
        distributionId: params.distributionId,
      });
      notificationResults.push('IN_APP');
    }

    // Record notification
    await db.notification.create({
      data: {
        investorId: params.investorId,
        distributionId: params.distributionId,
        type: params.type,
        channel: notificationResults.join(','),
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }

  /**
   * Generate notification content using AI
   */
  private async generateContent(
    type: string,
    context: any
  ): Promise<{ subject: string; htmlContent: string; plainText: string }> {
    const distribution = context.distribution;
    const investor = context.investor;
    const line = context.line;

    let prompt = '';

    if (type === 'DISTRIBUTION_NOTICE') {
      prompt = `Generate a professional distribution notice email for an investor.

Fund: ${distribution.fund.name}
Distribution Date: ${distribution.distributionDate.toLocaleDateString()}
Payable Date: ${distribution.payableDate.toLocaleDateString()}
Distribution Amount: $${line.totalAmount.toString()}
  - Dividend: $${line.dividendAmount.toString()}
  - Return of Capital: $${line.returnOfCapitalAmount.toString()}
  - Gain: $${line.gainAmount.toString()}

Investor: ${investor.name}

Create a professional email with:
1. Clear subject line
2. HTML formatted body with all details
3. Plain text version
4. Include reinvestment information if applicable
5. Tax information disclaimer

Format as JSON: { "subject": "...", "html": "...", "text": "..." }`;
    } else if (type === 'PAYMENT_CONFIRMATION') {
      prompt = `Generate a payment confirmation email for a distribution payment.
Amount: $${line.totalAmount.toString()}
Status: Successfully processed
Expected arrival: 1-2 business days

Format as JSON: { "subject": "...", "html": "...", "text": "..." }`;
    } else if (type === 'TAX_SUMMARY') {
      prompt = `Generate a tax summary email with K-1 information.
Amount: $${line.totalAmount.toString()}
Distribution components and tax implications

Format as JSON: { "subject": "...", "html": "...", "text": "..." }`;
    } else if (type === 'PAYMENT_FAILED') {
      prompt = `Generate a payment failure notification email.
Amount: $${line.totalAmount.toString()}
Status: Payment failed
Next steps: Update payment information

Format as JSON: { "subject": "...", "html": "...", "text": "..." }`;
    }

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      // Extract JSON from response (may be wrapped in markdown code blocks)
      let jsonText = content.text;
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonText);
      return {
        subject: parsed.subject,
        htmlContent: parsed.html,
        plainText: parsed.text,
      };
    } catch (error) {
      console.error('AI content generation error:', error);
      // Fallback to template
      return this.getFallbackContent(type, context);
    }
  }

  /**
   * Fallback content templates
   */
  private getFallbackContent(
    type: string,
    context: any
  ): { subject: string; htmlContent: string; plainText: string } {
    const distribution = context.distribution;
    const line = context.line;

    if (type === 'DISTRIBUTION_NOTICE') {
      return {
        subject: `Distribution Notice: ${distribution.fund.name}`,
        htmlContent: `<h2>Distribution Notice</h2>
          <p>You have received a distribution from ${distribution.fund.name}</p>
          <p>Amount: $${line.totalAmount.toString()}</p>
          <p>Payable Date: ${distribution.payableDate.toLocaleDateString()}</p>`,
        plainText: `Distribution Notice\n\nFund: ${distribution.fund.name}\nAmount: $${line.totalAmount.toString()}\nPayable Date: ${distribution.payableDate.toLocaleDateString()}`,
      };
    }

    return {
      subject: 'Distribution Update',
      htmlContent: '<p>You have an update on your distribution.</p>',
      plainText: 'You have an update on your distribution.',
    };
  }

  /**
   * Generate SMS message
   */
  private async generateSMSMessage(type: string, line: any): Promise<string> {
    if (type === 'DISTRIBUTION_NOTICE') {
      return `Distribution alert: $${line.totalAmount.toString()} will be paid. Check your email for details.`;
    } else if (type === 'PAYMENT_CONFIRMATION') {
      return `Payment confirmed: $${line.totalAmount.toString()} distributed. Arrival: 1-2 business days.`;
    } else if (type === 'PAYMENT_FAILED') {
      return `Payment failed: $${line.totalAmount.toString()}. Please update your payment information.`;
    }
    return 'Distribution update: Check your account for details.';
  }

  /**
   * Send email notification (integrates with SendGrid/similar)
   */
  private async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) {
    // In production, integrate with SendGrid, AWS SES, or similar
    // For now, log the email
    console.log('Email notification:', {
      to: params.to,
      subject: params.subject,
    });

    // Example SendGrid integration:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({
    //   to: params.to,
    //   from: process.env.SENDGRID_FROM_EMAIL,
    //   subject: params.subject,
    //   html: params.html,
    //   text: params.text,
    // });
  }

  /**
   * Send SMS notification (integrates with Twilio/similar)
   */
  private async sendSMS(params: { to: string; message: string }) {
    // In production, integrate with Twilio or similar
    console.log('SMS notification:', {
      to: params.to,
      message: params.message,
    });

    // Example Twilio integration:
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.messages.create({
    //   body: params.message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: params.to,
    // });
  }

  /**
   * Trigger in-app notification
   */
  private async triggerInAppNotification(userId: string, notification: any) {
    await db.inAppNotification.create({
      data: {
        userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        relatedId: notification.distributionId,
        read: false,
        createdAt: new Date(),
      },
    });
  }

  /**
   * Batch send notifications for all investors in a distribution
   */
  async sendBatchNotifications(
    distributionId: string,
    type: NotificationParams['type']
  ) {
    const distribution = await db.distribution.findUnique({
      where: { id: distributionId },
      include: {
        lines: {
          include: {
            investor: true,
          },
        },
      },
    });

    if (!distribution) {
      throw new Error('Distribution not found');
    }

    const promises = distribution.lines.map((line) =>
      this.sendNotification({
        distributionId,
        investorId: line.investorId,
        type,
      }).catch((error) => {
        console.error(
          `Failed to send notification to investor ${line.investorId}:`,
          error
        );
        return null;
      })
    );

    await Promise.all(promises);
  }
}

export const distributionNotifier = new DistributionNotifier();
