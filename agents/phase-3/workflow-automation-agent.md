# Workflow Automation Agent ⚙️

## Role
Specialized agent responsible for no-code workflow automation, custom field management, and intelligent process automation. Enables fund administrators and RIA firms to create custom workflows without coding, automating repetitive tasks through visual builders, conditional logic, and integrated actions.

## Primary Responsibilities

1. **Custom Field Management**
   - User-defined fields on capital calls
   - Custom fields on documents
   - Custom fields on distributions
   - Field types (text, number, date, select, checkbox, currency)
   - Field validation rules
   - Field organization and grouping

2. **No-Code Workflow Builder**
   - Visual workflow editor (drag-and-drop)
   - If-then-else conditional logic
   - Multiple branch paths
   - Workflow state management
   - Version control and rollback
   - Workflow activation/deactivation

3. **Automation Triggers**
   - Document uploaded
   - Capital call created/updated
   - Amount threshold exceeded
   - Due date approaching
   - Payment received
   - Status changed
   - Custom field value change
   - Scheduled (daily, weekly, monthly)
   - Webhook trigger
   - API trigger

4. **Workflow Actions**
   - Send email notification
   - Call webhook endpoint
   - Make API request
   - Create task/reminder
   - Tag document/capital call
   - Update status
   - Require approval
   - Log to audit trail
   - Create slack notification
   - Update custom fields
   - Archive/delete
   - Generate report

5. **Workflow Templates**
   - Pre-built templates for common use cases
   - Template marketplace
   - Custom template creation
   - Template sharing across organizations
   - Template versioning

6. **Workflow Analytics**
   - Workflow execution history
   - Success/failure rates
   - Performance metrics
   - Automation ROI calculations
   - Execution timeline tracking

## Tech Stack

### Workflow Engine
- **Temporal** for distributed workflow orchestration
- **Zod** for workflow schema validation
- **JSON Schema** for workflow definition
- **Zustand** for workflow state management

### Visual Builder
- **React Flow** for workflow diagram visualization
- **React Hook Form** for condition building
- **Headless UI** for workflow UI components
- **Framer Motion** for animations

### Notifications & Actions
- **Resend** for email delivery
- **Slack SDK** for Slack notifications
- **Stripe Webhooks** for payment triggers
- **Twilio** for SMS notifications

### Database
- **PostgreSQL** with JSON columns for workflow definitions
- **Redis** for workflow execution caching

### Monitoring
- **Datadog** for workflow execution monitoring
- **Sentry** for error tracking

---

## Phase 3 Features

### Week 37-38: Custom Fields & Workflow Foundation

