// Clearway - Workflow Templates
// Workflow Automation Agent - Task WF-005

import { db } from '@/lib/db';
import { TriggerType, ActionType } from './workflow-builder';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string; // 'payments', 'distributions', 'compliance', 'notifications'
  industry: string; // 'PE', 'VC', 'RI', 'Hedge'
  trigger: any;
  branches: any[];
  defaultActions?: any[];
  usageCount: number;
  rating: number;
  createdBy: string;
  isPublic: boolean;
}

export class WorkflowTemplateManager {
  /**
   * Get available templates
   */
  async getTemplates(params?: {
    category?: string;
    industry?: string;
    searchTerm?: string;
    organizationOnly?: boolean;
    organizationId?: string;
  }): Promise<WorkflowTemplate[]> {
    let whereClause: any = params?.organizationOnly
      ? { organizationId: params.organizationId }
      : { isPublic: true };

    if (params?.category) {
      whereClause.category = params.category;
    }

    if (params?.industry) {
      whereClause.industry = params.industry;
    }

    const templates = await db.workflowTemplate.findMany({
      where: whereClause,
      orderBy: [{ rating: 'desc' }, { usageCount: 'desc' }],
    });

    return templates;
  }

  /**
   * Create workflow from template
   */
  async createFromTemplate(
    templateId: string,
    organizationId: string,
    params: {
      name: string;
      userId: string;
    }
  ) {
    const template = await db.workflowTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Create workflow from template
    const workflow = await db.workflow.create({
      data: {
        organizationId,
        name: params.name,
        description: template.description,
        trigger: template.trigger,
        branches: template.branches,
        defaultActions: template.defaultActions,
        enabled: false,
        version: 1,
        createdBy: params.userId,
        templateId: templateId,
      },
    });

    // Increment usage count
    await db.workflowTemplate.update({
      where: { id: templateId },
      data: { usageCount: template.usageCount + 1 },
    });

    return workflow;
  }

  /**
   * Save workflow as template
   */
  async saveAsTemplate(
    workflowId: string,
    params: {
      name: string;
      description?: string;
      category?: string;
      industry?: string;
      isPublic?: boolean;
    }
  ): Promise<WorkflowTemplate> {
    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const template = await db.workflowTemplate.create({
      data: {
        name: params.name,
        description: params.description,
        category: params.category || 'general',
        industry: params.industry,
        trigger: workflow.trigger,
        branches: workflow.branches,
        defaultActions: workflow.defaultActions,
        isPublic: params.isPublic || false,
        createdBy: workflow.createdBy,
        organizationId: workflow.organizationId,
        usageCount: 0,
        rating: 0,
      },
    });

    return template;
  }

