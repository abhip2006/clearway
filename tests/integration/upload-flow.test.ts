/**
 * Integration Tests: Upload Flow
 *
 * Tests the complete document upload flow:
 * 1. Generate presigned URL
 * 2. Upload file to R2/S3
 * 3. Trigger processing
 * 4. Verify document created in database
 * 5. Check Inngest job triggered
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as UploadPOST } from '@/app/api/upload/route';
import { POST as ProcessPOST } from '@/app/api/process/route';
import { db } from '@/lib/db';
import { inngest } from '@/lib/inngest';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock dependencies
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: 'test-user-id' })),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(() => Promise.resolve('https://mock-presigned-url.com/upload')),
}));

vi.mock('@/lib/db', () => ({
  db: {
    document: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/inngest', () => ({
  inngest: {
    send: vi.fn(() => Promise.resolve({ ids: ['mock-job-id'] })),
  },
}));

describe('Upload Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Step 1: Generate Presigned URL', () => {
    it('should generate presigned URL and create document record', async () => {
      const mockDocument = {
        id: 'doc-123',
        fileName: 'test-capital-call.pdf',
        fileSize: 102400,
        mimeType: 'application/pdf',
        fileUrl: 'https://r2.example.com/test-user-id/123-test-capital-call.pdf',
        userId: 'test-user-id',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.document.create as any).mockResolvedValue(mockDocument);

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'test-capital-call.pdf',
          fileSize: 102400,
          mimeType: 'application/pdf',
        }),
      });

      const response = await UploadPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.uploadUrl).toBe('https://mock-presigned-url.com/upload');
      expect(data.documentId).toBe('doc-123');
      expect(db.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fileName: 'test-capital-call.pdf',
          fileSize: 102400,
          mimeType: 'application/pdf',
          userId: 'test-user-id',
          status: 'PENDING',
        }),
      });
    });

    it('should reject unauthorized requests', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      (auth as any).mockResolvedValueOnce({ userId: null });

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        }),
      });

      const response = await UploadPOST(request);
      expect(response.status).toBe(401);
    });

    it('should reject files over 10MB', async () => {
      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'large.pdf',
          fileSize: 11 * 1024 * 1024, // 11MB
          mimeType: 'application/pdf',
        }),
      });

      const response = await UploadPOST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should reject non-PDF files', async () => {
      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'document.docx',
          fileSize: 1024,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      });

      const response = await UploadPOST(request);
      expect(response.status).toBe(400);
    });

    it('should reject empty file names', async () => {
      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: '',
          fileSize: 1024,
          mimeType: 'application/pdf',
        }),
      });

      const response = await UploadPOST(request);
      expect(response.status).toBe(400);
    });

    it('should handle missing required fields', async () => {
      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'test.pdf',
          // Missing fileSize and mimeType
        }),
      });

      const response = await UploadPOST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('Step 2: Trigger Processing', () => {
    it('should trigger Inngest processing job', async () => {
      const mockDocument = {
        id: 'doc-123',
        userId: 'test-user-id',
        fileName: 'test.pdf',
        fileUrl: 'https://r2.example.com/test.pdf',
        status: 'PENDING',
      };

      (db.document.findUnique as any).mockResolvedValue(mockDocument);

      const request = new Request('http://localhost/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: 'doc-123',
        }),
      });

      const response = await ProcessPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(inngest.send).toHaveBeenCalledWith({
        name: 'document.uploaded',
        data: { documentId: 'doc-123' },
      });
    });

    it('should reject processing request for non-existent document', async () => {
      (db.document.findUnique as any).mockResolvedValue(null);

      const request = new Request('http://localhost/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: 'non-existent-doc',
        }),
      });

      const response = await ProcessPOST(request);
      expect(response.status).toBe(404);
    });

    it('should reject processing request for document owned by different user', async () => {
      const mockDocument = {
        id: 'doc-123',
        userId: 'different-user-id',
        fileName: 'test.pdf',
        fileUrl: 'https://r2.example.com/test.pdf',
        status: 'PENDING',
      };

      (db.document.findUnique as any).mockResolvedValue(mockDocument);

      const request = new Request('http://localhost/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: 'doc-123',
        }),
      });

      const response = await ProcessPOST(request);
      expect(response.status).toBe(404);
    });

    it('should validate documentId format', async () => {
      const request = new Request('http://localhost/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: 'invalid-id-format',
        }),
      });

      const response = await ProcessPOST(request);
      expect(response.status).toBe(500); // Zod validation will throw, caught by try-catch
    });
  });

  describe('Complete Upload Flow', () => {
    it('should complete full upload flow: create document -> trigger processing', async () => {
      // Step 1: Create document and get presigned URL
      const mockDocument = {
        id: 'doc-123',
        fileName: 'capital-call.pdf',
        fileSize: 204800,
        mimeType: 'application/pdf',
        fileUrl: 'https://r2.example.com/test-user-id/123-capital-call.pdf',
        userId: 'test-user-id',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.document.create as any).mockResolvedValue(mockDocument);
      (db.document.findUnique as any).mockResolvedValue(mockDocument);

      const uploadRequest = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'capital-call.pdf',
          fileSize: 204800,
          mimeType: 'application/pdf',
        }),
      });

      const uploadResponse = await UploadPOST(uploadRequest);
      const uploadData = await uploadResponse.json();

      expect(uploadResponse.status).toBe(200);
      expect(uploadData.documentId).toBe('doc-123');

      // Step 2: Trigger processing
      const processRequest = new Request('http://localhost/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: uploadData.documentId,
        }),
      });

      const processResponse = await ProcessPOST(processRequest);
      const processData = await processResponse.json();

      expect(processResponse.status).toBe(200);
      expect(processData.success).toBe(true);
      expect(inngest.send).toHaveBeenCalledWith({
        name: 'document.uploaded',
        data: { documentId: 'doc-123' },
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (db.document.create as any).mockRejectedValue(new Error('Database connection failed'));

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        }),
      });

      const response = await UploadPOST(request);
      expect(response.status).toBe(500);
    });

    it('should handle Inngest errors gracefully', async () => {
      const mockDocument = {
        id: 'doc-123',
        userId: 'test-user-id',
        fileName: 'test.pdf',
        fileUrl: 'https://r2.example.com/test.pdf',
        status: 'PENDING',
      };

      (db.document.findUnique as any).mockResolvedValue(mockDocument);
      (inngest.send as any).mockRejectedValue(new Error('Inngest service unavailable'));

      const request = new Request('http://localhost/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: 'doc-123',
        }),
      });

      const response = await ProcessPOST(request);
      expect(response.status).toBe(500);
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json{',
      });

      const response = await UploadPOST(request);
      expect(response.status).toBe(500);
    });
  });
});
