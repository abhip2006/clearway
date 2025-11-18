/**
 * Unit Tests: Validation Schemas
 *
 * Tests Zod validation schemas for data integrity
 */

import { describe, it, expect } from 'vitest';
import {
  CapitalCallSchema,
  DocumentUploadSchema,
  OrganizationCreateSchema,
  CalendarQuerySchema,
  CapitalCallQuerySchema,
} from '@/lib/schemas';

describe('Validation Schemas', () => {
  describe('CapitalCallSchema', () => {
    it('should validate valid capital call data', () => {
      const validData = {
        fundName: 'Apollo Fund XI',
        amountDue: 250000,
        currency: 'USD',
        dueDate: new Date('2025-12-15'),
      };

      const result = CapitalCallSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fundName).toBe('Apollo Fund XI');
        expect(result.data.amountDue).toBe(250000);
      }
    });

    it('should reject empty fund name', () => {
      const invalidData = {
        fundName: '',
        amountDue: 250000,
        dueDate: new Date('2025-12-15'),
      };

      const result = CapitalCallSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject negative amount', () => {
      const invalidData = {
        fundName: 'Test Fund',
        amountDue: -100,
        dueDate: new Date('2025-12-15'),
      };

      const result = CapitalCallSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject zero amount', () => {
      const invalidData = {
        fundName: 'Test Fund',
        amountDue: 0,
        dueDate: new Date('2025-12-15'),
      };

      const result = CapitalCallSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should validate optional email', () => {
      const dataWithEmail = {
        fundName: 'Test Fund',
        amountDue: 100000,
        dueDate: new Date('2025-12-15'),
        investorEmail: 'investor@example.com',
      };

      const result = CapitalCallSchema.safeParse(dataWithEmail);

      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const dataWithInvalidEmail = {
        fundName: 'Test Fund',
        amountDue: 100000,
        dueDate: new Date('2025-12-15'),
        investorEmail: 'invalid-email',
      };

      const result = CapitalCallSchema.safeParse(dataWithInvalidEmail);

      expect(result.success).toBe(false);
    });

    it('should accept empty string for email', () => {
      const dataWithEmptyEmail = {
        fundName: 'Test Fund',
        amountDue: 100000,
        dueDate: new Date('2025-12-15'),
        investorEmail: '',
      };

      const result = CapitalCallSchema.safeParse(dataWithEmptyEmail);

      expect(result.success).toBe(true);
    });

    it('should validate 3-letter currency code', () => {
      const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY'];

      validCurrencies.forEach((currency) => {
        const data = {
          fundName: 'Test Fund',
          amountDue: 100000,
          currency,
          dueDate: new Date('2025-12-15'),
        };

        const result = CapitalCallSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid currency code', () => {
      const invalidData = {
        fundName: 'Test Fund',
        amountDue: 100000,
        currency: 'US', // Only 2 letters
        dueDate: new Date('2025-12-15'),
      };

      const result = CapitalCallSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should default currency to USD', () => {
      const data = {
        fundName: 'Test Fund',
        amountDue: 100000,
        dueDate: new Date('2025-12-15'),
      };

      const result = CapitalCallSchema.safeParse(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('USD');
      }
    });
  });

  describe('DocumentUploadSchema', () => {
    it('should validate valid document upload', () => {
      const validData = {
        fileName: 'capital-call.pdf',
        fileSize: 1024000, // 1MB
        mimeType: 'application/pdf',
      };

      const result = DocumentUploadSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject empty file name', () => {
      const invalidData = {
        fileName: '',
        fileSize: 1024,
        mimeType: 'application/pdf',
      };

      const result = DocumentUploadSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject file name over 255 characters', () => {
      const invalidData = {
        fileName: 'a'.repeat(256) + '.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      };

      const result = DocumentUploadSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject file size over 10MB', () => {
      const invalidData = {
        fileName: 'large-file.pdf',
        fileSize: 11 * 1024 * 1024, // 11MB
        mimeType: 'application/pdf',
      };

      const result = DocumentUploadSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should only accept PDF mime type', () => {
      const nonPdfData = {
        fileName: 'document.docx',
        fileSize: 1024,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };

      const result = DocumentUploadSchema.safeParse(nonPdfData);

      expect(result.success).toBe(false);
    });

    it('should accept files up to exactly 10MB', () => {
      const validData = {
        fileName: 'max-size.pdf',
        fileSize: 10 * 1024 * 1024, // Exactly 10MB
        mimeType: 'application/pdf',
      };

      const result = DocumentUploadSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });
  });

  describe('OrganizationCreateSchema', () => {
    it('should validate valid organization data', () => {
      const validData = {
        name: 'Acme Corp',
        slug: 'acme-corp',
      };

      const result = OrganizationCreateSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        slug: 'test',
      };

      const result = OrganizationCreateSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject invalid slug format', () => {
      const invalidData = {
        name: 'Test Org',
        slug: 'Test Org', // Spaces not allowed
      };

      const result = OrganizationCreateSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should accept lowercase, numbers, and hyphens in slug', () => {
      const validSlugs = ['test-org', 'org-123', 'my-org-2025'];

      validSlugs.forEach((slug) => {
        const data = {
          name: 'Test Organization',
          slug,
        };

        const result = OrganizationCreateSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject uppercase in slug', () => {
      const invalidData = {
        name: 'Test Org',
        slug: 'Test-Org',
      };

      const result = OrganizationCreateSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject special characters in slug', () => {
      const invalidData = {
        name: 'Test Org',
        slug: 'test_org!',
      };

      const result = OrganizationCreateSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('CalendarQuerySchema', () => {
    it('should validate valid month and year', () => {
      const validData = {
        month: 12,
        year: 2025,
      };

      const result = CalendarQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject month below 1', () => {
      const invalidData = {
        month: 0,
        year: 2025,
      };

      const result = CalendarQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject month above 12', () => {
      const invalidData = {
        month: 13,
        year: 2025,
      };

      const result = CalendarQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject year below 2020', () => {
      const invalidData = {
        month: 6,
        year: 2019,
      };

      const result = CalendarQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject year above 2030', () => {
      const invalidData = {
        month: 6,
        year: 2031,
      };

      const result = CalendarQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should make month and year optional', () => {
      const emptyData = {};

      const result = CalendarQuerySchema.safeParse(emptyData);

      expect(result.success).toBe(true);
    });
  });

  describe('CapitalCallQuerySchema', () => {
    it('should validate with all parameters', () => {
      const validData = {
        status: 'APPROVED',
        limit: 50,
        offset: 10,
        sortBy: 'amountDue',
        sortOrder: 'desc',
      };

      const result = CapitalCallQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(result.data.offset).toBe(10);
      }
    });

    it('should apply default values', () => {
      const minimalData = {};

      const result = CapitalCallQuerySchema.safeParse(minimalData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
        expect(result.data.sortBy).toBe('dueDate');
        expect(result.data.sortOrder).toBe('asc');
      }
    });

    it('should validate status enum', () => {
      const validStatuses = ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PAID'];

      validStatuses.forEach((status) => {
        const data = { status };
        const result = CapitalCallQuerySchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      const invalidData = {
        status: 'INVALID_STATUS',
      };

      const result = CapitalCallQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should enforce limit maximum', () => {
      const invalidData = {
        limit: 150, // Max is 100
      };

      const result = CapitalCallQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should enforce limit minimum', () => {
      const invalidData = {
        limit: 0,
      };

      const result = CapitalCallQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should allow negative offset', () => {
      const dataWithNegativeOffset = {
        offset: -1,
      };

      const result = CapitalCallQuerySchema.safeParse(dataWithNegativeOffset);

      expect(result.success).toBe(false);
    });

    it('should validate sortBy enum', () => {
      const validSortFields = ['dueDate', 'amountDue', 'fundName'];

      validSortFields.forEach((sortBy) => {
        const data = { sortBy };
        const result = CapitalCallQuerySchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should validate sortOrder enum', () => {
      const validSortOrders = ['asc', 'desc'];

      validSortOrders.forEach((sortOrder) => {
        const data = { sortOrder };
        const result = CapitalCallQuerySchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Type Coercion', () => {
    it('should coerce string numbers to numbers', () => {
      const data = {
        fundName: 'Test Fund',
        amountDue: '250000', // String instead of number
        dueDate: '2025-12-15',
      };

      const result = CapitalCallSchema.safeParse(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.amountDue).toBe('number');
        expect(result.data.amountDue).toBe(250000);
      }
    });

    it('should coerce string dates to Date objects', () => {
      const data = {
        fundName: 'Test Fund',
        amountDue: 250000,
        dueDate: '2025-12-15',
      };

      const result = CapitalCallSchema.safeParse(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dueDate).toBeInstanceOf(Date);
      }
    });
  });
});