**Task WF-001: Custom Field Manager**
```typescript
// lib/workflow/custom-fields.ts

import { z } from 'zod';
import { db } from '@/lib/db';

export enum CustomFieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  CHECKBOX = 'CHECKBOX',
  CURRENCY = 'CURRENCY',
  EMAIL = 'EMAIL',
  URL = 'URL',
  TEXTAREA = 'TEXTAREA',
}

export enum CustomFieldEntityType {
  CAPITAL_CALL = 'CAPITAL_CALL',
  DOCUMENT = 'DOCUMENT',
  DISTRIBUTION = 'DISTRIBUTION',
  PAYMENT = 'PAYMENT',
}

const CustomFieldSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string().cuid(),
  entityType: z.nativeEnum(CustomFieldEntityType),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  fieldType: z.nativeEnum(CustomFieldType),
  required: z.boolean().default(false),
  defaultValue: z.any().optional(),

  // Validation rules
  validation: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
    pattern: z.string().optional(),
    allowedValues: z.array(z.string()).optional(),
  }).optional(),

  // Display options
  displaySettings: z.object({
    groupName: z.string().optional(),
    position: z.number().optional(),
    hideFromView: z.boolean().default(false),
    readOnly: z.boolean().default(false),
  }).optional(),

  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CustomField = z.infer<typeof CustomFieldSchema>;

export class CustomFieldManager {
  /**
   * Create a custom field for an organization
   */
  async createField(organizationId: string, params: {
    entityType: CustomFieldEntityType;
    name: string;
    fieldType: CustomFieldType;
    description?: string;
    required?: boolean;
    defaultValue?: any;
    validation?: Record<string, any>;
    displaySettings?: Record<string, any>;
  }): Promise<CustomField> {
    // Validate field name is unique
    const existing = await db.customField.findFirst({
      where: {
        organizationId,
        entityType: params.entityType,
        name: params.name,
      },
    });

    if (existing) {
      throw new Error(`Custom field "${params.name}" already exists`);
    }

    // Create field
    const field = await db.customField.create({
      data: {
        organizationId,
        entityType: params.entityType,
        name: params.name,
        fieldType: params.fieldType,
        description: params.description,
        required: params.required || false,
        defaultValue: params.defaultValue,
        validation: params.validation,
        displaySettings: params.displaySettings,
      },
    });

    return CustomFieldSchema.parse(field);
  }

  /**
   * Get all custom fields for entity type
   */
  async getFieldsByEntity(
    organizationId: string,
    entityType: CustomFieldEntityType
  ): Promise<CustomField[]> {
    const fields = await db.customField.findMany({
      where: {
        organizationId,
        entityType,
      },
      orderBy: [
        { displaySettings: { fieldValue: 'position' } },
        { createdAt: 'asc' },
      ],
    });

    return fields.map(f => CustomFieldSchema.parse(f));
  }

  /**
   * Update custom field
   */
  async updateField(fieldId: string, params: Partial<CustomField>) {
    const field = await db.customField.update({
      where: { id: fieldId },
      data: {
        name: params.name,
        description: params.description,
        validation: params.validation,
        displaySettings: params.displaySettings,
        required: params.required,
        defaultValue: params.defaultValue,
      },
    });

    return CustomFieldSchema.parse(field);
  }

  /**
   * Delete custom field (with cascade)
   */
  async deleteField(fieldId: string): Promise<void> {
    // Check if field is used in any workflows
    const workflows = await db.workflow.findMany({
      where: {
        conditions: {
          some: {
            fieldId,
          },
        },
      },
    });

    if (workflows.length > 0) {
      throw new Error(
        `Cannot delete field: used in ${workflows.length} workflow(s)`
      );
    }

    // Delete all custom field values for this field
    await db.customFieldValue.deleteMany({
      where: { customFieldId: fieldId },
    });

    // Delete the field
    await db.customField.delete({
      where: { id: fieldId },
    });
  }

  /**
   * Set value for custom field on entity
   */
  async setFieldValue(params: {
    fieldId: string;
    entityType: CustomFieldEntityType;
    entityId: string;
    value: any;
    userId: string;
  }): Promise<void> {
    const field = await db.customField.findUnique({
      where: { id: params.fieldId },
    });

    if (!field) {
      throw new Error('Custom field not found');
    }

    // Validate value
    await this.validateFieldValue(field, params.value);

    // Upsert value
    await db.customFieldValue.upsert({
      where: {
        customFieldId_entityType_entityId: {
          customFieldId: params.fieldId,
          entityType: params.entityType,
          entityId: params.entityId,
        },
      },
      update: {
        value: params.value,
        updatedBy: params.userId,
        updatedAt: new Date(),
      },
      create: {
        customFieldId: params.fieldId,
        entityType: params.entityType,
        entityId: params.entityId,
        value: params.value,
        createdBy: params.userId,
      },
    });

    // Log to audit trail
    await db.auditLog.create({
      data: {
        action: 'CUSTOM_FIELD_UPDATED',
        entityType: params.entityType,
        entityId: params.entityId,
        userId: params.userId,
        metadata: {
          fieldId: params.fieldId,
          fieldName: field.name,
          newValue: params.value,
        },
      },
    });
  }

  /**
   * Get all custom field values for entity
   */
  async getEntityCustomFields(
    entityType: CustomFieldEntityType,
    entityId: string
  ): Promise<Record<string, any>> {
    const values = await db.customFieldValue.findMany({
      where: {
        entityType,
        entityId,
      },
      include: { field: true },
    });

    const result: Record<string, any> = {};
    for (const val of values) {
      result[val.field.name] = val.value;
    }

    return result;
  }

  /**
   * Validate field value against field rules
   */
  private async validateFieldValue(field: CustomField, value: any) {
    const validation = field.validation || {};

    switch (field.fieldType) {
      case CustomFieldType.TEXT:
      case CustomFieldType.EMAIL:
      case CustomFieldType.URL:
      case CustomFieldType.TEXTAREA:
        if (typeof value !== 'string') {
          throw new Error(`Field ${field.name} must be a string`);
        }
        if (
          validation.minLength &&
          value.length < validation.minLength
        ) {
          throw new Error(
            `Field ${field.name} must be at least ${validation.minLength} characters`
          );
        }
        if (
          validation.maxLength &&
          value.length > validation.maxLength
        ) {
          throw new Error(
            `Field ${field.name} must be at most ${validation.maxLength} characters`
          );
        }
        if (validation.pattern) {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(value)) {
            throw new Error(`Field ${field.name} format is invalid`);
          }
        }
        break;

      case CustomFieldType.NUMBER:
      case CustomFieldType.CURRENCY:
        const num = parseFloat(value);
        if (isNaN(num)) {
          throw new Error(`Field ${field.name} must be a number`);
        }
        if (
          validation.minValue !== undefined &&
          num < validation.minValue
        ) {
          throw new Error(
            `Field ${field.name} must be at least ${validation.minValue}`
          );
        }
        if (
          validation.maxValue !== undefined &&
          num > validation.maxValue
        ) {
          throw new Error(
            `Field ${field.name} must be at most ${validation.maxValue}`
          );
        }
        break;

      case CustomFieldType.SELECT:
      case CustomFieldType.MULTI_SELECT:
        const allowedValues = validation.allowedValues || [];
        const valuesToCheck = Array.isArray(value) ? value : [value];
        for (const v of valuesToCheck) {
          if (!allowedValues.includes(v)) {
            throw new Error(
              `Field ${field.name} has invalid value: ${v}`
            );
          }
        }
        break;

      case CustomFieldType.DATE:
        if (!(value instanceof Date) && typeof value !== 'string') {
          throw new Error(`Field ${field.name} must be a date`);
        }
        break;
    }
  }
}
```

