/**
 * Test Fixtures Export
 *
 * Central export for all test fixtures
 */

export * from './capital-calls';
export * from './documents';
export * from './swift-messages';

// API response fixtures
export const apiResponseFixtures = {
  success: {
    ok: true,
    status: 200,
    statusText: 'OK',
  },

  badRequest: {
    ok: false,
    status: 400,
    statusText: 'Bad Request',
  },

  unauthorized: {
    ok: false,
    status: 401,
    statusText: 'Unauthorized',
  },

  forbidden: {
    ok: false,
    status: 403,
    statusText: 'Forbidden',
  },

  notFound: {
    ok: false,
    status: 404,
    statusText: 'Not Found',
  },

  serverError: {
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
  },
};

// Mock user fixtures
export const userFixtures = {
  admin: {
    id: 'user-admin-123',
    clerkId: 'clerk_admin_123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN',
  },

  member: {
    id: 'user-member-456',
    clerkId: 'clerk_member_456',
    email: 'member@example.com',
    name: 'Member User',
    role: 'MEMBER',
  },

  viewer: {
    id: 'user-viewer-789',
    clerkId: 'clerk_viewer_789',
    email: 'viewer@example.com',
    name: 'Viewer User',
    role: 'VIEWER',
  },
};

// Mock organization fixtures
export const organizationFixtures = {
  primary: {
    id: 'org-primary-123',
    name: 'Primary Organization',
    slug: 'primary-org',
    createdAt: new Date('2025-01-01'),
  },

  secondary: {
    id: 'org-secondary-456',
    name: 'Secondary Organization',
    slug: 'secondary-org',
    createdAt: new Date('2025-02-01'),
  },
};
