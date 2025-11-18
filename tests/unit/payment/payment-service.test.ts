// Tests for Payment Service (PAY-002)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentService } from '@/lib/payment/payment-service';
import { db } from '@/lib/db';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    capitalCall: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'email123' }),
    },
  })),
}));

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(() => {
    service = new PaymentService();
    vi.clearAllMocks();
  });

  describe('recordPayment', () => {
    it('should record a completed payment', async () => {
      const mockCapitalCall = {
        id: 'call123',
        userId: 'user123',
        amountDue: { toNumber: () => 100000 },
        user: {
          email: 'investor@example.com',
          name: 'John Doe',
        },
        fundName: 'Test Fund',
        currency: 'USD',
      };

      vi.mocked(db.capitalCall.findUnique).mockResolvedValueOnce(
        mockCapitalCall as any
      );
      vi.mocked(db.payment.findFirst).mockResolvedValueOnce(null); // No duplicate

      const mockPayment = {
        id: 'payment123',
        capitalCallId: 'call123',
        userId: 'user123',
        amount: 100000,
        status: 'COMPLETED',
      };

      vi.mocked(db.payment.create).mockResolvedValueOnce(mockPayment as any);

      const result = await service.recordPayment({
        capitalCallId: 'call123',
        amount: 100000,
        currency: 'USD',
        paidAt: new Date(),
        paymentMethod: 'WIRE',
        reference: 'WIRE-123',
      });

      expect(result.status).toBe('COMPLETED');
      expect(db.capitalCall.update).toHaveBeenCalledWith({
        where: { id: 'call123' },
        data: expect.objectContaining({ status: 'PAID' }),
      });
    });

    it('should detect partial payments', async () => {
      const mockCapitalCall = {
        id: 'call123',
        userId: 'user123',
        amountDue: { toNumber: () => 100000 },
        user: {
          email: 'investor@example.com',
          name: 'John Doe',
        },
        fundName: 'Test Fund',
        currency: 'USD',
      };

      vi.mocked(db.capitalCall.findUnique).mockResolvedValueOnce(
        mockCapitalCall as any
      );
      vi.mocked(db.payment.findFirst).mockResolvedValueOnce(null);

      const mockPayment = {
        id: 'payment123',
        status: 'PARTIAL',
      };

      vi.mocked(db.payment.create).mockResolvedValueOnce(mockPayment as any);

      const result = await service.recordPayment({
        capitalCallId: 'call123',
        amount: 50000, // Half the amount
        currency: 'USD',
        paidAt: new Date(),
        paymentMethod: 'WIRE',
      });

      expect(result.status).toBe('PARTIAL');
      expect(db.capitalCall.update).not.toHaveBeenCalled(); // Don't mark as PAID
    });

    it('should detect overpayments', async () => {
      const mockCapitalCall = {
        id: 'call123',
        userId: 'user123',
        amountDue: { toNumber: () => 100000 },
        user: {
          email: 'investor@example.com',
          name: 'John Doe',
        },
        fundName: 'Test Fund',
        currency: 'USD',
      };

      vi.mocked(db.capitalCall.findUnique).mockResolvedValueOnce(
        mockCapitalCall as any
      );
      vi.mocked(db.payment.findFirst).mockResolvedValueOnce(null);

      const mockPayment = {
        id: 'payment123',
        status: 'OVERPAID',
      };

      vi.mocked(db.payment.create).mockResolvedValueOnce(mockPayment as any);

      const result = await service.recordPayment({
        capitalCallId: 'call123',
        amount: 150000, // 50% more
        currency: 'USD',
        paidAt: new Date(),
        paymentMethod: 'WIRE',
      });

      expect(result.status).toBe('OVERPAID');
    });

    it('should reject duplicate payments', async () => {
      const mockCapitalCall = {
        id: 'call123',
        userId: 'user123',
        amountDue: { toNumber: () => 100000 },
        user: { email: 'investor@example.com' },
      };

      vi.mocked(db.capitalCall.findUnique).mockResolvedValueOnce(
        mockCapitalCall as any
      );

      // Existing payment with same reference
      vi.mocked(db.payment.findFirst).mockResolvedValueOnce({
        id: 'existing-payment',
        reference: 'WIRE-123',
        status: 'COMPLETED',
      } as any);

      await expect(
        service.recordPayment({
          capitalCallId: 'call123',
          amount: 100000,
          currency: 'USD',
          paidAt: new Date(),
          paymentMethod: 'WIRE',
          reference: 'WIRE-123',
        })
      ).rejects.toThrow('Duplicate payment detected');
    });

    it('should create audit log', async () => {
      const mockCapitalCall = {
        id: 'call123',
        userId: 'user123',
        amountDue: { toNumber: () => 100000 },
        user: { email: 'investor@example.com', name: 'John Doe' },
        fundName: 'Test Fund',
        currency: 'USD',
      };

      vi.mocked(db.capitalCall.findUnique).mockResolvedValueOnce(
        mockCapitalCall as any
      );
      vi.mocked(db.payment.findFirst).mockResolvedValueOnce(null);
      vi.mocked(db.payment.create).mockResolvedValueOnce({
        id: 'payment123',
        status: 'COMPLETED',
      } as any);

      await service.recordPayment({
        capitalCallId: 'call123',
        amount: 100000,
        currency: 'USD',
        paidAt: new Date(),
        paymentMethod: 'WIRE',
      });

      expect(db.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'PAYMENT_RECORDED',
          entityType: 'PAYMENT',
        }),
      });
    });
  });

  describe('reconcilePayment', () => {
    it('should reconcile payment and update capital call', async () => {
      const mockPayment = {
        id: 'payment123',
        capitalCallId: 'call123',
        amount: { toNumber: () => 100000 },
        capitalCall: {
          amountDue: { toNumber: () => 100000 },
        },
      };

      vi.mocked(db.payment.findUnique).mockResolvedValueOnce(
        mockPayment as any
      );
      vi.mocked(db.payment.update).mockResolvedValueOnce({} as any);
      vi.mocked(db.payment.aggregate).mockResolvedValueOnce({
        _sum: { amount: { toNumber: () => 100000 } },
      } as any);

      await service.reconcilePayment('payment123', {
        reconciledBy: 'admin123',
        notes: 'Bank statement verified',
      });

      expect(db.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment123' },
        data: expect.objectContaining({
          status: 'RECONCILED',
          reconciledBy: 'admin123',
          reconciliationNotes: 'Bank statement verified',
        }),
      });

      expect(db.capitalCall.update).toHaveBeenCalledWith({
        where: { id: 'call123' },
        data: { status: 'PAID' },
      });
    });

    it('should handle adjusted amounts', async () => {
      const mockPayment = {
        id: 'payment123',
        capitalCallId: 'call123',
        amount: { toNumber: () => 100000 },
        capitalCall: {
          amountDue: { toNumber: () => 100000 },
        },
      };

      vi.mocked(db.payment.findUnique).mockResolvedValueOnce(
        mockPayment as any
      );
      vi.mocked(db.payment.aggregate).mockResolvedValueOnce({
        _sum: { amount: { toNumber: () => 99500 } },
      } as any);

      await service.reconcilePayment('payment123', {
        reconciledBy: 'admin123',
        adjustedAmount: 99500,
      });

      expect(db.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment123' },
        data: expect.objectContaining({
          amount: 99500,
        }),
      });
    });

    it('should throw error if payment not found', async () => {
      vi.mocked(db.payment.findUnique).mockResolvedValueOnce(null);

      await expect(
        service.reconcilePayment('nonexistent', {
          reconciledBy: 'admin123',
        })
      ).rejects.toThrow('Payment not found');
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status summary', async () => {
      const mockCapitalCall = {
        id: 'call123',
        amountDue: { toNumber: () => 100000 },
        status: 'APPROVED',
        payments: [
          {
            amount: { toNumber: () => 50000 },
            status: 'COMPLETED',
          },
          {
            amount: { toNumber: () => 50000 },
            status: 'COMPLETED',
          },
        ],
      };

      vi.mocked(db.capitalCall.findUnique).mockResolvedValueOnce(
        mockCapitalCall as any
      );

      const result = await service.getPaymentStatus('call123');

      expect(result.amountDue).toBe(100000);
      expect(result.totalPaid).toBe(100000);
      expect(result.remaining).toBe(0);
      expect(result.payments).toHaveLength(2);
    });

    it('should calculate remaining amount correctly', async () => {
      const mockCapitalCall = {
        id: 'call123',
        amountDue: { toNumber: () => 100000 },
        status: 'APPROVED',
        payments: [
          {
            amount: { toNumber: () => 30000 },
            status: 'COMPLETED',
          },
        ],
      };

      vi.mocked(db.capitalCall.findUnique).mockResolvedValueOnce(
        mockCapitalCall as any
      );

      const result = await service.getPaymentStatus('call123');

      expect(result.remaining).toBe(70000);
    });
  });
});