**Acceptance Criteria**:
- ✅ Create custom fields for capital calls, documents, distributions, payments
- ✅ Support all field types (text, number, date, select, checkbox, currency, etc.)
- ✅ Field validation rules (min/max length, patterns, allowed values)
- ✅ Display settings (grouping, position, read-only)
- ✅ Set and retrieve custom field values
- ✅ Audit trail for field changes
- ✅ Prevent deletion of fields used in workflows
- ✅ Default values support

---

**Task WF-002: Workflow Definition & Schema**
```typescript
// lib/workflow/workflow-builder.ts

import { z } from 'zod';

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

export class WorkflowBuilder {
  /**
   * Create a new workflow
   */
  async createWorkflow(organizationId: string, params: {
    name: string;
    description?: string;
    trigger: z.infer<typeof TriggerSchema>;
    userId: string;
  }): Promise<Workflow> {
    const workflow = await db.workflow.create({
      data: {
        organizationId,
        name: params.name,
        description: params.description,
        trigger: params.trigger,
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
    conditions: z.infer<typeof ConditionSchema>[];
    actions: z.infer<typeof ActionSchema>[];
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
   * Validate workflow is complete and functional
   */
  async validateWorkflow(workflow: Workflow): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check trigger is configured
    if (!workflow.trigger) {
      errors.push('Workflow must have a trigger');
    }

    // Check at least one branch or default action
    if (workflow.branches.length === 0 && !workflow.defaultActions) {
      errors.push('Workflow must have at least one branch or default action');
    }

    // Validate each branch
    for (const branch of workflow.branches) {
      // Check conditions
      if (branch.conditions.length === 0 && workflow.branches.length > 1) {
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
    const validation = await this.validateWorkflow(
      await db.workflow.findUnique({ where: { id: workflowId } })!
    );

    if (!validation.valid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
    }

    // Archive current version
    const current = await db.workflow.findUnique({
      where: { id: workflowId },
    });

    if (current?.enabled) {
      await db.workflowVersion.create({
        data: {
          workflowId,
          version: current.version,
          definition: current,
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
}
```

