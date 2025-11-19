// Clearway - Workflow Builder
// Workflow Automation Agent - Task WF-002

import { z } from 'zod';
import { db } from '@/lib/db';

export enum TriggerType {
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  CAPITAL_CALL_CREATED = 'CAPITAL_CALL_CREATED',
  CAPITAL_CALL_UPDATED = 'CAPITAL_CALL_UPDATED',
  AMOUNT_THRESHOLD = 'AMOUNT_THRESHOLD',
  DUE_DATE_APPROACHING = 'DUE_DATE_APPROACHING',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  CUSTOM_FIELD_CHANGED = 'CUSTOM_FIELD_CHANGED',
  SCHEDULED = 'SCHEDULED',
  WEBHOOK = 'WEBHOOK',
  API_CALL = 'API_CALL',
}

export enum ActionType {
  SEND_EMAIL = 'SEND_EMAIL',
  CALL_WEBHOOK = 'CALL_WEBHOOK',
  MAKE_API_REQUEST = 'MAKE_API_REQUEST',
  CREATE_TASK = 'CREATE_TASK',
  TAG_ENTITY = 'TAG_ENTITY',
  UPDATE_STATUS = 'UPDATE_STATUS',
  REQUIRE_APPROVAL = 'REQUIRE_APPROVAL',
  LOG_AUDIT = 'LOG_AUDIT',
  SLACK_NOTIFICATION = 'SLACK_NOTIFICATION',
  UPDATE_FIELD = 'UPDATE_FIELD',
  ARCHIVE = 'ARCHIVE',
  GENERATE_REPORT = 'GENERATE_REPORT',
}

export enum ConditionOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  IS_EMPTY = 'IS_EMPTY',
  IS_NOT_EMPTY = 'IS_NOT_EMPTY',
  BETWEEN = 'BETWEEN',
}

const TriggerSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(TriggerType),
  config: z.record(z.any()).optional(),
});

const ConditionSchema = z.object({
  id: z.string(),
  fieldId: z.string(),
  fieldName: z.string().optional(),
  operator: z.nativeEnum(ConditionOperator),
  value: z.any(),
  combineWith: z.enum(['AND', 'OR']).default('AND'),
});

const ActionSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(ActionType),
  config: z.record(z.any()),
  delaySeconds: z.number().optional(),
});

const WorkflowBranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  conditions: z.array(ConditionSchema),
  actions: z.array(ActionSchema),
  nextBranchId: z.string().optional(),
});

export const WorkflowSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string().cuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),

  trigger: TriggerSchema,
  branches: z.array(WorkflowBranchSchema),
  defaultActions: z.array(ActionSchema).optional(),

  enabled: z.boolean().default(true),
  version: z.number().default(1),

  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
});

export type Workflow = z.infer<typeof WorkflowSchema>;
export type WorkflowBranch = z.infer<typeof WorkflowBranchSchema>;
export type WorkflowAction = z.infer<typeof ActionSchema>;
export type WorkflowCondition = z.infer<typeof ConditionSchema>;
export type WorkflowTrigger = z.infer<typeof TriggerSchema>;

export class WorkflowBuilder {
  /**
   * Create a new workflow
   */
  async createWorkflow(organizationId: string, params: {
    name: string;
    description?: string;
    trigger: WorkflowTrigger;
    userId: string;
  }): Promise<Workflow> {
    const workflow = await db.workflow.create({
      data: {
        organizationId,
        name: params.name,
        description: params.description,
        trigger: params.trigger as any,
        branches: [],
        enabled: false, // Start disabled
        version: 1,
        createdBy: params.userId,
      },
    });

    return WorkflowSchema.parse(workflow);
  }

  /**
   * Add branch to workflow
   */
  async addBranch(workflowId: string, params: {
    name: string;
    conditions: WorkflowCondition[];
    actions: WorkflowAction[];
  }): Promise<Workflow> {
    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const branchId = crypto.randomUUID();
    const branches = workflow.branches as any[];

    branches.push({
      id: branchId,
      name: params.name,
      conditions: params.conditions,
      actions: params.actions,
    });

    const updated = await db.workflow.update({
      where: { id: workflowId },
      data: { branches },
    });

    return WorkflowSchema.parse(updated);
  }

