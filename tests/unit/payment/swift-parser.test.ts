// Tests for SWIFT Message Parser (PAY-001)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SwiftMessageParser } from '@/lib/payment/swift-parser';
import { db } from '@/lib/db';

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    capitalCall: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('SwiftMessageParser', () => {
  let parser: SwiftMessageParser;

  beforeEach(() => {
    parser = new SwiftMessageParser();
    vi.clearAllMocks();
  });

  describe('parseMessage', () => {
    it('should parse a valid MT103 message', () => {
      const rawMessage = `
MT103
:20:ABC123456789
:32A:251115USD500000.00
:50K:ORDERING CUSTOMER NAME
ABC COMPANY
123 MAIN ST
:59:BENEFICIARY CUSTOMER NAME
XYZ FUND
456 PARK AVE
:70:PAYMENT FOR CAPITAL CALL Q4 2025
VENTURE GROWTH FUND II
:72:ADDITIONAL INFO
      `.trim();

      const result = parser.parseMessage(rawMessage);

      expect(result.messageType).toBe('MT103');
      expect(result.senderReference).toBe('ABC123456789');
      expect(result.currency).toBe('USD');
      expect(result.amount).toBe(500000.0);
      expect(result.orderingCustomer).toContain('ORDERING CUSTOMER NAME');
      expect(result.beneficiaryCustomer).toContain('BENEFICIARY CUSTOMER NAME');
    });

    it('should handle missing optional fields', () => {
      const rawMessage = `
MT103
:20:ABC123456789
:32A:251115USD500000.00
:50K:ORDERING CUSTOMER
:59:BENEFICIARY CUSTOMER
      `.trim();

      const result = parser.parseMessage(rawMessage);

      expect(result.remittanceInfo).toBe('');
      expect(result.senderToReceiverInfo).toBe('');
    });

    it('should throw error on missing required field', () => {
      const rawMessage = `
MT103
:32A:251115USD500000.00
:50K:ORDERING CUSTOMER
:59:BENEFICIARY CUSTOMER
      `.trim();

      expect(() => parser.parseMessage(rawMessage)).toThrow(
        'Required field :20: not found in SWIFT message'
      );
    });

    it('should handle comma decimal separator', () => {
      const rawMessage = `
MT103
:20:ABC123
:32A:251115EUR250000,50
:50K:ORDERING
:59:BENEFICIARY
      `.trim();

      const result = parser.parseMessage(rawMessage);

      expect(result.amount).toBe(250000.5);
      expect(result.currency).toBe('EUR');
    });
  });

  describe('matchToCapitalCall', () => {
    it('should match by exact wire reference', async () => {
      const mockCapitalCall = {
        id: 'call123',
        wireReference: 'ABC123456789',
        status: 'APPROVED',
      };

      vi.mocked(db.capitalCall.findFirst).mockResolvedValueOnce(
        mockCapitalCall as any
      );

      const swiftMessage = {
        messageType: 'MT103' as const,
        senderReference: 'ABC123456789',
        valueDate: '251115',
        currency: 'USD',
        amount: 500000,
        orderingCustomer: 'ABC Company',
        beneficiaryCustomer: 'XYZ Fund',
      };

      const result = await parser.matchToCapitalCall(swiftMessage);

      expect(result.capitalCallId).toBe('call123');
      expect(result.confidence).toBe(1.0);
      expect(result.matchedBy).toBe('reference');
    });

    it('should match by fuzzy matching with high confidence', async () => {
      // No exact reference match
      vi.mocked(db.capitalCall.findFirst).mockResolvedValueOnce(null);

      // Potential fuzzy matches
      const mockPotentialMatches = [
        {
          id: 'call456',
          fundName: 'Venture Growth Fund II',
          amountDue: { toNumber: () => 500000 },
          wireReference: null,
        },
      ];

      vi.mocked(db.capitalCall.findMany).mockResolvedValueOnce(
        mockPotentialMatches as any
      );

      const swiftMessage = {
        messageType: 'MT103' as const,
        senderReference: 'ABC123',
        valueDate: '251115',
        currency: 'USD',
        amount: 500000,
        orderingCustomer: 'ABC Company',
        beneficiaryCustomer: 'XYZ Fund',
        remittanceInfo: 'Payment for Venture Growth Fund II Capital Call',
      };

      const result = await parser.matchToCapitalCall(swiftMessage);

      expect(result.capitalCallId).toBe('call456');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.matchedBy).toBe('fuzzy');
    });

    it('should not match with low confidence', async () => {
      vi.mocked(db.capitalCall.findFirst).mockResolvedValueOnce(null);

      const mockPotentialMatches = [
        {
          id: 'call789',
          fundName: 'Different Fund Name',
          amountDue: { toNumber: () => 500000 },
          wireReference: null,
        },
      ];

      vi.mocked(db.capitalCall.findMany).mockResolvedValueOnce(
        mockPotentialMatches as any
      );

      const swiftMessage = {
        messageType: 'MT103' as const,
        senderReference: 'ABC123',
        valueDate: '251115',
        currency: 'USD',
        amount: 500000,
        orderingCustomer: 'ABC Company',
        beneficiaryCustomer: 'XYZ Fund',
        remittanceInfo: 'Some unrelated payment info',
      };

      const result = await parser.matchToCapitalCall(swiftMessage);

      expect(result.capitalCallId).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.matchedBy).toBe('none');
    });

    it('should handle amount tolerance in matching', async () => {
      vi.mocked(db.capitalCall.findFirst).mockResolvedValueOnce(null);

      const mockPotentialMatches = [
        {
          id: 'call999',
          fundName: 'Test Fund',
          amountDue: { toNumber: () => 500500 }, // Slightly different
          wireReference: null,
        },
      ];

      vi.mocked(db.capitalCall.findMany).mockResolvedValueOnce(
        mockPotentialMatches as any
      );

      const swiftMessage = {
        messageType: 'MT103' as const,
        senderReference: 'ABC123',
        valueDate: '251115',
        currency: 'USD',
        amount: 500000, // Within 1% tolerance
        orderingCustomer: 'ABC Company',
        beneficiaryCustomer: 'XYZ Fund',
        remittanceInfo: 'Test Fund payment',
      };

      const result = await parser.matchToCapitalCall(swiftMessage);

      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('String Similarity', () => {
    it('should calculate correct similarity for identical strings', () => {
      const parser = new SwiftMessageParser();
      // Access private method through any cast for testing
      const similarity = (parser as any).stringSimilarity('TEST', 'TEST');
      expect(similarity).toBe(1.0);
    });

    it('should calculate correct similarity for different strings', () => {
      const parser = new SwiftMessageParser();
      const similarity = (parser as any).stringSimilarity(
        'ABCDEF',
        'XYZXYZ'
      );
      expect(similarity).toBeLessThan(0.5);
    });

    it('should calculate correct similarity for similar strings', () => {
      const parser = new SwiftMessageParser();
      const similarity = (parser as any).stringSimilarity(
        'CAPITAL-CALL-123',
        'CAPITAL-CALL-124'
      );
      expect(similarity).toBeGreaterThan(0.9);
    });
  });
});