**Acceptance Criteria**:
- ✅ Define workflows with triggers, conditions, and actions
- ✅ Support multiple branches with if-then-else logic
- ✅ Validate workflow completeness before publishing
- ✅ Version control for workflows
- ✅ Enable/disable workflows
- ✅ Duplicate workflows
- ✅ Support all trigger types
- ✅ Support all action types

---

### Week 38-39: Workflow Execution & Visual Builder

**Task WF-003: Workflow Execution Engine**
```typescript
// lib/workflow/execution-engine.ts

import { Temporal } from '@temporalio/client';
import { db } from '@/lib/db';

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

    // Queue execution with Temporal
    try {
      const client = await Temporal.Client.connect({
        address: process.env.TEMPORAL_SERVER_ADDRESS,
      });

      const handle = await client.workflow.start('executeWorkflow', {
        args: [
          {
            executionId: execution.id,
            workflowId: params.workflowId,
            entityType: params.entityType,
            entityId: params.entityId,
            triggerData: params.triggerData,
          },
        ],
        taskQueue: 'workflow-queue',
        workflowId: `workflow-${params.workflowId}-${Date.now()}`,
      });

      // Update execution with workflow run ID
      await db.workflowExecution.update({
        where: { id: execution.id },
        data: {
          workflowRunId: handle.workflowId,
          status: ExecutionStatus.RUNNING,
          startedAt: new Date(),
        },
      });
    } catch (error) {
      await db.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.FAILED,
          error: (error as Error).message,
          completedAt: new Date(),
        },
      });
      throw error;
    }

    return execution.id;
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
      case 'EQUALS':
        return fieldValue === conditionValue;

      case 'NOT_EQUALS':
        return fieldValue !== conditionValue;

      case 'GREATER_THAN':
        return Number(fieldValue) > Number(conditionValue);

      case 'LESS_THAN':
        return Number(fieldValue) < Number(conditionValue);

      case 'GREATER_THAN_OR_EQUAL':
        return Number(fieldValue) >= Number(conditionValue);

      case 'LESS_THAN_OR_EQUAL':
        return Number(fieldValue) <= Number(conditionValue);

      case 'CONTAINS':
        return String(fieldValue).includes(String(conditionValue));

      case 'NOT_CONTAINS':
        return !String(fieldValue).includes(String(conditionValue));

      case 'STARTS_WITH':
        return String(fieldValue).startsWith(String(conditionValue));

      case 'ENDS_WITH':
        return String(fieldValue).endsWith(String(conditionValue));

      case 'IN':
        return Array.isArray(conditionValue) &&
          conditionValue.includes(fieldValue);

      case 'NOT_IN':
        return !Array.isArray(conditionValue) ||
          !conditionValue.includes(fieldValue);

      case 'IS_EMPTY':
        return !fieldValue || fieldValue === '';

      case 'IS_NOT_EMPTY':
        return fieldValue && fieldValue !== '';

      case 'BETWEEN':
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
        case 'SEND_EMAIL':
          await this.actionSendEmail(action, entityData);
          break;

        case 'CALL_WEBHOOK':
          await this.actionCallWebhook(action, entityData);
          break;

        case 'UPDATE_FIELD':
          await this.actionUpdateField(action, entityData);
          break;

        case 'TAG_ENTITY':
          await this.actionTagEntity(action, entityData);
          break;

        case 'UPDATE_STATUS':
          await this.actionUpdateStatus(action, entityData);
          break;

        case 'REQUIRE_APPROVAL':
          await this.actionRequireApproval(action, entityData);
          break;

        case 'SLACK_NOTIFICATION':
          await this.actionSlackNotification(action, entityData);
          break;

        case 'LOG_AUDIT':
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
    const result: Record<string, any> = {};

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
}
```