  /**
   * Update branch in workflow
   */
  async updateBranch(workflowId: string, branchId: string, params: {
    name?: string;
    conditions?: WorkflowCondition[];
    actions?: WorkflowAction[];
  }): Promise<Workflow> {
    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const branches = workflow.branches as any[];
    const branchIndex = branches.findIndex((b: any) => b.id === branchId);

    if (branchIndex === -1) {
      throw new Error('Branch not found');
    }

    branches[branchIndex] = {
      ...branches[branchIndex],
      name: params.name ?? branches[branchIndex].name,
      conditions: params.conditions ?? branches[branchIndex].conditions,
      actions: params.actions ?? branches[branchIndex].actions,
    };

    const updated = await db.workflow.update({
      where: { id: workflowId },
      data: { branches },
    });

    return WorkflowSchema.parse(updated);
  }

  /**
   * Remove branch from workflow
   */
  async removeBranch(workflowId: string, branchId: string): Promise<Workflow> {
    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const branches = (workflow.branches as any[]).filter(
      (b: any) => b.id !== branchId
    );

    const updated = await db.workflow.update({
      where: { id: workflowId },
      data: { branches },
    });

    return WorkflowSchema.parse(updated);
  }

  /**
   * Validate workflow is complete and functional
   */
  async validateWorkflow(workflowId: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const errors: string[] = [];

    // Check trigger is configured
    if (!workflow.trigger) {
      errors.push('Workflow must have a trigger');
    }

    // Check at least one branch or default action
    const branches = workflow.branches as any[];
    if (branches.length === 0 && !workflow.defaultActions) {
      errors.push('Workflow must have at least one branch or default action');
    }

    // Validate each branch
    for (const branch of branches) {
      // Check conditions
      if (branch.conditions.length === 0 && branches.length > 1) {
        errors.push(
          `Branch "${branch.name}" has no conditions (required for multi-branch workflows)`
        );
      }

      // Check actions
      if (branch.actions.length === 0) {
        errors.push(`Branch "${branch.name}" has no actions`);
      }

      // Validate field references exist
      for (const condition of branch.conditions) {
        const field = await db.customField.findUnique({
          where: { id: condition.fieldId },
        });
        if (!field) {
          errors.push(
            `Branch "${branch.name}" references non-existent field: ${condition.fieldName}`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Publish workflow (enable and track version)
   */
  async publishWorkflow(workflowId: string, userId: string): Promise<Workflow> {
    const validation = await this.validateWorkflow(workflowId);

    if (!validation.valid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
    }

    // Archive current version
    const current = await db.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!current) {
      throw new Error('Workflow not found');
    }

    if (current.enabled) {
      await db.workflowVersion.create({
        data: {
          workflowId,
          version: current.version,
          definition: current as any,
          archivedBy: userId,
          archivedAt: new Date(),
        },
      });
    }

    // Publish new version
    const updated = await db.workflow.update({
      where: { id: workflowId },
      data: {
        enabled: true,
        version: (current?.version || 0) + 1,
        updatedAt: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        action: 'WORKFLOW_PUBLISHED',
        entityType: 'WORKFLOW',
        entityId: workflowId,
        userId,
        metadata: {
          workflowName: updated.name,
          version: updated.version,
        },
      },
    });

    return WorkflowSchema.parse(updated);
  }

  /**
   * Duplicate workflow
   */
  async duplicateWorkflow(
    workflowId: string,
    newName: string,
    userId: string
  ): Promise<Workflow> {
    const original = await db.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!original) {
      throw new Error('Workflow not found');
    }

    const duplicate = await db.workflow.create({
      data: {
        organizationId: original.organizationId,
        name: newName,
        description: original.description,
        trigger: original.trigger,
        branches: original.branches,
        defaultActions: original.defaultActions,
        enabled: false,
        version: 1,
        createdBy: userId,
      },
    });

    return WorkflowSchema.parse(duplicate);
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      return null;
    }

    return WorkflowSchema.parse(workflow);
  }

  /**
   * List workflows for organization
   */
  async listWorkflows(organizationId: string, filters?: {
    enabled?: boolean;
    triggerType?: TriggerType;
  }): Promise<Workflow[]> {
    const workflows = await db.workflow.findMany({
      where: {
        organizationId,
        ...(filters?.enabled !== undefined && { enabled: filters.enabled }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return workflows.map(w => WorkflowSchema.parse(w));
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    await db.workflow.delete({
      where: { id: workflowId },
    });
  }

  /**
   * Toggle workflow enabled status
   */
  async toggleWorkflow(workflowId: string, enabled: boolean): Promise<Workflow> {
    const updated = await db.workflow.update({
      where: { id: workflowId },
      data: { enabled },
    });

    return WorkflowSchema.parse(updated);
  }
}

// Export singleton instance
export const workflowBuilder = new WorkflowBuilder();
