/**
 * Test Fixtures: Documents
 *
 * Predefined test data for document testing
 */

export const documentFixtures = {
  // Standard pending document
  pending: {
    id: 'doc-pending-123',
    fileName: 'capital-call-pending.pdf',
    fileUrl: 'https://storage.example.com/user-123/capital-call-pending.pdf',
    fileSize: 204800, // 200KB
    mimeType: 'application/pdf',
    userId: 'user-123',
    organizationId: null,
    status: 'PENDING',
    uploadedAt: new Date('2025-11-01'),
  },

  // Processing document
  processing: {
    id: 'doc-processing-456',
    fileName: 'capital-call-processing.pdf',
    fileUrl: 'https://storage.example.com/user-123/capital-call-processing.pdf',
    fileSize: 512000, // 500KB
    mimeType: 'application/pdf',
    userId: 'user-123',
    organizationId: null,
    status: 'PROCESSING',
    uploadedAt: new Date('2025-11-02'),
  },

  // Document ready for review
  review: {
    id: 'doc-review-789',
    fileName: 'capital-call-review.pdf',
    fileUrl: 'https://storage.example.com/user-123/capital-call-review.pdf',
    fileSize: 307200, // 300KB
    mimeType: 'application/pdf',
    userId: 'user-123',
    organizationId: null,
    status: 'REVIEW',
    uploadedAt: new Date('2025-11-03'),
  },

  // Approved document
  approved: {
    id: 'doc-approved-101',
    fileName: 'capital-call-approved.pdf',
    fileUrl: 'https://storage.example.com/user-123/capital-call-approved.pdf',
    fileSize: 409600, // 400KB
    mimeType: 'application/pdf',
    userId: 'user-123',
    organizationId: null,
    status: 'APPROVED',
    uploadedAt: new Date('2025-11-04'),
  },

  // Rejected document
  rejected: {
    id: 'doc-rejected-102',
    fileName: 'capital-call-rejected.pdf',
    fileUrl: 'https://storage.example.com/user-123/capital-call-rejected.pdf',
    fileSize: 256000, // 250KB
    mimeType: 'application/pdf',
    userId: 'user-123',
    organizationId: null,
    status: 'REJECTED',
    uploadedAt: new Date('2025-11-05'),
  },

  // Failed document
  failed: {
    id: 'doc-failed-103',
    fileName: 'capital-call-failed.pdf',
    fileUrl: 'https://storage.example.com/user-123/capital-call-failed.pdf',
    fileSize: 102400, // 100KB
    mimeType: 'application/pdf',
    userId: 'user-123',
    organizationId: null,
    status: 'FAILED',
    uploadedAt: new Date('2025-11-06'),
  },

  // Large document
  large: {
    id: 'doc-large-104',
    fileName: 'large-capital-call.pdf',
    fileUrl: 'https://storage.example.com/user-123/large-capital-call.pdf',
    fileSize: 9437184, // ~9MB (under 10MB limit)
    mimeType: 'application/pdf',
    userId: 'user-123',
    organizationId: null,
    status: 'PENDING',
    uploadedAt: new Date('2025-11-07'),
  },

  // Organization document
  organization: {
    id: 'doc-org-105',
    fileName: 'org-capital-call.pdf',
    fileUrl: 'https://storage.example.com/org-456/org-capital-call.pdf',
    fileSize: 358400, // 350KB
    mimeType: 'application/pdf',
    userId: 'user-123',
    organizationId: 'org-456',
    status: 'APPROVED',
    uploadedAt: new Date('2025-11-08'),
  },

  // Array of documents for list testing
  list: [
    {
      id: 'doc-1',
      fileName: 'document-1.pdf',
      status: 'PENDING',
      uploadedAt: new Date('2025-11-01'),
    },
    {
      id: 'doc-2',
      fileName: 'document-2.pdf',
      status: 'PROCESSING',
      uploadedAt: new Date('2025-11-02'),
    },
    {
      id: 'doc-3',
      fileName: 'document-3.pdf',
      status: 'APPROVED',
      uploadedAt: new Date('2025-11-03'),
    },
  ],
};

export type DocumentFixture = typeof documentFixtures.pending;
