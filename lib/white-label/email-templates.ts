// White-Label Agent - Task WL-005: Email Template Customization
// Manages custom email templates and branded email sending

import { db } from '@/lib/db';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');

export type EmailTemplateType =
  | 'CAPITAL_CALL_CREATED'
  | 'CAPITAL_CALL_APPROVED'
  | 'CAPITAL_CALL_REJECTED'
  | 'CAPITAL_CALL_REMINDER'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_CONFIRMED'
  | 'DOCUMENT_UPLOADED'
  | 'INVESTOR_INVITED'
  | 'PASSWORD_RESET'
  | 'WELCOME';

export interface EmailTemplateData {
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export interface SendEmailParams {
  tenantId: string;
  templateType: EmailTemplateType;
  to: string;
  variables: Record<string, string>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

export class EmailTemplateService {
  /**
   * Get email template for tenant
   * Falls back to default template if tenant-specific not found
   */
  async getTemplate(tenantId: string, templateType: EmailTemplateType) {
    let template = await db.emailTemplate.findUnique({
      where: {
        tenantId_type: {
          tenantId,
          type: templateType,
        },
      },
    });

    // Fall back to default template
    if (!template) {
      template = await db.emailTemplate.findFirst({
        where: {
          type: templateType,
          isDefault: true,
        },
      });
    }

    // Fall back to hard-coded default if no database template
    if (!template) {
      return this.getHardCodedTemplate(templateType);
    }

    return template;
  }

  /**
   * Update email template for tenant
   */
  async updateTemplate(
    tenantId: string,
    templateType: EmailTemplateType,
    content: EmailTemplateData
  ) {
    return db.emailTemplate.upsert({
      where: {
        tenantId_type: {
          tenantId,
          type: templateType,
        },
      },
      create: {
        tenantId,
        type: templateType,
        subject: content.subject,
        htmlBody: content.htmlBody,
        textBody: content.textBody,
        isDefault: false,
      },
      update: {
        subject: content.subject,
        htmlBody: content.htmlBody,
        textBody: content.textBody,
      },
    });
  }

  /**
   * Send branded email
   */
  async sendBrandedEmail(params: SendEmailParams) {
    const template = await this.getTemplate(params.tenantId, params.templateType);
    const branding = await db.brandingConfig.findUnique({
      where: { tenantId: params.tenantId },
    });

    if (!template) {
      throw new Error(`Template ${params.templateType} not found`);
    }

    // Replace variables in subject and body
    const subject = this.replaceVariables(template.subject, params.variables, branding);
    const htmlBody = this.replaceVariables(
      template.htmlBody,
      params.variables,
      branding
    );

    const fromEmail = branding?.fromEmail || process.env.DEFAULT_FROM_EMAIL || 'noreply@clearway.com';

    return resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject,
      html: htmlBody,
      attachments: params.attachments,
    });
  }

