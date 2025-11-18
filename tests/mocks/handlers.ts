import { http, HttpResponse } from 'msw';
import { generateMockDocument, generateMockCapitalCall, generateMockUser } from '../utils/test-helpers';

/**
 * MSW (Mock Service Worker) handlers for API mocking in tests
 *
 * These handlers intercept API requests during testing and return
 * mock responses, allowing us to test components without real API calls.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const handlers = [
  // Upload API
  http.post(`${BASE_URL}/api/upload`, async () => {
    const document = generateMockDocument();
    return HttpResponse.json({
      uploadUrl: 'https://test.r2.cloudflarestorage.com/test-upload-url',
      documentId: document.id,
    });
  }),

  // Get documents
  http.get(`${BASE_URL}/api/documents`, () => {
    const documents = Array.from({ length: 5 }, () => generateMockDocument());
    return HttpResponse.json({ documents });
  }),

  // Get single document
  http.get(`${BASE_URL}/api/documents/:id`, ({ params }) => {
    const document = generateMockDocument({ id: params.id as string });
    const capitalCall = generateMockCapitalCall({ documentId: params.id as string });
    return HttpResponse.json({
      document,
      capitalCall,
    });
  }),

  // Process document
  http.post(`${BASE_URL}/api/process`, async () => {
    return HttpResponse.json({ success: true });
  }),

  // Get capital calls
  http.get(`${BASE_URL}/api/capital-calls`, () => {
    const capitalCalls = Array.from({ length: 10 }, () => generateMockCapitalCall());
    return HttpResponse.json({ capitalCalls });
  }),

  // Get calendar data
  http.get(`${BASE_URL}/api/capital-calls/calendar`, () => {
    const capitalCalls = Array.from({ length: 15 }, () =>
      generateMockCapitalCall({ status: 'APPROVED' })
    );
    return HttpResponse.json({ capitalCalls });
  }),

  // Approve capital call
  http.post(`${BASE_URL}/api/capital-calls/:id/approve`, ({ params }) => {
    const capitalCall = generateMockCapitalCall({
      id: params.id as string,
      status: 'APPROVED',
      approvedAt: new Date(),
    });
    return HttpResponse.json({ capitalCall });
  }),

  // Reject capital call
  http.post(`${BASE_URL}/api/capital-calls/:id/reject`, ({ params }) => {
    const capitalCall = generateMockCapitalCall({
      id: params.id as string,
      status: 'REJECTED',
    });
    return HttpResponse.json({ capitalCall });
  }),

  // Export CSV
  http.get(`${BASE_URL}/api/export`, () => {
    const csvContent = 'Fund Name,Amount Due,Due Date,Status\nTest Fund,100000,2025-12-31,APPROVED';
    return HttpResponse.text(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="capital-calls.csv"',
      },
    });
  }),

  // User profile
  http.get(`${BASE_URL}/api/user/profile`, () => {
    const user = generateMockUser();
    return HttpResponse.json({ user });
  }),

  // Error scenarios for testing
  http.post(`${BASE_URL}/api/upload/error`, () => {
    return HttpResponse.json(
      { error: 'File too large' },
      { status: 400 }
    );
  }),

  http.get(`${BASE_URL}/api/documents/not-found`, () => {
    return HttpResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  }),

  http.post(`${BASE_URL}/api/process/error`, () => {
    return HttpResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }),
];

/**
 * Handlers for specific test scenarios
 */
export const errorHandlers = {
  // Upload error - file too large
  uploadTooLarge: http.post(`${BASE_URL}/api/upload`, () => {
    return HttpResponse.json(
      { error: 'File must be under 10MB' },
      { status: 400 }
    );
  }),

  // Upload error - wrong file type
  uploadWrongType: http.post(`${BASE_URL}/api/upload`, () => {
    return HttpResponse.json(
      { error: 'Only PDF files are supported' },
      { status: 400 }
    );
  }),

  // Unauthorized
  unauthorized: http.get(`${BASE_URL}/api/*`, () => {
    return HttpResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }),

  // Network error
  networkError: http.get(`${BASE_URL}/api/*`, () => {
    return HttpResponse.error();
  }),
};