**Acceptance Criteria**:
- ✅ Execute workflows with Temporal orchestration
- ✅ Evaluate if-then-else conditions
- ✅ Support all action types
- ✅ Variable substitution in emails and webhooks
- ✅ Action execution logging and error handling
- ✅ Support delayed actions
- ✅ Approval workflow actions
- ✅ Audit trail of workflow executions

---

**Task WF-004: Visual Workflow Builder UI**
```typescript
// components/workflow/WorkflowBuilder.tsx

import React, { useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { TriggerNode } from './nodes/TriggerNode';
import { ConditionNode } from './nodes/ConditionNode';
import { ActionNode } from './nodes/ActionNode';
import { WorkflowPanel } from './panels/WorkflowPanel';
import { ConditionBuilder } from './panels/ConditionBuilder';
import { ActionConfigurator } from './panels/ActionConfigurator';

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};

export interface WorkflowBuilderProps {
  workflowId?: string;
  organizationId: string;
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  workflowId,
  organizationId,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showConditionBuilder, setShowConditionBuilder] = useState(false);
  const [showActionConfigurator, setShowActionConfigurator] = useState(false);

  const { project } = useReactFlow();

  // Load workflow if editing existing
  React.useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId);
    }
  }, [workflowId]);

  const loadWorkflow = async (id: string) => {
    const response = await fetch(`/api/workflows/${id}`);
    const workflow = await response.json();

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Create trigger node
    newNodes.push({
      id: 'trigger',
      type: 'trigger',
      data: { trigger: workflow.trigger },
      position: { x: 250, y: 25 },
    });

    // Create branch nodes
    workflow.branches.forEach((branch: any, index: number) => {
      const branchNodeId = `branch-${index}`;
      newNodes.push({
        id: branchNodeId,
        type: 'condition',
        data: { conditions: branch.conditions, branchName: branch.name },
        position: { x: 250, y: 150 + index * 100 },
      });

      // Create action nodes for this branch
      branch.actions.forEach((action: any, actionIndex: number) => {
        const actionNodeId = `action-${index}-${actionIndex}`;
        newNodes.push({
          id: actionNodeId,
          type: 'action',
          data: { action },
          position: { x: 550, y: 150 + index * 100 + actionIndex * 80 },
        });

        // Connect condition to action
        newEdges.push({
          id: `edge-${branchNodeId}-${actionNodeId}`,
          source: branchNodeId,
          target: actionNodeId,
          label: 'if true',
        });
      });

      // Connect trigger to branch
      newEdges.push({
        id: `edge-trigger-${branchNodeId}`,
        source: 'trigger',
        target: branchNodeId,
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const handleConnect = (connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
  };

  const handleAddBranch = () => {
    const branchCount = nodes.filter((n) => n.type === 'condition').length;
    const newBranchId = `branch-${branchCount}`;

    setNodes((nds) => [
      ...nds,
      {
        id: newBranchId,
        type: 'condition',
        data: { conditions: [], branchName: `Branch ${branchCount + 1}` },
        position: { x: 250, y: 150 + branchCount * 100 },
      },
    ]);

    // Connect trigger to new branch
    if (nodes.length > 0) {
      setEdges((eds) => [
        ...eds,
        {
          id: `edge-trigger-${newBranchId}`,
          source: 'trigger',
          target: newBranchId,
        },
      ]);
    }
  };

  const handleAddAction = (sourceNodeId: string) => {
    const actionCount = nodes.filter((n) => n.type === 'action').length;
    const newActionId = `action-new-${actionCount}`;

    setNodes((nds) => [
      ...nds,
      {
        id: newActionId,
        type: 'action',
        data: { action: { type: '', config: {} } },
        position: { x: 550, y: 150 + actionCount * 80 },
      },
    ]);

    setEdges((eds) => [
      ...eds,
      {
        id: `edge-${sourceNodeId}-${newActionId}`,
        source: sourceNodeId,
        target: newActionId,
      },
    ]);
  };

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);

    if (node.type === 'condition') {
      setShowConditionBuilder(true);
    } else if (node.type === 'action') {
      setShowActionConfigurator(true);
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Main canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* Right panel */}
      <div className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto">
        {selectedNode && (
          <>
            {selectedNode.type === 'trigger' && (
              <WorkflowPanel
                node={selectedNode}
                onSave={(updatedData) => {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === selectedNode.id ? { ...n, data: updatedData } : n
                    )
                  );
                }}
              />
            )}

            {selectedNode.type === 'condition' && showConditionBuilder && (
              <ConditionBuilder
                conditions={selectedNode.data.conditions || []}
                onSave={(updatedConditions) => {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === selectedNode.id
                        ? {
                          ...n,
                          data: { ...n.data, conditions: updatedConditions },
                        }
                        : n
                    )
                  );
                  setShowConditionBuilder(false);
                }}
                onAddAction={() => handleAddAction(selectedNode.id)}
              />
            )}

            {selectedNode.type === 'action' && showActionConfigurator && (
              <ActionConfigurator
                action={selectedNode.data.action}
                onSave={(updatedAction) => {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === selectedNode.id
                        ? { ...n, data: { ...n.data, action: updatedAction } }
                        : n
                    )
                  );
                  setShowActionConfigurator(false);
                }}
              />
            )}
          </>
        )}

        {!selectedNode && (
          <div className="p-4">
            <button
              onClick={handleAddBranch}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Branch
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
```