  /**
   * Seed default templates
   */
  async seedDefaultTemplates(organizationId: string, userId: string): Promise<void> {
    const templates = [
      // Payment Reminder Template
      {
        name: 'Payment Reminder - 7 Days Before Due Date',
        description: 'Automatically send email reminders 7 days before capital call due date',
        category: 'payments',
        industry: 'PE',
        trigger: {
          id: 'trigger-1',
          type: TriggerType.DUE_DATE_APPROACHING,
          config: { daysBefore: 7 },
        },
        branches: [
          {
            id: 'branch-1',
            name: 'High Priority (>$100k)',
            conditions: [
              {
                id: 'cond-1',
                fieldId: 'amountDue',
                fieldName: 'amountDue',
                operator: 'GREATER_THAN',
                value: 100000,
                combineWith: 'AND',
              },
            ],
            actions: [
              {
                id: 'action-1',
                type: ActionType.SEND_EMAIL,
                config: {
                  to: '{investorEmail}',
                  subject: 'Urgent: Capital Call Payment Due in 7 Days - {fundName}',
                  template: '<h2>Payment Reminder</h2><p>Your capital call payment of ${amountDue} for {fundName} is due on {dueDate}.</p>',
                  variables: {},
                },
              },
              {
                id: 'action-2',
                type: ActionType.TAG_ENTITY,
                config: { tag: 'urgent-reminder' },
              },
            ],
          },
          {
            id: 'branch-2',
            name: 'Standard Priority',
            conditions: [],
            actions: [
              {
                id: 'action-3',
                type: ActionType.SEND_EMAIL,
                config: {
                  to: '{investorEmail}',
                  subject: 'Capital Call Payment Due in 7 Days - {fundName}',
                  template: '<h2>Payment Reminder</h2><p>Your capital call payment of ${amountDue} for {fundName} is due on {dueDate}.</p>',
                  variables: {},
                },
              },
            ],
          },
        ],
      },

      // High Amount Alert Template
      {
        name: 'High Amount Alert - CFO Approval Required',
        description: 'Require CFO approval for capital calls exceeding threshold',
        category: 'compliance',
        industry: 'PE',
        trigger: {
          id: 'trigger-2',
          type: TriggerType.CAPITAL_CALL_CREATED,
          config: {},
        },
        branches: [
          {
            id: 'branch-1',
            name: 'High Amount',
            conditions: [
              {
                id: 'cond-1',
                fieldId: 'amountDue',
                fieldName: 'amountDue',
                operator: 'GREATER_THAN',
                value: 500000,
                combineWith: 'AND',
              },
            ],
            actions: [
              {
                id: 'action-1',
                type: ActionType.REQUIRE_APPROVAL,
                config: {
                  description: 'High amount capital call requires CFO approval',
                  approvers: [],
                },
              },
              {
                id: 'action-2',
                type: ActionType.SLACK_NOTIFICATION,
                config: {
                  channel: '#finance',
                  message: 'High amount capital call created: {fundName} - ${amountDue}',
                },
              },
              {
                id: 'action-3',
                type: ActionType.LOG_AUDIT,
                config: {
                  description: 'High amount capital call created - approval required',
                },
              },
            ],
          },
        ],
      },

      // Document Processing Template
      {
        name: 'Document Auto-Classification',
        description: 'Automatically tag and route documents based on type',
        category: 'notifications',
        industry: 'PE',
        trigger: {
          id: 'trigger-3',
          type: TriggerType.DOCUMENT_UPLOADED,
          config: {},
        },
        branches: [
          {
            id: 'branch-1',
            name: 'Tax Documents',
            conditions: [
              {
                id: 'cond-1',
                fieldId: 'fileName',
                fieldName: 'fileName',
                operator: 'CONTAINS',
                value: 'K-1',
                combineWith: 'OR',
              },
              {
                id: 'cond-2',
                fieldId: 'fileName',
                fieldName: 'fileName',
                operator: 'CONTAINS',
                value: 'tax',
                combineWith: 'OR',
              },
            ],
            actions: [
              {
                id: 'action-1',
                type: ActionType.TAG_ENTITY,
                config: { tag: 'tax-document' },
              },
              {
                id: 'action-2',
                type: ActionType.SEND_EMAIL,
                config: {
                  to: 'accounting@example.com',
                  subject: 'New Tax Document Uploaded',
                  template: '<p>A new tax document has been uploaded: {fileName}</p>',
                  variables: {},
                },
              },
            ],
          },
          {
            id: 'branch-2',
            name: 'Distribution Notices',
            conditions: [
              {
                id: 'cond-3',
                fieldId: 'fileName',
                fieldName: 'fileName',
                operator: 'CONTAINS',
                value: 'distribution',
                combineWith: 'AND',
              },
            ],
            actions: [
              {
                id: 'action-3',
                type: ActionType.TAG_ENTITY,
                config: { tag: 'distribution' },
              },
            ],
          },
        ],
      },

      // Payment Reconciliation Template
      {
        name: 'Payment Received - Auto Reconciliation',
        description: 'Automatically reconcile payments and send confirmations',
        category: 'payments',
        industry: 'PE',
        trigger: {
          id: 'trigger-4',
          type: TriggerType.PAYMENT_RECEIVED,
          config: {},
        },
        branches: [
          {
            id: 'branch-1',
            name: 'Payment Matched',
            conditions: [],
            actions: [
              {
                id: 'action-1',
                type: ActionType.UPDATE_STATUS,
                config: { status: 'PAID' },
              },
              {
                id: 'action-2',
                type: ActionType.SEND_EMAIL,
                config: {
                  to: '{investorEmail}',
                  subject: 'Payment Received - {fundName}',
                  template: '<p>We have received your payment of ${amount} for {fundName}. Thank you!</p>',
                  variables: {},
                },
              },
              {
                id: 'action-3',
                type: ActionType.LOG_AUDIT,
                config: {
                  description: 'Payment received and matched to capital call',
                },
              },
            ],
          },
        ],
      },

      // Status Change Notification Template
      {
        name: 'Status Change Notifications',
        description: 'Send notifications when capital call status changes',
        category: 'notifications',
        industry: 'PE',
        trigger: {
          id: 'trigger-5',
          type: TriggerType.STATUS_CHANGED,
          config: {},
        },
        branches: [
          {
            id: 'branch-1',
            name: 'Approved',
            conditions: [
              {
                id: 'cond-1',
                fieldId: 'status',
                fieldName: 'status',
                operator: 'EQUALS',
                value: 'APPROVED',
                combineWith: 'AND',
              },
            ],
            actions: [
              {
                id: 'action-1',
                type: ActionType.SEND_EMAIL,
                config: {
                  to: '{investorEmail}',
                  subject: 'Capital Call Approved - {fundName}',
                  template: '<p>Your capital call for {fundName} has been approved. Payment is due on {dueDate}.</p>',
                  variables: {},
                },
              },
            ],
          },
          {
            id: 'branch-2',
            name: 'Rejected',
            conditions: [
              {
                id: 'cond-2',
                fieldId: 'status',
                fieldName: 'status',
                operator: 'EQUALS',
                value: 'REJECTED',
                combineWith: 'AND',
              },
            ],
            actions: [
              {
                id: 'action-2',
                type: ActionType.SEND_EMAIL,
                config: {
                  to: '{investorEmail}',
                  subject: 'Capital Call Rejected - {fundName}',
                  template: '<p>Your capital call for {fundName} has been rejected. Please contact us for more information.</p>',
                  variables: {},
                },
              },
            ],
          },
        ],
      },
    ];

    for (const templateData of templates) {
      await db.workflowTemplate.create({
        data: {
          ...templateData,
          organizationId,
          createdBy: userId,
          isPublic: true,
          usageCount: 0,
          rating: 5.0,
        },
      });
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<WorkflowTemplate | null> {
    return await db.workflowTemplate.findUnique({
      where: { id: templateId },
    });
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    await db.workflowTemplate.delete({
      where: { id: templateId },
    });
  }

  /**
   * Update template rating
   */
  async rateTemplate(templateId: string, rating: number): Promise<void> {
    const template = await db.workflowTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Simple average rating (in production, would track individual ratings)
    const newRating = (template.rating + rating) / 2;

    await db.workflowTemplate.update({
      where: { id: templateId },
      data: { rating: newRating },
    });
  }
}

// Export singleton instance
export const workflowTemplateManager = new WorkflowTemplateManager();
