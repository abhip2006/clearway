// Clearway - Workflow Execution Engine
// Workflow Automation Agent - Task WF-003

import { db } from '@/lib/db';
import { ActionType, ConditionOperator } from './workflow-builder';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export enum ExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

export class WorkflowExecutionEngine {
  /**
   * Execute workflow for triggered entity
   */
  async executeWorkflow(params: {
    workflowId: string;
    triggerType: string;
    entityType: string;
    entityId: string;
    triggerData: Record<string, any>;
    userId?: string;
  }): Promise<string> {
    const workflow = await db.workflow.findUnique({
      where: { id: params.workflowId },
    });

    if (!workflow || !workflow.enabled) {
      throw new Error('Workflow not found or disabled');
    }

    // Create execution record
    const execution = await db.workflowExecution.create({
      data: {
        workflowId: params.workflowId,
        status: ExecutionStatus.PENDING,
        triggerType: params.triggerType,
        entityType: params.entityType,
        entityId: params.entityId,
        triggerData: params.triggerData,
        userId: params.userId,
      },
    });

    // Execute workflow asynchronously
    this.runWorkflow(execution.id, workflow, params.entityType, params.entityId, params.triggerData).catch(
      async (error) => {
        await db.workflowExecution.update({
          where: { id: execution.id },
          data: {
            status: ExecutionStatus.FAILED,
            error: (error as Error).message,
            completedAt: new Date(),
          },
        });
      }
    );

    return execution.id;
  }

