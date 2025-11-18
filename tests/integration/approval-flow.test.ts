/**
 * Integration Tests: Approve/Reject Flow
 *
 * Tests the capital call approval and rejection flow:
 * - Capital call approval with validation
 * - Capital call rejection
 * - Document status updates
 * - Database consistency
 * - Authorization checks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as ApprovePOST } from '@/app/api/capital-calls/[id]/approve/route';
import { POST as RejectPOST } from '@/app/api/capital-calls/[id]/reject/route';
import { db } from '@/lib/db';

// Mock dependencies
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: 'test-user-id' })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    capitalCall: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    document: {
      update: vi.fn(),
    },
  },
}));

describe('Approve/Reject Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Capital Call Approval', () => {
    it('should approve capital call with valid data', async () => {
      const mockCapitalCall = {
        id: 'cc-123',
        userId: 'test-user-id',
        documentId: 'doc-123',
        fundName: 'Apollo Fund XI',
        amountDue: 250000,
        currency: 'USD',
        dueDate: new Date('2025-12-15'),
        status: 'PENDING_REVIEW',
        document: {
          id: 'doc-123',
          status: 'REVIEW',
        },
      };

      const updatedCapitalCall = {
        ...mockCapitalCall,
        status: 'APPROVED',
        reviewedAt: new Date(),
        approvedAt: new Date(),
      };

      (db.capitalCall.findUnique as any).mockResolvedValue(mockCapitalCall);
      (db.capitalCall.update as any).mockResolvedValue(updatedCapitalCall);
      (db.document.update as any).mockResolvedValue({
        id: 'doc-123',
        status: 'APPROVED',
      });

      const request = new Request('http://localhost/api/capital-calls/cc-123/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundName: 'Apollo Fund XI',
          amountDue: 250000,
          currency: 'USD',
          dueDate: '2025-12-15',
          bankName: 'JPMorgan Chase',
          accountNumber: '987654321',
          routingNumber: '021000021',
          wireReference: 'APOLLO-CALL-Q4',
        }),
      });

      const response = await ApprovePOST(request, { params: { id: 'cc-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('APPROVED');
      expect(data.approvedAt).toBeDefined();

      // Verify database updates
      expect(db.capitalCall.update).toHaveBeenCalledWith({
        where: { id: 'cc-123' },
        data: expect.objectContaining({
          status: 'APPROVED',
          reviewedAt: expect.any(Date),
          approvedAt: expect.any(Date),
        }),
      });

      expect(db.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        data: { status: 'APPROVED' },
      });
    });

    it('should reject approval for unauthorized user', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      (auth as any).mockResolvedValueOnce({ userId: null });

      const request = new Request('http://localhost/api/capital-calls/cc-123/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundName: 'Test Fund',
          amountDue: 100000,
          dueDate: '2025-12-15',
        }),
      });

      const response = await ApprovePOST(request, { params: { id: 'cc-123' } });

      expect(response.status).toBe(401);
    });

    it('should reject approval for non-existent capital call', async () => {
      (db.capitalCall.findUnique as any).mockResolvedValue(null);

      const request = new Request('http://localhost/api/capital-calls/non-existent/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundName: 'Test Fund',
          amountDue: 100000,
          dueDate: '2025-12-15',
        }),
      });

      const response = await ApprovePOST(request, { params: { id: 'non-existent' } });

      expect(response.status).toBe(404);
    });

    it('should reject approval for capital call owned by different user', async () => {
      const mockCapitalCall = {
        id: 'cc-123',
        userId: 'different-user-id',
        documentId: 'doc-123',
        status: 'PENDING_REVIEW',
        document: {
          id: 'doc-123',
          status: 'REVIEW',
        },
      };

      (db.capitalCall.findUnique as any).mockResolvedValue(mockCapitalCall);

      const request = new Request('http://localhost/api/capital-calls/cc-123/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundName: 'Test Fund',
          amountDue: 100000,
          dueDate: '2025-12-15',
        }),
      });

      const response = await ApprovePOST(request, { params: { id: 'cc-123' } });

      expect(response.status).toBe(404);
    });

    it('should validate required fields', async () => {
      const mockCapitalCall = {
        id: 'cc-123',
        userId: 'test-user-id',
        documentId: 'doc-123',
        status: 'PENDING_REVIEW',
        document: {
          id: 'doc-123',
          status: 'REVIEW',
        },
      };

      (db.capitalCall.findUnique as any).mockResolvedValue(mockCapitalCall);

      const request = new Request('http://localhost/api/capital-calls/cc-123/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundName: '', // Empty fund name should fail
          amountDue: 100000,
          dueDate: '2025-12-15',
        }),
      });

      const response = await ApprovePOST(request, { params: { id: 'cc-123' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should validate amount is positive', async () => {
      const mockCapitalCall = {
        id: 'cc-123',
        userId: 'test-user-id',
        documentId: 'doc-123',
        status: 'PENDING_REVIEW',
        document: {
          id: 'doc-123',
          status: 'REVIEW',
        },
      };

      (db.capitalCall.findUnique as any).mockResolvedValue(mockCapitalCall);

      const request = new Request('http://localhost/api/capital-calls/cc-123/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundName: 'Test Fund',
          amountDue: -100, // Negative amount should fail
          dueDate: '2025-12-15',
        }),
      });

      const response = await ApprovePOST(request, { params: { id: 'cc-123' } });

      expect(response.status).toBe(400);
    });

    it('should validate email format if provided', async () => {
      const mockCapitalCall = {
        id: 'cc-123',
        userId: 'test-user-id',
        documentId: 'doc-123',
        status: 'PENDING_REVIEW',
        document: {
          id: 'doc-123',
          status: 'REVIEW',
        },
      };

      (db.capitalCall.findUnique as any).mockResolvedValue(mockCapitalCall);

      const request = new Request('http://localhost/api/capital-calls/cc-123/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundName: 'Test Fund',
          amountDue: 100000,
          dueDate: '2025-12-15',
          investorEmail: 'invalid-email', // Invalid email format
        }),
      });

      const response = await ApprovePOST(request, { params: { id: 'cc-123' } });

      expect(response.status).toBe(400);
    });

    it('should handle approval with optional wire instructions', async () => {
      const mockCapitalCall = {
        id: 'cc-123',
        userId: 'test-user-id',
        documentId: 'doc-123',
        status: 'PENDING_REVIEW',
        document: {
          id: 'doc-123',
          status: 'REVIEW',
        },
      };

      const updatedCapitalCall = {
        ...mockCapitalCall,
        status: 'APPROVED',
        bankName: 'Bank of America',
        accountNumber: '123456789',
        routingNumber: '026009593',
        wireReference: 'TEST-REF',
        reviewedAt: new Date(),
        approvedAt: new Date(),
      };

      (db.capitalCall.findUnique as any).mockResolvedValue(mockCapitalCall);
      (db.capitalCall.update as any).mockResolvedValue(updatedCapitalCall);
      (db.document.update as any).mockResolvedValue({
        id: 'doc-123',
        status: 'APPROVED',
      });

      const request = new Request('http://localhost/api/capital-calls/cc-123/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundName: 'Test Fund',
          amountDue: 100000,
          dueDate: '2025-12-15',
          bankName: 'Bank of America',
          accountNumber: '123456789',
          routingNumber: '026009593',
          wireReference: 'TEST-REF',
        }),
      });

      const response = await ApprovePOST(request, { params: { id: 'cc-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bankName).toBe('Bank of America');
      expect(data.accountNumber).toBe('123456789');
      expect(data.routingNumber).toBe('026009593');
      expect(data.wireReference).toBe('TEST-REF');
    });
  });

  describe('Capital Call Rejection', () => {
    it('should reject capital call successfully', async () => {
      const mockCapitalCall = {
        id: 'cc-123',
        userId: 'test-user-id',
        documentId: 'doc-123',
        status: 'PENDING_REVIEW',
      };

      const updatedCapitalCall = {
        ...mockCapitalCall,
        status: 'REJECTED',
        reviewedAt: new Date(),
      };

      (db.capitalCall.findUnique as any).mockResolvedValue(mockCapitalCall);
      (db.capitalCall.update as any).mockResolvedValue(updatedCapitalCall);
      (db.document.update as any).mockResolvedValue({
        id: 'doc-123',
        status: 'REJECTED',
      });

      const request = new Request('http://localhost/api/capital-calls/cc-123/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await RejectPOST(request, { params: { id: 'cc-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify database updates
      expect(db.capitalCall.update).toHaveBeenCalledWith({
        where: { id: 'cc-123' },
        data: {
          status: 'REJECTED',
          reviewedAt: expect.any(Date),
        },
      });

      expect(db.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        data: { status: 'REJECTED' },
      });
    });

    it('should reject rejection for unauthorized user', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      (auth as any).mockResolvedValueOnce({ userId: null });

      const request = new Request('http://localhost/api/capital-calls/cc-123/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await RejectPOST(request, { params: { id: 'cc-123' } });

      expect(response.status).toBe(401);
    });

    it('should reject rejection for non-existent capital call', async () => {
      (db.capitalCall.findUnique as any).mockResolvedValue(null);

      const request = new Request('http://localhost/api/capital-calls/non-existent/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await RejectPOST(request, { params: { id: 'non-existent' } });

      expect(response.status).toBe(404);
    });

    it('should reject rejection for capital call owned by different user', async () => {
      const mockCapitalCall = {
        id: 'cc-123',
        userId: 'different-user-id',
        documentId: 'doc-123',
        status: 'PENDING_REVIEW',
      };

      (db.capitalCall.findUnique as any).mockResolvedValue(mockCapitalCall);

      const request = new Request('http://localhost/api/capital-calls/cc-123/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await RejectPOST(request, { params: { id: 'cc-123' } });

      expect(response.status).toBe(404);
    });
  });

  describe('Database Consistency', () => {
    it('should maintain consistency between capital call and document status on approval', async () => {
      const mockCapitalCall = {
        id: 'cc-123',
        userId: 'test-user-id',
        documentId: 'doc-123',
        status: 'PENDING_REVIEW',
        document: {
          id: 'doc-123',
          status: 'REVIEW',
        },
      };

      const updatedCapitalCall = {
        ...mockCapitalCall,
        status: 'APPROVED',
        reviewedAt: new Date(),
        approvedAt: new Date(),
      };

      (db.capitalCall.findUnique as any).mockResolvedValue(mockCapitalCall);
      (db.capitalCall.update as any).mockResolvedValue(updatedCapitalCall);
      (db.document.update as any).mockResolvedValue({
        id: 'doc-123',
        status: 'APPROVED',
      });

      const request = new Request('http://localhost/api/capital-calls/cc-123/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundName: 'Test Fund',
          amountDue: 100000,
          dueDate: '2025-12-15',
        }),
      });

      await ApprovePOST(request, { params: { id: 'cc-123' } });

      // Both capital call and document should be updated
      expect(db.capitalCall.update).toHaveBeenCalled();
      expect(db.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        data: { status: 'APPROVED' },
      });
    });

    it('should maintain consistency between capital call and document status on rejection', async () => {
      const mockCapitalCall = {
        id: 'cc-123',
        userId: 'test-user-id',
        documentId: 'doc-123',
        status: 'PENDING_REVIEW',
      };

      (db.capitalCall.findUnique as any).mockResolvedValue(mockCapitalCall);
      (db.capitalCall.update as any).mockResolvedValue({
        ...mockCapitalCall,
        status: 'REJECTED',
        reviewedAt: new Date(),
      });
      (db.document.update as any).mockResolvedValue({
        id: 'doc-123',
        status: 'REJECTED',
      });

      const request = new Request('http://localhost/api/capital-calls/cc-123/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      await RejectPOST(request, { params: { id: 'cc-123' } });

      // Both capital call and document should be updated
      expect(db.capitalCall.update).toHaveBeenCalled();
      expect(db.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        data: { status: 'REJECTED' },
      });
    });

    it('should handle database errors gracefully during approval', async () => {
      const mockCapitalCall = {
        id: 'cc-123',
        userId: 'test-user-id',
        documentId: 'doc-123',
        status: 'PENDING_REVIEW',
        document: {
          id: 'doc-123',
          status: 'REVIEW',
        },
      };

      (db.capitalCall.findUnique as any).mockResolvedValue(mockCapitalCall);
      (db.capitalCall.update as any).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/capital-calls/cc-123/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundName: 'Test Fund',
          amountDue: 100000,
          dueDate: '2025-12-15',
        }),
      });

      const response = await ApprovePOST(request, { params: { id: 'cc-123' } });

      expect(response.status).toBe(500);
    });

    it('should handle database errors gracefully during rejection', async () => {
      const mockCapitalCall = {
        id: 'cc-123',
        userId: 'test-user-id',
        documentId: 'doc-123',
        status: 'PENDING_REVIEW',
      };

      (db.capitalCall.findUnique as any).mockResolvedValue(mockCapitalCall);
      (db.capitalCall.update as any).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/capital-calls/cc-123/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await RejectPOST(request, { params: { id: 'cc-123' } });

      expect(response.status).toBe(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle approval with minimal required fields only', async () => {
      const mockCapitalCall = {
        id: 'cc-123',
        userId: 'test-user-id',
        documentId: 'doc-123',
        status: 'PENDING_REVIEW',
        document: {
          id: 'doc-123',
          status: 'REVIEW',
        },
      };

      const updatedCapitalCall = {
        ...mockCapitalCall,
        fundName: 'Minimal Fund',
        amountDue: 50000,
        currency: 'USD',
        dueDate: new Date('2025-12-31'),
        status: 'APPROVED',
        reviewedAt: new Date(),
        approvedAt: new Date(),
      };

      (db.capitalCall.findUnique as any).mockResolvedValue(mockCapitalCall);
      (db.capitalCall.update as any).mockResolvedValue(updatedCapitalCall);
      (db.document.update as any).mockResolvedValue({
        id: 'doc-123',
        status: 'APPROVED',
      });

      const request = new Request('http://localhost/api/capital-calls/cc-123/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundName: 'Minimal Fund',
          amountDue: 50000,
          dueDate: '2025-12-31',
          // No optional fields
        }),
      });

      const response = await ApprovePOST(request, { params: { id: 'cc-123' } });

      expect(response.status).toBe(200);
    });

    it('should handle malformed JSON in approval request', async () => {
      const request = new Request('http://localhost/api/capital-calls/cc-123/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json{',
      });

      const response = await ApprovePOST(request, { params: { id: 'cc-123' } });

      expect(response.status).toBe(500);
    });
  });
});
