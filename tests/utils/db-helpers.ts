/**
 * Database Test Helpers
 *
 * Utilities for database testing and test data creation
 */

import { faker } from '@faker-js/faker';

/**
 * Create test user with default or custom data
 */
export async function createTestUser(overrides?: Partial<any>) {
  return {
    id: faker.string.uuid(),
    clerkId: `user_${faker.string.alphanumeric(24)}`,
    email: faker.internet.email(),
    name: faker.person.fullName(),
    createdAt: new Date(),
    updatedAt: new Date(),
    organizationId: null,
    ...overrides,
  };
}

/**
 * Create test organization
 */
export async function createTestOrganization(overrides?: Partial<any>) {
  const name = overrides?.name || faker.company.name();
  const slug = overrides?.slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return {
    id: faker.string.uuid(),
    name,
    slug,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test document
 */
export async function createTestDocument(overrides?: Partial<any>) {
  return {
    id: faker.string.uuid(),
    fileName: `${faker.system.fileName()}.pdf`,
    fileUrl: faker.internet.url(),
    fileSize: faker.number.int({ min: 10000, max: 10485760 }),
    mimeType: 'application/pdf',
    status: 'PENDING',
    userId: faker.string.uuid(),
    organizationId: null,
    uploadedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test capital call
 */
export async function createTestCapitalCall(overrides?: Partial<any>) {
  const amountDue = faker.number.float({ min: 10000, max: 5000000, precision: 0.01 });

  return {
    id: faker.string.uuid(),
    documentId: faker.string.uuid(),
    userId: faker.string.uuid(),
    organizationId: null,
    fundName: `${faker.company.name()} Fund ${faker.helpers.arrayElement(['XI', 'XII', 'XIII'])}`,
    investorEmail: faker.internet.email(),
    investorAccount: faker.string.alphanumeric(12),
    amountDue,
    currency: 'USD',
    dueDate: faker.date.future(),
    bankName: `${faker.company.name()} Bank`,
    accountNumber: faker.finance.accountNumber(),
    routingNumber: faker.finance.routingNumber(),
    wireReference: faker.string.alphanumeric(16),
    status: 'PENDING_REVIEW',
    confidenceScores: {
      fundName: faker.number.float({ min: 0.85, max: 0.99, precision: 0.01 }),
      amountDue: faker.number.float({ min: 0.85, max: 0.99, precision: 0.01 }),
      dueDate: faker.number.float({ min: 0.85, max: 0.99, precision: 0.01 }),
    },
    rawExtraction: {},
    extractedAt: new Date(),
    reviewedAt: null,
    approvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test audit log
 */
export async function createTestAuditLog(overrides?: Partial<any>) {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    action: faker.helpers.arrayElement([
      'DOCUMENT_UPLOADED',
      'CAPITAL_CALL_APPROVED',
      'CAPITAL_CALL_REJECTED',
      'DATA_EXPORTED',
    ]),
    resourceType: faker.helpers.arrayElement(['DOCUMENT', 'CAPITAL_CALL', 'USER', 'ORGANIZATION']),
    resourceId: faker.string.uuid(),
    metadata: {},
    ipAddress: faker.internet.ip(),
    userAgent: faker.internet.userAgent(),
    timestamp: new Date(),
    ...overrides,
  };
}

/**
 * Batch create test users
 */
export async function createTestUsers(count: number, overrides?: Partial<any>) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push(await createTestUser(overrides));
  }
  return users;
}

/**
 * Batch create test documents
 */
export async function createTestDocuments(count: number, overrides?: Partial<any>) {
  const documents = [];
  for (let i = 0; i < count; i++) {
    documents.push(await createTestDocument(overrides));
  }
  return documents;
}

/**
 * Batch create test capital calls
 */
export async function createTestCapitalCalls(count: number, overrides?: Partial<any>) {
  const capitalCalls = [];
  for (let i = 0; i < count; i++) {
    capitalCalls.push(await createTestCapitalCall(overrides));
  }
  return capitalCalls;
}

/**
 * Clean up test data (mock implementation)
 */
export async function cleanupTestData() {
  // In a real implementation, this would delete test data from database
  return { success: true };
}

/**
 * Reset test database to clean state
 */
export async function resetTestDatabase() {
  // In a real implementation, this would truncate all tables or reset sequences
  return { success: true };
}