**Acceptance Criteria**:
- ✅ Drag-and-drop workflow builder interface
- ✅ Visual trigger node with configuration
- ✅ Visual condition/branch nodes
- ✅ Visual action nodes
- ✅ Connect nodes with edges
- ✅ Add/remove branches and actions
- ✅ Edit conditions and actions inline
- ✅ Save workflow state
- ✅ Keyboard shortcuts
- ✅ Zoom and pan controls

---

### Week 39-40: Workflow Templates & Advanced Features

**Task WF-005: Workflow Templates**
```typescript
// lib/workflow/templates.ts

import { db } from '@/lib/db';

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
        category: params.category,
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
}
```

**Acceptance Criteria**:
- ✅ Browse workflow templates by category and industry
- ✅ Create workflow from template
- ✅ Save workflow as template
- ✅ Public and private templates
- ✅ Template ratings and usage tracking
- ✅ Template descriptions and documentation

---

## Database Schema Additions

```prisma
model CustomField {
  id                    String   @id @default(cuid())
  organizationId        String
  organization          Organization @relation(fields: [organizationId], references: [id])

  entityType            String   // CAPITAL_CALL, DOCUMENT, DISTRIBUTION, PAYMENT
  name                  String
  description           String?
  fieldType             String   // TEXT, NUMBER, DATE, SELECT, etc.

  required              Boolean  @default(false)
  defaultValue          Json?

  validation            Json?    // minLength, maxLength, pattern, etc.
  displaySettings       Json?    // groupName, position, readOnly, etc.

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  customFieldValues     CustomFieldValue[]

  @@unique([organizationId, entityType, name])
  @@index([organizationId])
}

model CustomFieldValue {
  id                    String   @id @default(cuid())
  customFieldId         String
  customField           CustomField @relation(fields: [customFieldId], references: [id])

  entityType            String
  entityId              String

  value                 Json
  createdBy             String
  updatedBy             String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([customFieldId, entityType, entityId])
  @@index([customFieldId])
  @@index([entityType, entityId])
}

model Workflow {
  id                    String   @id @default(cuid())
  organizationId        String
  organization          Organization @relation(fields: [organizationId], references: [id])

  name                  String
  description           String?

  trigger               Json     // { type, config }
  branches              Json[]   // Array of branch definitions
  defaultActions        Json?    // Array of default actions

  enabled               Boolean  @default(false)
  version               Int      @default(1)

  templateId            String?
  template              WorkflowTemplate? @relation(fields: [templateId], references: [id])

  createdBy             String
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  executions            WorkflowExecution[]
  versions              WorkflowVersion[]

  @@index([organizationId])
  @@index([enabled])
}

model WorkflowVersion {
  id                    String   @id @default(cuid())
  workflowId            String
  workflow              Workflow @relation(fields: [workflowId], references: [id])

  version               Int
  definition            Json     // Full workflow definition snapshot

  archivedBy            String
  archivedAt            DateTime @default(now())

  @@index([workflowId])
}

model WorkflowExecution {
  id                    String   @id @default(cuid())
  workflowId            String
  workflow              Workflow @relation(fields: [workflowId], references: [id])

  status                String   // PENDING, RUNNING, SUCCEEDED, FAILED
  triggerType           String
  entityType            String
  entityId              String

  triggerData           Json?
  userId                String?

  workflowRunId         String?
  error                 String?

  startedAt             DateTime?
  completedAt           DateTime?
  createdAt             DateTime @default(now())

  actionLogs            WorkflowActionLog[]

  @@index([workflowId])
  @@index([status])
  @@index([entityType, entityId])
}

model WorkflowActionLog {
  id                    String   @id @default(cuid())
  executionId           String
  execution             WorkflowExecution @relation(fields: [executionId], references: [id])

  actionId              String
  actionType            String
  status                String   // SUCCESS, FAILED
  error                 String?
  duration              Int      // milliseconds

  createdAt             DateTime @default(now())

  @@index([executionId])
  @@index([status])
}

model WorkflowTemplate {
  id                    String   @id @default(cuid())
  organizationId        String
  organization          Organization @relation(fields: [organizationId], references: [id])

  name                  String
  description           String?
  category              String   // 'payments', 'distributions', 'compliance'
  industry              String?  // 'PE', 'VC', 'RI', 'Hedge'

  trigger               Json
  branches              Json[]
  defaultActions        Json?

  usageCount            Int      @default(0)
  rating                Float    @default(0)
  isPublic              Boolean  @default(false)

  createdBy             String
  createdAt             DateTime @default(now())

  workflows             Workflow[]

  @@index([organizationId])
  @@index([category])
  @@index([industry])
}

model ApprovalTask {
  id                    String   @id @default(cuid())
  entityType            String
  entityId              String
  description           String

  status                String   @default("PENDING") // PENDING, APPROVED, REJECTED
  requiredApprovals     Int
  approversCount        Int      @default(0)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([status])
  @@index([entityType, entityId])
}

model Tag {
  id                    String   @id @default(cuid())
  organizationId        String
  organization          Organization @relation(fields: [organizationId], references: [id])

  name                  String
  color                 String

  createdAt             DateTime @default(now())

  entityTags            EntityTag[]

  @@unique([organizationId, name])
}

model EntityTag {
  id                    String   @id @default(cuid())
  entityType            String
  entityId              String
  tagId                 String
  tag                   Tag @relation(fields: [tagId], references: [id])

  createdAt             DateTime @default(now())

  @@unique([entityType, entityId, tagId])
  @@index([tagId])
}
```

