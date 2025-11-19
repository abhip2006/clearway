# Workflow Automation System - Developer Guide

## Quick Start

### 1. Custom Fields

```typescript
import { customFieldManager, CustomFieldType, CustomFieldEntityType } from '@/lib/workflow/custom-fields';

// Create a custom field
const field = await customFieldManager.createField(organizationId, {
  entityType: CustomFieldEntityType.CAPITAL_CALL,
  name: 'Risk Level',
  fieldType: CustomFieldType.SELECT,
  validation: {
    allowedValues: ['Low', 'Medium', 'High'],
  },
});

// Set field value
await customFieldManager.setFieldValue({
  fieldId: field.id,
  entityType: CustomFieldEntityType.CAPITAL_CALL,
  entityId: capitalCallId,
  value: 'High',
  userId: userId,
});

// Get all field values for entity
const values = await customFieldManager.getEntityCustomFields(
  CustomFieldEntityType.CAPITAL_CALL,
  capitalCallId
);
```

### 2. Workflow Builder

```typescript
import { workflowBuilder, TriggerType, ActionType, ConditionOperator } from '@/lib/workflow/workflow-builder';

// Create workflow
const workflow = await workflowBuilder.createWorkflow(organizationId, {
  name: 'Payment Reminder',
  trigger: {
    id: 'trigger-1',
    type: TriggerType.DUE_DATE_APPROACHING,
    config: { daysBefore: 7 },
  },
  userId,
});

// Add branch with conditions
await workflowBuilder.addBranch(workflow.id, {
  name: 'High Priority',
  conditions: [
    {
      id: crypto.randomUUID(),
      fieldId: 'amountDue',
      fieldName: 'amountDue',
      operator: ConditionOperator.GREATER_THAN,
      value: 100000,
      combineWith: 'AND',
    },
  ],
  actions: [
    {
      id: crypto.randomUUID(),
      type: ActionType.SEND_EMAIL,
      config: {
        to: '{investorEmail}',
        subject: 'Urgent: Payment Due in 7 Days',
        template: 'Amount due: ${amountDue}',
      },
    },
  ],
});

// Publish workflow
await workflowBuilder.publishWorkflow(workflow.id, userId);
```

### 3. Workflow Execution

```typescript
import { workflowExecutionEngine } from '@/lib/workflow/execution-engine';

// Execute workflow
const executionId = await workflowExecutionEngine.executeWorkflow({
  workflowId: workflow.id,
  triggerType: TriggerType.CAPITAL_CALL_CREATED,
  entityType: 'CAPITAL_CALL',
  entityId: capitalCallId,
  triggerData: { /* additional data */ },
  userId,
});

// Get execution status
const execution = await workflowExecutionEngine.getExecution(executionId);

// Get execution history for entity
const history = await workflowExecutionEngine.getExecutionHistory(
  'CAPITAL_CALL',
  capitalCallId
);
```

### 4. Workflow Templates

```typescript
import { workflowTemplateManager } from '@/lib/workflow/templates';

// Get all templates
const templates = await workflowTemplateManager.getTemplates({
  category: 'payments',
  industry: 'PE',
});

// Create workflow from template
const workflow = await workflowTemplateManager.createFromTemplate(
  templateId,
  organizationId,
  { name: 'My Workflow', userId }
);

// Save workflow as template
const template = await workflowTemplateManager.saveAsTemplate(
  workflowId,
  {
    name: 'My Template',
    category: 'payments',
    isPublic: false,
  }
);
```

## API Endpoints

### Workflows

```bash
# List workflows
GET /api/workflows?organizationId=xxx&enabled=true

# Create workflow
POST /api/workflows
{
  "organizationId": "xxx",
  "name": "My Workflow",
  "trigger": { "type": "CAPITAL_CALL_CREATED" }
}

# Get workflow
GET /api/workflows/[id]

# Update workflow
PUT /api/workflows/[id]
{
  "branches": [...]
}

# Delete workflow
DELETE /api/workflows/[id]

# Publish workflow
POST /api/workflows/[id]/publish

# Execute workflow
POST /api/workflows/[id]/execute
{
  "entityType": "CAPITAL_CALL",
  "entityId": "xxx",
  "triggerData": {}
}
```

### Custom Fields

```bash
# List custom fields
GET /api/custom-fields?organizationId=xxx&entityType=CAPITAL_CALL

# Create custom field
POST /api/custom-fields
{
  "organizationId": "xxx",
  "entityType": "CAPITAL_CALL",
  "name": "Priority",
  "fieldType": "SELECT",
  "validation": {
    "allowedValues": ["Low", "High"]
  }
}
```

### Workflow Templates

```bash
# List templates
GET /api/workflow-templates?category=payments

# Create template from workflow
POST /api/workflow-templates
{
  "workflowId": "xxx",
  "name": "My Template",
  "category": "payments"
}

# Use template
POST /api/workflow-templates/[id]/use
{
  "organizationId": "xxx",
  "name": "My Workflow"
}
```

## Field Types

```typescript
enum CustomFieldType {
  TEXT = 'TEXT',           // Short text
  NUMBER = 'NUMBER',       // Numeric value
  DATE = 'DATE',          // Date picker
  SELECT = 'SELECT',       // Single select dropdown
  MULTI_SELECT = 'MULTI_SELECT', // Multi-select dropdown
  CHECKBOX = 'CHECKBOX',   // Boolean checkbox
  CURRENCY = 'CURRENCY',   // Currency value
  EMAIL = 'EMAIL',        // Email address
  URL = 'URL',           // URL field
  TEXTAREA = 'TEXTAREA',  // Long text
}
```

## Trigger Types

```typescript
enum TriggerType {
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
```

## Action Types

```typescript
enum ActionType {
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
```

## Condition Operators

```typescript
enum ConditionOperator {
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
```

## Variable Substitution

Use `{fieldName}` in email templates and messages:

```typescript
{
  to: '{investorEmail}',
  subject: 'Capital Call for {fundName}',
  template: `
    <h2>Payment Due</h2>
    <p>Amount: ${amountDue}</p>
    <p>Due Date: {dueDate}</p>
  `
}
```

Available variables depend on entity type:
- Capital Call: `fundName`, `amountDue`, `dueDate`, `investorEmail`, `status`
- Document: `fileName`, `fileSize`, `mimeType`, `status`
- Payment: `amount`, `currency`, `paymentMethod`, `status`
- Plus all custom field values

## Best Practices

1. **Always validate workflows before publishing**
   ```typescript
   const validation = await workflowBuilder.validateWorkflow(workflowId);
   if (!validation.valid) {
     console.error(validation.errors);
   }
   ```

2. **Use templates for common patterns**
   - Browse existing templates before creating new workflows
   - Save reusable workflows as templates

3. **Test workflows with sample data**
   - Use the execute endpoint with test entities
   - Check execution history for errors

4. **Monitor execution performance**
   - Check WorkflowActionLog for slow actions
   - Review failed executions regularly

5. **Use meaningful names**
   - Name workflows clearly: "Payment Reminder - 7 Days"
   - Name branches descriptively: "High Priority (>$100k)"

## Troubleshooting

### Workflow not executing
- Check if workflow is enabled
- Verify trigger type matches event
- Review condition logic

### Action failing
- Check WorkflowActionLog for error details
- Verify action configuration
- Test webhook URLs manually

### Variables not substituting
- Ensure field names match entity data
- Check for typos in variable names
- Use correct syntax: `{fieldName}`

## Support

For issues or questions:
- Review execution logs in WorkflowActionLog
- Check audit trail for workflow changes
- Contact the Workflow Automation Agent team
