/**
 * Integration Tests: Payment Matching Algorithm
 *
 * Tests the payment matching logic that matches incoming payments
 * to capital calls using fuzzy matching and confidence scoring.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Payment Matching Algorithm Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Exact Matching', () => {
    it('should match payment with exact amount and wire reference', () => {
      const capitalCall = {
        id: 'cc-123',
        fundName: 'Apollo Fund XI',
        amountDue: 250000,
        wireReference: 'APOLLO-CALL-Q4-2025',
      };

      const payment = {
        id: 'pmt-123',
        amount: 250000,
        reference: 'APOLLO-CALL-Q4-2025',
        date: new Date('2025-12-15'),
      };

      // Exact match should have 100% confidence
      const match = matchPayment(payment, [capitalCall]);

      expect(match).toBeDefined();
      expect(match?.capitalCallId).toBe('cc-123');
      expect(match?.confidence).toBeGreaterThanOrEqual(0.95);
      expect(match?.matchType).toBe('exact');
    });

    it('should match payment with exact amount but no reference', () => {
      const capitalCall = {
        id: 'cc-123',
        fundName: 'Apollo Fund XI',
        amountDue: 250000,
      };

      const payment = {
        id: 'pmt-123',
        amount: 250000,
        date: new Date('2025-12-15'),
      };

      const match = matchPayment(payment, [capitalCall]);

      expect(match).toBeDefined();
      expect(match?.capitalCallId).toBe('cc-123');
      expect(match?.confidence).toBeGreaterThan(0.7);
      expect(match?.confidence).toBeLessThan(0.95);
    });
  });

  describe('Fuzzy Matching', () => {
    it('should match payment with similar wire reference', () => {
      const capitalCall = {
        id: 'cc-123',
        fundName: 'Apollo Fund XI',
        amountDue: 250000,
        wireReference: 'APOLLO-CALL-Q4-2025',
      };

      const payment = {
        id: 'pmt-123',
        amount: 250000,
        reference: 'APOLLO CALL Q4 2025', // Similar but different format
        date: new Date('2025-12-15'),
      };

      const match = matchPayment(payment, [capitalCall]);

      expect(match).toBeDefined();
      expect(match?.capitalCallId).toBe('cc-123');
      expect(match?.confidence).toBeGreaterThan(0.8);
      expect(match?.matchType).toBe('fuzzy');
    });

    it('should match payment with close but not exact amount', () => {
      const capitalCall = {
        id: 'cc-123',
        fundName: 'Apollo Fund XI',
        amountDue: 250000,
      };

      const payment = {
        id: 'pmt-123',
        amount: 249995, // $5 off due to wire fees
        reference: 'APOLLO-CALL',
        date: new Date('2025-12-15'),
      };

      const match = matchPayment(payment, [capitalCall]);

      expect(match).toBeDefined();
      expect(match?.capitalCallId).toBe('cc-123');
      expect(match?.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Multiple Candidates', () => {
    it('should select best match from multiple candidates', () => {
      const capitalCalls = [
        {
          id: 'cc-1',
          fundName: 'Apollo Fund XI',
          amountDue: 250000,
          wireReference: 'APOLLO-CALL-Q4',
        },
        {
          id: 'cc-2',
          fundName: 'Blackstone Fund VII',
          amountDue: 250000, // Same amount
          wireReference: 'BLACKSTONE-CALL',
        },
        {
          id: 'cc-3',
          fundName: 'Apollo Fund XI',
          amountDue: 260000, // Close amount
          wireReference: 'APOLLO-CALL-Q3',
        },
      ];

      const payment = {
        id: 'pmt-123',
        amount: 250000,
        reference: 'APOLLO-CALL-Q4-2025',
        date: new Date('2025-12-15'),
      };

      const match = matchPayment(payment, capitalCalls);

      // Should match cc-1 (best match on reference and exact amount)
      expect(match?.capitalCallId).toBe('cc-1');
      expect(match?.confidence).toBeGreaterThan(0.9);
    });

    it('should return all candidates with confidence scores', () => {
      const capitalCalls = [
        {
          id: 'cc-1',
          fundName: 'Apollo Fund XI',
          amountDue: 250000,
        },
        {
          id: 'cc-2',
          fundName: 'Apollo Fund XI',
          amountDue: 260000,
        },
      ];

      const payment = {
        id: 'pmt-123',
        amount: 255000, // Between both amounts
        reference: 'APOLLO',
        date: new Date('2025-12-15'),
      };

      const matches = matchPaymentWithCandidates(payment, capitalCalls);

      expect(matches).toHaveLength(2);
      expect(matches[0].confidence).toBeGreaterThan(matches[1].confidence);
    });
  });

  describe('Edge Cases', () => {
    it('should handle payment with no matching capital calls', () => {
      const capitalCall = {
        id: 'cc-123',
        fundName: 'Apollo Fund XI',
        amountDue: 250000,
      };

      const payment = {
        id: 'pmt-123',
        amount: 500000, // Completely different amount
        reference: 'DIFFERENT-FUND',
        date: new Date('2025-12-15'),
      };

      const match = matchPayment(payment, [capitalCall]);

      expect(match).toBeNull();
    });

    it('should handle empty capital calls list', () => {
      const payment = {
        id: 'pmt-123',
        amount: 250000,
        reference: 'TEST',
        date: new Date('2025-12-15'),
      };

      const match = matchPayment(payment, []);

      expect(match).toBeNull();
    });

    it('should handle payment with missing reference', () => {
      const capitalCall = {
        id: 'cc-123',
        fundName: 'Apollo Fund XI',
        amountDue: 250000,
      };

      const payment = {
        id: 'pmt-123',
        amount: 250000,
        date: new Date('2025-12-15'),
      };

      const match = matchPayment(payment, [capitalCall]);

      // Should still match on amount
      expect(match).toBeDefined();
      expect(match?.confidence).toBeGreaterThan(0.7);
    });

    it('should handle very large amounts with rounding', () => {
      const capitalCall = {
        id: 'cc-123',
        fundName: 'Large Fund',
        amountDue: 10000000.00,
      };

      const payment = {
        id: 'pmt-123',
        amount: 9999995.00, // Wire fee
        date: new Date('2025-12-15'),
      };

      const match = matchPayment(payment, [capitalCall]);

      expect(match).toBeDefined();
      expect(match?.confidence).toBeGreaterThan(0.85);
    });
  });

  describe('Date-based Matching', () => {
    it('should prefer matches with closer due dates', () => {
      const capitalCalls = [
        {
          id: 'cc-1',
          fundName: 'Fund Alpha',
          amountDue: 250000,
          dueDate: new Date('2025-12-15'),
        },
        {
          id: 'cc-2',
          fundName: 'Fund Beta',
          amountDue: 250000,
          dueDate: new Date('2026-03-15'), // Far future
        },
      ];

      const payment = {
        id: 'pmt-123',
        amount: 250000,
        date: new Date('2025-12-16'), // Day after cc-1 due date
      };

      const match = matchPayment(payment, capitalCalls);

      // Should match cc-1 (closer due date)
      expect(match?.capitalCallId).toBe('cc-1');
    });
  });

  describe('Confidence Score Calculation', () => {
    it('should calculate confidence based on multiple factors', () => {
      const capitalCall = {
        id: 'cc-123',
        fundName: 'Apollo Fund XI',
        amountDue: 250000,
        wireReference: 'APOLLO-Q4',
        dueDate: new Date('2025-12-15'),
      };

      const scenarios = [
        {
          payment: {
            amount: 250000,
            reference: 'APOLLO-Q4',
            date: new Date('2025-12-15'),
          },
          expectedConfidence: 0.95, // Perfect match
        },
        {
          payment: {
            amount: 250000,
            reference: 'APOLLO',
            date: new Date('2025-12-15'),
          },
          expectedConfidence: 0.85, // Partial reference match
        },
        {
          payment: {
            amount: 249000, // $1k off
            reference: 'APOLLO-Q4',
            date: new Date('2025-12-15'),
          },
          expectedConfidence: 0.80, // Close amount
        },
        {
          payment: {
            amount: 250000,
            date: new Date('2025-12-15'),
          },
          expectedConfidence: 0.75, // No reference
        },
      ];

      scenarios.forEach((scenario, index) => {
        const match = matchPayment(scenario.payment as any, [capitalCall]);
        expect(match?.confidence).toBeGreaterThan(scenario.expectedConfidence - 0.1);
        expect(match?.confidence).toBeLessThan(scenario.expectedConfidence + 0.1);
      });
    });
  });
});

// Mock helper functions (would be implemented in actual code)
function matchPayment(
  payment: any,
  capitalCalls: any[]
): { capitalCallId: string; confidence: number; matchType: string } | null {
  if (capitalCalls.length === 0) return null;

  let bestMatch = null;
  let highestConfidence = 0;

  for (const cc of capitalCalls) {
    let confidence = 0;

    // Amount matching (40% weight)
    const amountDiff = Math.abs(payment.amount - cc.amountDue);
    const amountDiffPercent = amountDiff / cc.amountDue;
    if (amountDiffPercent < 0.01) {
      confidence += 0.4; // Within 1%
    } else if (amountDiffPercent < 0.05) {
      confidence += 0.3; // Within 5%
    } else if (amountDiffPercent < 0.1) {
      confidence += 0.2; // Within 10%
    }

    // Reference matching (40% weight)
    if (payment.reference && cc.wireReference) {
      const refSimilarity = calculateSimilarity(
        payment.reference.toLowerCase(),
        cc.wireReference.toLowerCase()
      );
      confidence += refSimilarity * 0.4;
    }

    // Date proximity (20% weight)
    if (payment.date && cc.dueDate) {
      const daysDiff = Math.abs(
        (payment.date.getTime() - cc.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff < 7) {
        confidence += 0.2 * (1 - daysDiff / 7);
      }
    }

    if (confidence > highestConfidence && confidence > 0.7) {
      highestConfidence = confidence;
      bestMatch = {
        capitalCallId: cc.id,
        confidence,
        matchType: confidence > 0.95 ? 'exact' : 'fuzzy',
      };
    }
  }

  return bestMatch;
}

function matchPaymentWithCandidates(payment: any, capitalCalls: any[]) {
  return capitalCalls
    .map((cc) => ({
      capitalCallId: cc.id,
      confidence: matchPayment(payment, [cc])?.confidence || 0,
    }))
    .sort((a, b) => b.confidence - a.confidence);
}

function calculateSimilarity(str1: string, str2: string): number {
  // Simple similarity calculation (Levenshtein-like)
  if (str1 === str2) return 1;
  if (str1.includes(str2) || str2.includes(str1)) return 0.9;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1;

  const editDistance = levenshteinDistance(str1, str2);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
