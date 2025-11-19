// Clearway - Custom Field Management System
// Workflow Automation Agent - Task WF-001

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
        validation: params.validation as any,
        displaySettings: params.displaySettings as any,
        required: params.required,
        defaultValue: params.defaultValue as any,
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
        OR: [
          {
            branches: {
              path: '$[*].conditions[*].fieldId',
              equals: fieldId,
            },
          },
        ],
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
    await this.validateFieldValue(field as any, params.value);

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
      include: { customField: true },
    });

    const result: Record<string, any> = {};
    for (const val of values) {
      result[val.customField.name] = val.value;
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

  /**
   * Bulk set custom field values for an entity
   */
  async bulkSetFieldValues(params: {
    entityType: CustomFieldEntityType;
    entityId: string;
    values: Record<string, any>;
    userId: string;
  }): Promise<void> {
    const fields = await db.customField.findMany({
      where: {
        entityType: params.entityType,
      },
    });

    for (const field of fields) {
      const value = params.values[field.name];
      if (value !== undefined) {
        await this.setFieldValue({
          fieldId: field.id,
          entityType: params.entityType,
          entityId: params.entityId,
          value,
          userId: params.userId,
        });
      }
    }
  }
}

// Export singleton instance
export const customFieldManager = new CustomFieldManager();
