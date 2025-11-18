// Clearway Validation Schemas
// Database Agent - Task DB-004

import { z } from 'zod';

// ============================================
// CAPITAL CALL VALIDATION
// ============================================

export const CapitalCallSchema = z.object({
  fundName: z.string().min(1, 'Fund name is required').max(255),
  investorEmail: z.string().email().optional().or(z.literal('')),
  investorAccount: z.string().optional(),
  amountDue: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 letters').default('USD'),
  dueDate: z.coerce.date(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  routingNumber: z.string().optional(),
  wireReference: z.string().optional(),
});

// ============================================
// DOCUMENT VALIDATION
// ============================================

export const DocumentUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().max(10 * 1024 * 1024, 'File must be under 10MB'),
  mimeType: z.literal('application/pdf'),
});

// ============================================
// USER VALIDATION
// ============================================

export const UserProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email(),
});

export const UserCreateSchema = z.object({
  clerkId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).max(255).optional(),
  organizationId: z.string().optional(),
});

// ============================================
// ORGANIZATION VALIDATION
// ============================================

export const OrganizationCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
});

export const OrganizationUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

// ============================================
// QUERY VALIDATION
// ============================================

export const CalendarQuerySchema = z.object({
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2020).max(2030).optional(),
});

export const DocumentQuerySchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'REVIEW', 'APPROVED', 'REJECTED', 'FAILED']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const CapitalCallQuerySchema = z.object({
  status: z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PAID']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['dueDate', 'amountDue', 'fundName']).default('dueDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// ============================================
// UPDATE SCHEMAS
// ============================================

export const CapitalCallUpdateSchema = z.object({
  fundName: z.string().min(1).max(255).optional(),
  investorEmail: z.string().email().optional().or(z.literal('')),
  investorAccount: z.string().optional(),
  amountDue: z.number().positive('Amount must be positive').optional(),
  currency: z.string().length(3).optional(),
  dueDate: z.coerce.date().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  routingNumber: z.string().optional(),
  wireReference: z.string().optional(),
  status: z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PAID']).optional(),
});

export const DocumentUpdateSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'REVIEW', 'APPROVED', 'REJECTED', 'FAILED']).optional(),
});

// ============================================
// FUND ADMINISTRATOR VALIDATION
// ============================================

export const FundAdministratorCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  contactEmail: z.string().email().optional(),
  website: z.string().url().optional(),
});

export const FundAdministratorUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  contactEmail: z.string().email().optional(),
  website: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type CapitalCallInput = z.infer<typeof CapitalCallSchema>;
export type CapitalCallUpdateInput = z.infer<typeof CapitalCallUpdateSchema>;
export type DocumentUploadInput = z.infer<typeof DocumentUploadSchema>;
export type DocumentUpdateInput = z.infer<typeof DocumentUpdateSchema>;
export type UserProfileInput = z.infer<typeof UserProfileSchema>;
export type UserCreateInput = z.infer<typeof UserCreateSchema>;
export type OrganizationCreateInput = z.infer<typeof OrganizationCreateSchema>;
export type OrganizationUpdateInput = z.infer<typeof OrganizationUpdateSchema>;
export type CalendarQueryInput = z.infer<typeof CalendarQuerySchema>;
export type DocumentQueryInput = z.infer<typeof DocumentQuerySchema>;
export type CapitalCallQueryInput = z.infer<typeof CapitalCallQuerySchema>;
export type FundAdministratorCreateInput = z.infer<typeof FundAdministratorCreateSchema>;
export type FundAdministratorUpdateInput = z.infer<typeof FundAdministratorUpdateSchema>;