  /**
   * Replace variables in template content
   */
  private replaceVariables(
    content: string,
    variables: Record<string, string>,
    branding: any = null
  ): string {
    let result = content;

    // Replace user variables
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
    });

    // Replace branding variables
    if (branding) {
      result = result.replace(/{{brandName}}/g, branding.companyName || 'Clearway');
      result = result.replace(/{{logoUrl}}/g, branding.logoUrl || '');
      result = result.replace(/{{supportEmail}}/g, branding.supportEmail || 'support@clearway.com');
      result = result.replace(/{{supportPhone}}/g, branding.supportPhone || '');
      result = result.replace(/{{footerText}}/g, branding.footerText || '');
      result = result.replace(/{{primaryColor}}/g, branding.primaryColor || '#0066FF');
    } else {
      // Default branding
      result = result.replace(/{{brandName}}/g, 'Clearway');
      result = result.replace(/{{logoUrl}}/g, '');
      result = result.replace(/{{supportEmail}}/g, 'support@clearway.com');
      result = result.replace(/{{supportPhone}}/g, '');
      result = result.replace(/{{footerText}}/g, '');
      result = result.replace(/{{primaryColor}}/g, '#0066FF');
    }

    return result;
  }

  /**
   * Get hard-coded default templates
   */
  private getHardCodedTemplate(templateType: EmailTemplateType): EmailTemplateData {
    return DEFAULT_EMAIL_TEMPLATES[templateType] || {
      subject: 'Notification from {{brandName}}',
      htmlBody: '<p>You have a new notification.</p>',
    };
  }

  /**
   * List all templates for tenant
   */
  async listTemplates(tenantId: string) {
    return db.emailTemplate.findMany({
      where: { tenantId },
      orderBy: { type: 'asc' },
    });
  }

  /**
   * Preview template with sample data
   */
  async previewTemplate(
    tenantId: string,
    templateType: EmailTemplateType,
    sampleVariables: Record<string, string>
  ) {
    const template = await this.getTemplate(tenantId, templateType);
    const branding = await db.brandingConfig.findUnique({
      where: { tenantId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    return {
      subject: this.replaceVariables(template.subject, sampleVariables, branding),
      htmlBody: this.replaceVariables(template.htmlBody, sampleVariables, branding),
    };
  }

  /**
   * Delete custom template (revert to default)
   */
  async deleteTemplate(tenantId: string, templateType: EmailTemplateType) {
    return db.emailTemplate.deleteMany({
      where: {
        tenantId,
        type: templateType,
      },
    });
  }
}

/**
 * Default email template definitions
 */
export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateType, EmailTemplateData> = {
  CAPITAL_CALL_CREATED: {
    subject: '{{brandName}} - New Capital Call for {{fundName}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <img src="{{logoUrl}}" alt="{{brandName}}" style="max-width: 200px; margin-bottom: 20px;">

        <h2 style="color: {{primaryColor}};">New Capital Call</h2>

        <p>Dear {{investorName}},</p>

        <p>A new capital call has been issued for <strong>{{fundName}}</strong>:</p>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount Due:</strong> {{amountDue}}</p>
          <p><strong>Due Date:</strong> {{dueDate}}</p>
          <p><strong>Description:</strong> {{description}}</p>
        </div>

        <p>
          <a href="{{capitalCallLink}}" style="background-color: {{primaryColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Capital Call</a>
        </p>

        <p>Questions? Contact us at {{supportEmail}}</p>

        <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">
          {{footerText}}<br>
          <a href="{{unsubscribeLink}}" style="color: {{primaryColor}}; text-decoration: none;">Unsubscribe</a>
        </p>
      </div>
    `,
  },

  CAPITAL_CALL_APPROVED: {
    subject: '{{brandName}} - Capital Call Payment Approved',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <img src="{{logoUrl}}" alt="{{brandName}}" style="max-width: 200px; margin-bottom: 20px;">

        <h2 style="color: #10b981;">Payment Approved</h2>

        <p>Your payment for the capital call in <strong>{{fundName}}</strong> has been approved.</p>

        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p><strong>Amount Paid:</strong> {{amountPaid}}</p>
          <p><strong>Date:</strong> {{paymentDate}}</p>
          <p><strong>Reference:</strong> {{paymentReference}}</p>
        </div>

        <p>
          <a href="{{capitalCallLink}}" style="background-color: {{primaryColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Details</a>
        </p>

        <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">{{footerText}}</p>
      </div>
    `,
  },

  CAPITAL_CALL_REJECTED: {
    subject: '{{brandName}} - Capital Call Payment Issue',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <img src="{{logoUrl}}" alt="{{brandName}}" style="max-width: 200px; margin-bottom: 20px;">

        <h2 style="color: #ef4444;">Payment Issue</h2>

        <p>There was an issue with your payment for <strong>{{fundName}}</strong>.</p>

        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p><strong>Reason:</strong> {{rejectionReason}}</p>
        </div>

        <p>Please contact us at {{supportEmail}} or call {{supportPhone}} for assistance.</p>

        <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">{{footerText}}</p>
      </div>
    `,
  },

  CAPITAL_CALL_REMINDER: {
    subject: '{{brandName}} - Capital Call Due Soon',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <img src="{{logoUrl}}" alt="{{brandName}}" style="max-width: 200px; margin-bottom: 20px;">

        <h2 style="color: #f59e0b;">Payment Reminder</h2>

        <p>This is a reminder that your capital call payment for <strong>{{fundName}}</strong> is due soon.</p>

        <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p><strong>Amount Due:</strong> {{amountDue}}</p>
          <p><strong>Due Date:</strong> {{dueDate}}</p>
        </div>

        <p>
          <a href="{{capitalCallLink}}" style="background-color: {{primaryColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Make Payment</a>
        </p>

        <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">{{footerText}}</p>
      </div>
    `,
  },

  PAYMENT_RECEIVED: {
    subject: '{{brandName}} - Payment Received',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <img src="{{logoUrl}}" alt="{{brandName}}" style="max-width: 200px; margin-bottom: 20px;">

        <h2 style="color: #10b981;">Payment Received</h2>

        <p>We have received your payment of <strong>{{amount}}</strong>.</p>

        <p>Your payment is being processed and will be confirmed shortly.</p>

        <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">{{footerText}}</p>
      </div>
    `,
  },

  PAYMENT_CONFIRMED: {
    subject: '{{brandName}} - Payment Confirmed',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <img src="{{logoUrl}}" alt="{{brandName}}" style="max-width: 200px; margin-bottom: 20px;">

        <h2 style="color: #10b981;">Payment Confirmed</h2>

        <p>Your payment has been confirmed and processed successfully.</p>

        <p><strong>Receipt:</strong> {{receiptUrl}}</p>

        <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">{{footerText}}</p>
      </div>
    `,
  },

  DOCUMENT_UPLOADED: {
    subject: '{{brandName}} - New Document Available',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <img src="{{logoUrl}}" alt="{{brandName}}" style="max-width: 200px; margin-bottom: 20px;">

        <h2>New Document</h2>

        <p>A new document has been uploaded: <strong>{{documentName}}</strong></p>

        <p>
          <a href="{{documentLink}}" style="background-color: {{primaryColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Document</a>
        </p>

        <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">{{footerText}}</p>
      </div>
    `,
  },

  INVESTOR_INVITED: {
    subject: 'You have been invited to {{brandName}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <img src="{{logoUrl}}" alt="{{brandName}}" style="max-width: 200px; margin-bottom: 20px;">

        <h2>Welcome!</h2>

        <p>You have been invited to join {{brandName}} investor portal.</p>

        <p>
          <a href="{{inviteLink}}" style="background-color: {{primaryColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Invitation</a>
        </p>

        <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">{{footerText}}</p>
      </div>
    `,
  },

  PASSWORD_RESET: {
    subject: '{{brandName}} - Reset Your Password',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <img src="{{logoUrl}}" alt="{{brandName}}" style="max-width: 200px; margin-bottom: 20px;">

        <h2>Reset Your Password</h2>

        <p>Click the link below to reset your password:</p>

        <p>
          <a href="{{resetLink}}" style="background-color: {{primaryColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
        </p>

        <p style="color: #999; font-size: 14px;">This link expires in 1 hour.</p>

        <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">{{footerText}}</p>
      </div>
    `,
  },

  WELCOME: {
    subject: 'Welcome to {{brandName}}!',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <img src="{{logoUrl}}" alt="{{brandName}}" style="max-width: 200px; margin-bottom: 20px;">

        <h2>Welcome!</h2>

        <p>Thank you for joining {{brandName}}. We're excited to have you.</p>

        <p>
          <a href="{{dashboardLink}}" style="background-color: {{primaryColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Go to Dashboard</a>
        </p>

        <p>Need help? Contact us at {{supportEmail}}</p>

        <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">{{footerText}}</p>
      </div>
    `,
  },
};

/**
 * Singleton instance
 */
export const emailTemplateService = new EmailTemplateService();
