import { faker } from '@faker-js/faker';

/**
 * Test data generators using faker
 */

export function generateMockUser(overrides?: Partial<any>) {
  return {
    id: faker.string.uuid(),
    clerkId: `user_${faker.string.alphanumeric(24)}`,
    email: faker.internet.email(),
    name: faker.person.fullName(),
    createdAt: faker.date.past(),
    organizationId: null,
    ...overrides,
  };
}

export function generateMockDocument(overrides?: Partial<any>) {
  return {
    id: faker.string.uuid(),
    fileName: `${faker.system.fileName()}.pdf`,
    fileUrl: faker.internet.url(),
    fileSize: faker.number.int({ min: 1024, max: 10485760 }), // 1KB to 10MB
    mimeType: 'application/pdf',
    uploadedAt: faker.date.recent(),
    userId: faker.string.uuid(),
    organizationId: null,
    status: 'PENDING',
    ...overrides,
  };
}

export function generateMockCapitalCall(overrides?: Partial<any>) {
  const amountDue = faker.number.float({ min: 10000, max: 5000000, precision: 0.01 });

  return {
    id: faker.string.uuid(),
    fundName: `${faker.company.name()} Fund ${faker.helpers.arrayElement(['XI', 'XII', 'XIII', 'XIV', 'XV'])}`,
    investorEmail: faker.internet.email(),
    investorAccount: faker.string.alphanumeric(12),
    amountDue,
    currency: 'USD',
    dueDate: faker.date.future(),
    bankName: faker.company.name() + ' Bank',
    accountNumber: faker.finance.accountNumber(),
    routingNumber: faker.finance.routingNumber(),
    wireReference: faker.string.alphanumeric(16),
    extractedAt: faker.date.recent(),
    reviewedAt: null,
    approvedAt: null,
    confidenceScores: {
      fundName: faker.number.float({ min: 0.85, max: 0.99, precision: 0.01 }),
      amountDue: faker.number.float({ min: 0.85, max: 0.99, precision: 0.01 }),
      dueDate: faker.number.float({ min: 0.85, max: 0.99, precision: 0.01 }),
    },
    rawExtraction: {},
    documentId: faker.string.uuid(),
    userId: faker.string.uuid(),
    status: 'PENDING_REVIEW',
    ...overrides,
  };
}

export function generateMockOrganization(overrides?: Partial<any>) {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    createdAt: faker.date.past(),
    ...overrides,
  };
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Create a mock file for testing file uploads
 */
export function createMockFile(
  name: string = 'test.pdf',
  size: number = 1024,
  type: string = 'application/pdf'
): File {
  const content = 'a'.repeat(size);
  return new File([content], name, { type });
}

/**
 * Create a mock PDF file with specific content
 */
export function createMockPDF(sizeInKB: number = 100): File {
  const sizeInBytes = sizeInKB * 1024;
  const content = 'a'.repeat(sizeInBytes);
  return new File([content], `test-${Date.now()}.pdf`, { type: 'application/pdf' });
}

/**
 * Mock fetch response helper
 */
export function createMockResponse(data: any, status: number = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    blob: async () => new Blob([JSON.stringify(data)]),
  } as Response;
}

/**
 * Delay helper for testing async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock successful API response
 */
export function mockApiSuccess(data: any) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => data,
  } as Response);
}

/**
 * Mock failed API response
 */
export function mockApiError(message: string, status: number = 400) {
  return Promise.resolve({
    ok: false,
    status,
    json: async () => ({ error: message }),
  } as Response);
}
