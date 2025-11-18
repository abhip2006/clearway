// Tests for Bank Statement Reconciliation (PAY-004)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BankStatementReconciler } from '@/lib/payment/statement-reconciliation';
import { db } from '@/lib/db';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    payment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    statementReconciliation: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('pdf-parse', () => ({
  default: vi.fn().mockResolvedValue({
    text: `
      Bank Statement - October 2025

      Date       Description                Amount
      10/15/2025 WIRE TRANSFER REF ABC123   $100,000.00
      10/16/2025 WIRE TRANSFER REF XYZ456   $50,000.00
      10/17/2025 ACH PAYMENT                $25,000.00
    `,
  }),
}));

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({
    recognize: vi.fn().mockResolvedValue({
      data: { text: 'OCR text from scanned PDF' },
    }),
    terminate: vi.fn(),
  }),
}));

global.fetch = vi.fn().mockResolvedValue({
  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
});

describe('BankStatementReconciler', () => {
  let reconciler: BankStatementReconciler;

  beforeEach(() => {
    reconciler = new BankStatementReconciler();
    vi.clearAllMocks();
  });

  describe('parseStatement', () => {
    it('should parse transactions from PDF', async () => {
      const result = await reconciler.parseStatement('https://example.com/statement.pdf');

      expect(result.transactions).toBeDefined();
      expect(result.transactions.length).toBeGreaterThan(0);
    });

    it('should extract transaction details', async () => {
      const result = await reconciler.parseStatement('https://example.com/statement.pdf');

      const firstTransaction = result.transactions[0];
      expect(firstTransaction).toHaveProperty('date');
      expect(firstTransaction).toHaveProperty('description');
      expect(firstTransaction).toHaveProperty('amount');
      expect(firstTransaction).toHaveProperty('type');
    });
  });

  describe('reconcileStatement', () => {
    it('should match transactions to payments', async () => {
      const mockPayment = {
        id: 'payment123',
        reference: 'ABC123',
        amount: { toNumber: () => 100000 },
      };

      vi.mocked(db.payment.findFirst).mockResolvedValue(mockPayment as any);
      vi.mocked(db.payment.update).mockResolvedValue({} as any);
      vi.mocked(db.statementReconciliation.create).mockResolvedValue({} as any);

      const result = await reconciler.reconcileStatement({
        statementPdfUrl: 'https://example.com/statement.pdf',
        bankAccountId: 'bank123',
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
      });

      expect(result.matched).toBeGreaterThan(0);
      expect(db.payment.update).toHaveBeenCalled();
    });

    it('should identify unmatched transactions', async () => {
      vi.mocked(db.payment.findFirst).mockResolvedValue(null);
      vi.mocked(db.statementReconciliation.create).mockResolvedValue({} as any);

      const result = await reconciler.reconcileStatement({
        statementPdfUrl: 'https://example.com/statement.pdf',
        bankAccountId: 'bank123',
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
      });

      expect(result.unmatched).toBeGreaterThan(0);
      expect(result.discrepancies.length).toBeGreaterThan(0);
    });

    it('should create reconciliation record', async () => {
      vi.mocked(db.payment.findFirst).mockResolvedValue(null);
      vi.mocked(db.statementReconciliation.create).mockResolvedValue({} as any);

      await reconciler.reconcileStatement({
        statementPdfUrl: 'https://example.com/statement.pdf',
        bankAccountId: 'bank123',
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
      });

      expect(db.statementReconciliation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bankAccountId: 'bank123',
          totalTransactions: expect.any(Number),
          matchedCount: expect.any(Number),
          unmatchedCount: expect.any(Number),
        }),
      });
    });
  });

  describe('getUnreconciledPayments', () => {
    it('should return unreconciled payments', async () => {
      const mockPayments = [
        {
          id: 'payment1',
          status: 'COMPLETED',
          reconciledAt: null,
        },
        {
          id: 'payment2',
          status: 'PENDING',
          reconciledAt: null,
        },
      ];

      vi.mocked(db.payment.findMany).mockResolvedValue(mockPayments as any);

      const result = await reconciler.getUnreconciledPayments();

      expect(result).toHaveLength(2);
    });
  });

  describe('detectFraudIndicators', () => {
    it('should detect multiple payments in short time', async () => {
      const mockPayment = {
        id: 'payment123',
        userId: 'user123',
        amount: { toNumber: () => 100000 },
        createdAt: new Date(),
        paidAt: new Date(),
        user: {},
        capitalCall: {
          amountDue: { toNumber: () => 100000 },
          dueDate: new Date(),
        },
      };

      vi.mocked(db.payment.findUnique).mockResolvedValue(mockPayment as any);
      vi.mocked(db.payment.count)
        .mockResolvedValueOnce(5) // recentPayments
        .mockResolvedValueOnce(0) // previousPayments
        .mockResolvedValueOnce(0); // failedPayments

      const result = await reconciler.detectFraudIndicators('payment123');

      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.indicators).toContain('Multiple payments in 24 hours');
    });

    it('should detect large first-time payment', async () => {
      const mockPayment = {
        id: 'payment123',
        userId: 'user123',
        amount: { toNumber: () => 500000 }, // Large amount
        createdAt: new Date(),
        paidAt: new Date(),
        user: {},
        capitalCall: {
          amountDue: { toNumber: () => 500000 },
          dueDate: new Date(),
        },
      };

      vi.mocked(db.payment.findUnique).mockResolvedValue(mockPayment as any);
      vi.mocked(db.payment.count)
        .mockResolvedValueOnce(1) // recentPayments
        .mockResolvedValueOnce(0) // previousPayments - first time
        .mockResolvedValueOnce(0); // failedPayments

      const result = await reconciler.detectFraudIndicators('payment123');

      expect(result.indicators).toContain('First-time payment over $100,000');
    });

    it('should detect amount discrepancies', async () => {
      const mockPayment = {
        id: 'payment123',
        userId: 'user123',
        amount: { toNumber: () => 120000 }, // 20% more than expected
        createdAt: new Date(),
        paidAt: new Date(),
        user: {},
        capitalCall: {
          amountDue: { toNumber: () => 100000 },
          dueDate: new Date(),
        },
      };

      vi.mocked(db.payment.findUnique).mockResolvedValue(mockPayment as any);
      vi.mocked(db.payment.count)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);

      const result = await reconciler.detectFraudIndicators('payment123');

      expect(result.indicators).toContain(
        'Payment amount differs by >10% from expected'
      );
    });

    it('should detect overdue payments', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 90); // 90 days ago

      const mockPayment = {
        id: 'payment123',
        userId: 'user123',
        amount: { toNumber: () => 100000 },
        createdAt: new Date(),
        paidAt: new Date(),
        user: {},
        capitalCall: {
          amountDue: { toNumber: () => 100000 },
          dueDate,
        },
      };

      vi.mocked(db.payment.findUnique).mockResolvedValue(mockPayment as any);
      vi.mocked(db.payment.count)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);

      const result = await reconciler.detectFraudIndicators('payment123');

      expect(result.indicators).toContain('Payment more than 60 days overdue');
    });

    it('should cap risk score at 1.0', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 90);

      const mockPayment = {
        id: 'payment123',
        userId: 'user123',
        amount: { toNumber: () => 1000000 }, // Very large
        createdAt: new Date(),
        paidAt: new Date(),
        user: {},
        capitalCall: {
          amountDue: { toNumber: () => 100000 }, // Big discrepancy
          dueDate,
        },
      };

      vi.mocked(db.payment.findUnique).mockResolvedValue(mockPayment as any);
      vi.mocked(db.payment.count)
        .mockResolvedValueOnce(10) // Many recent payments
        .mockResolvedValueOnce(0) // First time
        .mockResolvedValueOnce(5); // Many failures

      const result = await reconciler.detectFraudIndicators('payment123');

      expect(result.riskScore).toBeLessThanOrEqual(1.0);
    });
  });
});