  /**
   * Run workflow execution
   */
  private async runWorkflow(
    executionId: string,
    workflow: any,
    entityType: string,
    entityId: string,
    triggerData: Record<string, any>
  ): Promise<void> {
    // Update status to running
    await db.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    try {
      // Get entity data
      const entityData = await this.getEntityData(entityType, entityId);
      const combinedData = { ...entityData, ...triggerData };

      // Evaluate branches
      const branches = workflow.branches as any[];
      let executed = false;

      for (const branch of branches) {
        const conditionsMet = await this.evaluateConditions(
          branch.conditions,
          combinedData
        );

        if (conditionsMet) {
          // Execute branch actions
          for (const action of branch.actions) {
            // Delay if specified
            if (action.delaySeconds) {
              await new Promise(resolve => setTimeout(resolve, action.delaySeconds * 1000));
            }

            await this.executeAction(action, executionId, combinedData);
          }
          executed = true;
          break; // Only execute first matching branch
        }
      }

      // Execute default actions if no branch matched
      if (!executed && workflow.defaultActions) {
        for (const action of workflow.defaultActions) {
          await this.executeAction(action, executionId, combinedData);
        }
      }

      // Mark execution as successful
      await db.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.SUCCEEDED,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get entity data for workflow execution
   */
  private async getEntityData(entityType: string, entityId: string): Promise<Record<string, any>> {
    let entityData: Record<string, any> = {
      entityType,
      entityId,
    };

    switch (entityType) {
      case 'CAPITAL_CALL':
        const capitalCall = await db.capitalCall.findUnique({
          where: { id: entityId },
          include: { organization: true },
        });
        if (capitalCall) {
          entityData = {
            ...entityData,
            fundName: capitalCall.fundName,
            amountDue: capitalCall.amountDue.toString(),
            dueDate: capitalCall.dueDate,
            status: capitalCall.status,
            organizationId: capitalCall.organizationId,
            investorEmail: capitalCall.investorEmail,
          };
        }
        break;

      case 'DOCUMENT':
        const document = await db.document.findUnique({
          where: { id: entityId },
        });
        if (document) {
          entityData = {
            ...entityData,
            fileName: document.fileName,
            fileSize: document.fileSize,
            mimeType: document.mimeType,
            status: document.status,
            organizationId: document.organizationId,
          };
        }
        break;

      case 'PAYMENT':
        const payment = await db.payment.findUnique({
          where: { id: entityId },
        });
        if (payment) {
          entityData = {
            ...entityData,
            amount: payment.amount.toString(),
            currency: payment.currency,
            paymentMethod: payment.paymentMethod,
            status: payment.status,
          };
        }
        break;
    }

    // Get custom field values
    const customFields = await db.customFieldValue.findMany({
      where: {
        entityType,
        entityId,
      },
      include: { customField: true },
    });

    for (const cf of customFields) {
      entityData[cf.customField.name] = cf.value;
    }

    return entityData;
  }

  /**
   * Evaluate conditions against entity data
   */
  async evaluateConditions(
    conditions: any[],
    entityData: Record<string, any>
  ): Promise<boolean> {
    if (conditions.length === 0) return true;

    let result = true;
    let currentOperator = conditions[0].combineWith || 'AND';

    for (const condition of conditions) {
      const matches = this.evaluateCondition(condition, entityData);

      if (currentOperator === 'AND') {
        result = result && matches;
      } else {
        result = result || matches;
      }

      currentOperator = condition.combineWith || 'AND';
    }

    return result;
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(
    condition: any,
    entityData: Record<string, any>
  ): boolean {
    const fieldValue = entityData[condition.fieldName];
    const conditionValue = condition.value;

    switch (condition.operator) {
      case ConditionOperator.EQUALS:
        return fieldValue === conditionValue;

      case ConditionOperator.NOT_EQUALS:
        return fieldValue !== conditionValue;

      case ConditionOperator.GREATER_THAN:
        return Number(fieldValue) > Number(conditionValue);

      case ConditionOperator.LESS_THAN:
        return Number(fieldValue) < Number(conditionValue);

      case ConditionOperator.GREATER_THAN_OR_EQUAL:
        return Number(fieldValue) >= Number(conditionValue);

      case ConditionOperator.LESS_THAN_OR_EQUAL:
        return Number(fieldValue) <= Number(conditionValue);

      case ConditionOperator.CONTAINS:
        return String(fieldValue).includes(String(conditionValue));

      case ConditionOperator.NOT_CONTAINS:
        return !String(fieldValue).includes(String(conditionValue));

      case ConditionOperator.STARTS_WITH:
        return String(fieldValue).startsWith(String(conditionValue));

      case ConditionOperator.ENDS_WITH:
        return String(fieldValue).endsWith(String(conditionValue));

      case ConditionOperator.IN:
        return Array.isArray(conditionValue) &&
          conditionValue.includes(fieldValue);

      case ConditionOperator.NOT_IN:
        return !Array.isArray(conditionValue) ||
          !conditionValue.includes(fieldValue);

      case ConditionOperator.IS_EMPTY:
        return !fieldValue || fieldValue === '';

      case ConditionOperator.IS_NOT_EMPTY:
        return fieldValue && fieldValue !== '';

      case ConditionOperator.BETWEEN:
        return Number(fieldValue) >= Number(conditionValue[0]) &&
          Number(fieldValue) <= Number(conditionValue[1]);

      default:
        return false;
    }
  }

  /**
   * Execute action
   */
  async executeAction(
    action: any,
    executionId: string,
    entityData: Record<string, any>
  ): Promise<void> {
    const startTime = Date.now();

    try {
      switch (action.type) {
        case ActionType.SEND_EMAIL:
          await this.actionSendEmail(action, entityData);
          break;

        case ActionType.CALL_WEBHOOK:
          await this.actionCallWebhook(action, entityData);
          break;

        case ActionType.UPDATE_FIELD:
          await this.actionUpdateField(action, entityData);
          break;

        case ActionType.TAG_ENTITY:
          await this.actionTagEntity(action, entityData);
          break;

        case ActionType.UPDATE_STATUS:
          await this.actionUpdateStatus(action, entityData);
          break;

        case ActionType.REQUIRE_APPROVAL:
          await this.actionRequireApproval(action, entityData);
          break;

        case ActionType.SLACK_NOTIFICATION:
          await this.actionSlackNotification(action, entityData);
          break;

        case ActionType.LOG_AUDIT:
          await this.actionLogAudit(action, entityData);
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      // Log action execution
      await db.workflowActionLog.create({
        data: {
          executionId,
          actionId: action.id,
          actionType: action.type,
          status: 'SUCCESS',
          duration: Date.now() - startTime,
        },
      });
    } catch (error) {
      await db.workflowActionLog.create({
        data: {
          executionId,
          actionId: action.id,
          actionType: action.type,
          status: 'FAILED',
          error: (error as Error).message,
          duration: Date.now() - startTime,
        },
      });
      throw error;
    }
  }

  /**
   * Send email action
   */
  private async actionSendEmail(action: any, entityData: Record<string, any>) {
    const { to, subject, template, variables } = action.config;

    // Substitute variables
    const substituted = this.substituteVariables(
      { to, subject, template, variables },
      entityData
    );

    await resend.emails.send({
      from: 'Clearway <workflows@clearway.com>',
      to: substituted.to,
      subject: substituted.subject,
      html: await this.renderTemplate(substituted.template, substituted.variables),
    });
  }

  /**
   * Call webhook action
   */
  private async actionCallWebhook(action: any, entityData: Record<string, any>) {
    const { url, method, headers, body } = action.config;

    const substituted = this.substituteVariables(
      { body },
      entityData
    );

    const response = await fetch(url, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(substituted.body),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }
  }

  /**
   * Update custom field action
   */
  private async actionUpdateField(action: any, entityData: Record<string, any>) {
    const { fieldId, value } = action.config;

    const substituted = this.substituteVariables({ value }, entityData);

    await db.customFieldValue.upsert({
      where: {
        customFieldId_entityType_entityId: {
          customFieldId: fieldId,
          entityType: entityData.entityType,
          entityId: entityData.entityId,
        },
      },
      update: { value: substituted.value },
      create: {
        customFieldId: fieldId,
        entityType: entityData.entityType,
        entityId: entityData.entityId,
        value: substituted.value,
        createdBy: 'workflow-automation',
      },
    });
  }

  /**
   * Tag entity action
   */
  private async actionTagEntity(action: any, entityData: Record<string, any>) {
    const { tag } = action.config;

    // Find or create tag
    let tagRecord = await db.tag.findFirst({
      where: {
        organizationId: entityData.organizationId,
        name: tag,
      },
    });

    if (!tagRecord) {
      tagRecord = await db.tag.create({
        data: {
          organizationId: entityData.organizationId,
          name: tag,
          color: '#3B82F6', // Default blue
        },
      });
    }

    // Add tag to entity
    await db.entityTag.upsert({
      where: {
        entityType_entityId_tagId: {
          entityType: entityData.entityType,
          entityId: entityData.entityId,
          tagId: tagRecord.id,
        },
      },
      update: {},
      create: {
        entityType: entityData.entityType,
        entityId: entityData.entityId,
        tagId: tagRecord.id,
      },
    });
  }

  /**
   * Update status action
   */
  private async actionUpdateStatus(action: any, entityData: Record<string, any>) {
    const { status } = action.config;

    if (entityData.entityType === 'CAPITAL_CALL') {
      await db.capitalCall.update({
        where: { id: entityData.entityId },
        data: { status },
      });
    }
  }

  /**
   * Require approval action
   */
  private async actionRequireApproval(action: any, entityData: Record<string, any>) {
    const { approvers } = action.config;

    const task = await db.approvalTask.create({
      data: {
        entityType: entityData.entityType,
        entityId: entityData.entityId,
        description: action.config.description || 'Requires approval',
        status: 'PENDING',
        requiredApprovals: Array.isArray(approvers) ? approvers.length : 1,
        createdAt: new Date(),
      },
    });

    // Send approval notifications
    for (const approverId of Array.isArray(approvers) ? approvers : [approvers]) {
      const approver = await db.user.findUnique({
        where: { id: approverId },
      });

      if (approver) {
        await resend.emails.send({
          from: 'Clearway <notifications@clearway.com>',
          to: approver.email,
          subject: 'Approval Required',
          html: `<p>An approval task requires your attention. <a href="https://clearway.com/approvals/${task.id}">Review now</a></p>`,
        });
      }
    }
  }

  /**
   * Slack notification action
   */
  private async actionSlackNotification(action: any, entityData: Record<string, any>) {
    const { channel, message } = action.config;

    const substituted = this.substituteVariables({ message }, entityData);

    // Would integrate with Slack SDK
    // await slack.chat.postMessage({ channel, text: substituted.message });
    console.log(`Slack notification to ${channel}: ${substituted.message}`);
  }

  /**
   * Log audit action
   */
  private async actionLogAudit(action: any, entityData: Record<string, any>) {
    const { description } = action.config;

    const substituted = this.substituteVariables({ description }, entityData);

    await db.auditLog.create({
      data: {
        action: 'WORKFLOW_ACTION',
        entityType: entityData.entityType,
        entityId: entityData.entityId,
        userId: 'system-workflow',
        metadata: {
          description: substituted.description,
          workflowTriggered: true,
        },
      },
    });
  }

  /**
   * Substitute variables in strings
   */
  private substituteVariables(
    template: Record<string, any>,
    entityData: Record<string, any>
  ): Record<string, any> {
    const substitute = (value: any): any => {
      if (typeof value === 'string') {
        return value.replace(/\{(\w+)\}/g, (match, key) => {
          return entityData[key] || match;
        });
      } else if (typeof value === 'object' && value !== null) {
        return Array.isArray(value)
          ? value.map(substitute)
          : Object.entries(value).reduce((acc, [k, v]) => {
            acc[k] = substitute(v);
            return acc;
          }, {} as Record<string, any>);
      }
      return value;
    };

    return substitute(template);
  }

  /**
   * Render email template
   */
  private async renderTemplate(template: string, variables: Record<string, any>): Promise<string> {
    // Would use template engine like Handlebars
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  /**
   * Get execution history for entity
   */
  async getExecutionHistory(entityType: string, entityId: string): Promise<any[]> {
    const executions = await db.workflowExecution.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        workflow: true,
        actionLogs: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return executions;
  }

  /**
   * Get execution by ID
   */
  async getExecution(executionId: string): Promise<any> {
    const execution = await db.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        workflow: true,
        actionLogs: true,
      },
    });

    return execution;
  }

  /**
   * Cancel running workflow execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    await db.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.CANCELLED,
        completedAt: new Date(),
      },
    });
  }
}

// Export singleton instance
export const workflowExecutionEngine = new WorkflowExecutionEngine();