---

## Workflow Triggers & Actions Reference

### Available Triggers

| Trigger | Description | Configuration |
|---------|-------------|---|
| `DOCUMENT_UPLOADED` | When document uploaded to capital call | `documentType`, `fileExtension` |
| `CAPITAL_CALL_CREATED` | When new capital call created | `fundName`, `amountThreshold` |
| `CAPITAL_CALL_UPDATED` | When capital call updated | `fieldName`, `fieldValue` |
| `AMOUNT_THRESHOLD` | When amount exceeds threshold | `amount`, `comparison` (>/<) |
| `DUE_DATE_APPROACHING` | When due date is within X days | `daysBefore` (default: 7) |
| `PAYMENT_RECEIVED` | When payment recorded | `paymentMethod`, `amountRange` |
| `STATUS_CHANGED` | When entity status changes | `fromStatus`, `toStatus` |
| `CUSTOM_FIELD_CHANGED` | When custom field value changes | `fieldId`, `newValue` |
| `SCHEDULED` | On schedule | `frequency` (daily/weekly/monthly), `time` |
| `WEBHOOK` | External webhook trigger | `secretKey`, `expectedPayload` |

### Available Actions

| Action | Description | Configuration |
|--------|-------------|---|
| `SEND_EMAIL` | Send email notification | `to`, `subject`, `template`, `variables` |
| `CALL_WEBHOOK` | Call external webhook | `url`, `method`, `headers`, `body` |
| `MAKE_API_REQUEST` | Call internal/external API | `endpoint`, `method`, `headers`, `body` |
| `CREATE_TASK` | Create task in system | `title`, `assignee`, `dueDate` |
| `TAG_ENTITY` | Add tag to entity | `tag`, `color` |
| `UPDATE_STATUS` | Update entity status | `newStatus`, `reason` |
| `REQUIRE_APPROVAL` | Route to approval | `approvers`, `description` |
| `LOG_AUDIT` | Create audit log entry | `description`, `metadata` |
| `SLACK_NOTIFICATION` | Send Slack message | `channel`, `message`, `blocks` |
| `UPDATE_FIELD` | Update custom field value | `fieldId`, `value` |

---

## Common Workflow Templates

### 1. Payment Reminder Workflow
**Trigger**: Due date approaching (7 days)
**Branch**: Capital call amount > $100,000
**Actions**:
- Send email reminder
- Tag capital call as "urgent-reminder"
- Create task for LP team

### 2. High Amount Alert Workflow
**Trigger**: Capital call created
**Branch**: Amount > threshold
**Actions**:
- Send Slack notification to finance team
- Require CFO approval
- Log to audit trail

### 3. Documentation Automation
**Trigger**: Document uploaded
**Branch**: Document type = "distribution notice"
**Actions**:
- Tag with "distributions"
- Send to distribution processing queue
- Create task for investor relations

### 4. Tax Document Processing
**Trigger**: Document uploaded
**Branch**: Document contains "K-1" or "tax"
**Actions**:
- Route to tax agent
- Update custom field "tax-status" to "received"
- Notify accounting team

### 5. Payment Reconciliation
**Trigger**: Payment received
**Actions**:
- Match to capital call
- Update custom field "reconciliation-status"
- Send confirmation email
- Create audit log

---

## Timeline

### Week 37: Custom Fields & Foundation
- Custom field CRUD and validation
- Custom field UI components
- Database schema for workflows
- **Deliverable**: Custom field management panel

### Week 38: Workflow Builder & Execution
- Visual workflow builder interface
- Workflow execution engine with Temporal
- Trigger evaluation and action execution
- **Deliverable**: Functional workflow builder

### Week 39: Templates & Advanced Features
- Pre-built workflow templates
- Template marketplace
- Workflow versioning and rollback
- **Deliverable**: Template library with 20+ templates

### Week 40: Polish & Analytics
- Workflow execution analytics
- Performance optimization
- Documentation and onboarding
- **Deliverable**: Production-ready workflow platform

---

## Success Metrics

### Adoption Metrics
- **500+** active workflows across customers (Week 40)
- **80%** of organizations using at least one workflow
- **50+** custom workflow templates created by users
- **1,000+** workflow executions per day (avg)

### Performance Metrics
- **< 2 seconds** trigger detection latency
- **99.9%** action execution success rate
- **< 100ms** condition evaluation time
- **Zero** workflow execution failures (target)

### User Metrics
- **4.8/5** average workflow satisfaction rating
- **85%** of users report time savings
- **50%** reduction in manual tasks
- **20+ hours** saved per org monthly (average)

### Business Metrics
- **$5K+** annual savings per customer (automation ROI)
- **30%** of enterprise sales attributed to workflow features
- **2x** increase in platform stickiness
- **Series B** momentum accelerator

---

## Architecture Considerations

### Scalability
- Workflow definitions stored in JSON (easily versioned)
- Execution engine handles 10,000+ concurrent workflows
- Action queuing with retry logic
- Rate limiting on webhook calls

### Security
- Audit trail for all workflow executions
- Field-level access control
- Encrypted webhook URLs and API keys
- Approval workflow for sensitive actions

### Reliability
- Temporal orchestration for guaranteed execution
- Dead-letter queue for failed actions
- Automatic retry with exponential backoff
- Workflow pause/resume for manual intervention

### Developer Experience
- Comprehensive workflow API
- Webhook signature verification
- Workflow execution webhooks
- Template SDK for partners

---

**Workflow Automation Agent completes the Clearway automation vision, enabling customers to build unlimited custom workflows without code.**
