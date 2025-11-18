/**
 * Integration Tests: SWIFT MT103 Parser
 *
 * Tests parsing of SWIFT MT103 payment messages
 * to extract payment information for automatic matching.
 */

import { describe, it, expect } from 'vitest';

describe('SWIFT MT103 Parser Integration Tests', () => {
  describe('Basic Parsing', () => {
    it('should parse valid SWIFT MT103 message', () => {
      const swiftMessage = `
{1:F01CHASUS33AXXX0000000000}{2:I103CITIGB2LXXXXN}{3:{108:MT103}}{4:
:20:TRANSACTION123
:23B:CRED
:32A:251215USD250000,00
:50K:/987654321
APOLLO MANAGEMENT LP
100 MAIN STREET
NEW YORK, NY 10001
:59:/123456789
INVESTOR NAME
200 WALL STREET
NEW YORK, NY 10005
:70:APOLLO FUND XI CAPITAL CALL Q4 2025
:71A:BEN
-}
      `.trim();

      const parsed = parseSWIFTMT103(swiftMessage);

      expect(parsed).toBeDefined();
      expect(parsed.transactionReference).toBe('TRANSACTION123');
      expect(parsed.amount).toBe(250000);
      expect(parsed.currency).toBe('USD');
      expect(parsed.valueDate).toBe('2025-12-15');
      expect(parsed.reference).toContain('APOLLO FUND XI');
      expect(parsed.reference).toContain('Q4 2025');
    });

    it('should extract sender information', () => {
      const swiftMessage = `
{1:F01CHASUS33AXXX0000000000}{2:I103CITIGB2LXXXXN}{4:
:20:TXN456
:32A:251215USD100000,00
:50K:/987654321
SENDER BANK
SENDER ADDRESS
:59:/123456789
BENEFICIARY
:70:PAYMENT REFERENCE
-}
      `.trim();

      const parsed = parseSWIFTMT103(swiftMessage);

      expect(parsed.senderAccount).toBe('/987654321');
      expect(parsed.senderName).toContain('SENDER BANK');
    });

    it('should extract beneficiary information', () => {
      const swiftMessage = `
{1:F01CHASUS33AXXX0000000000}{2:I103CITIGB2LXXXXN}{4:
:20:TXN789
:32A:251215USD100000,00
:50K:/987654321
SENDER
:59:/123456789
BENEFICIARY FUND
123 FUND STREET
:70:REFERENCE
-}
      `.trim();

      const parsed = parseSWIFTMT103(swiftMessage);

      expect(parsed.beneficiaryAccount).toBe('/123456789');
      expect(parsed.beneficiaryName).toContain('BENEFICIARY FUND');
    });
  });

  describe('Amount Parsing', () => {
    it('should parse amount with comma separator', () => {
      const swiftMessage = `:32A:251215USD1,500,000.00`;
      const parsed = parseField32A(swiftMessage);

      expect(parsed.amount).toBe(1500000);
      expect(parsed.currency).toBe('USD');
    });

    it('should parse amount with period separator', () => {
      const swiftMessage = `:32A:251215EUR500000.00`;
      const parsed = parseField32A(swiftMessage);

      expect(parsed.amount).toBe(500000);
      expect(parsed.currency).toBe('EUR');
    });

    it('should parse amount without decimals', () => {
      const swiftMessage = `:32A:251215GBP250000`;
      const parsed = parseField32A(swiftMessage);

      expect(parsed.amount).toBe(250000);
      expect(parsed.currency).toBe('GBP');
    });

    it('should handle various amount formats', () => {
      const testCases = [
        { input: ':32A:251215USD250000,00', expected: 250000 },
        { input: ':32A:251215USD250000.00', expected: 250000 },
        { input: ':32A:251215USD250000', expected: 250000 },
        { input: ':32A:251215USD2,500,000.00', expected: 2500000 },
        { input: ':32A:251215USD25.50', expected: 25.5 },
      ];

      testCases.forEach((testCase) => {
        const parsed = parseField32A(testCase.input);
        expect(parsed.amount).toBe(testCase.expected);
      });
    });
  });

  describe('Date Parsing', () => {
    it('should parse YYMMDD date format', () => {
      const swiftMessage = `:32A:251215USD100000,00`;
      const parsed = parseField32A(swiftMessage);

      expect(parsed.valueDate).toBe('2025-12-15');
    });

    it('should handle dates in 2020s', () => {
      const testCases = [
        { input: ':32A:250101USD100000', expected: '2025-01-01' },
        { input: ':32A:251231USD100000', expected: '2025-12-31' },
        { input: ':32A:260630USD100000', expected: '2026-06-30' },
      ];

      testCases.forEach((testCase) => {
        const parsed = parseField32A(testCase.input);
        expect(parsed.valueDate).toBe(testCase.expected);
      });
    });
  });

  describe('Reference Extraction (Field 70)', () => {
    it('should extract payment reference from field 70', () => {
      const swiftMessage = `
{4:
:20:TXN123
:32A:251215USD100000,00
:70:APOLLO FUND XI CAPITAL CALL
:70:INVESTOR ACCOUNT 12345
:70:DUE DATE 12/15/2025
-}
      `.trim();

      const parsed = parseSWIFTMT103(swiftMessage);

      expect(parsed.reference).toContain('APOLLO FUND XI');
      expect(parsed.reference).toContain('12345');
    });

    it('should handle multi-line references', () => {
      const swiftMessage = `
{4:
:20:TXN123
:32A:251215USD100000,00
:70:LINE 1 OF REFERENCE
:70:LINE 2 OF REFERENCE
:70:LINE 3 OF REFERENCE
-}
      `.trim();

      const parsed = parseSWIFTMT103(swiftMessage);

      expect(parsed.reference).toContain('LINE 1');
      expect(parsed.reference).toContain('LINE 2');
      expect(parsed.reference).toContain('LINE 3');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid SWIFT message format', () => {
      const invalidMessage = 'INVALID SWIFT MESSAGE';

      expect(() => parseSWIFTMT103(invalidMessage)).toThrow();
    });

    it('should handle missing required fields', () => {
      const incompleteMessage = `
{4:
:20:TXN123
-}
      `.trim();

      expect(() => parseSWIFTMT103(incompleteMessage)).toThrow();
    });

    it('should handle malformed amount field', () => {
      const swiftMessage = `:32A:251215USDNOTANUMBER`;

      expect(() => parseField32A(swiftMessage)).toThrow();
    });

    it('should handle invalid currency code', () => {
      const swiftMessage = `:32A:251215XXX100000,00`;

      expect(() => parseField32A(swiftMessage)).toThrow();
    });
  });

  describe('Real-world Examples', () => {
    it('should parse Citibank SWIFT message', () => {
      const swiftMessage = `
{1:F01CITIUS33AXXX0000000000}{2:I103CHASUS33XXXXN}{3:{108:MT103}}{4:
:20:CITI2025121500001
:23B:CRED
:32A:251215USD250000,00
:50K:/1234567890
CITIBANK NA
399 PARK AVENUE
NEW YORK NY 10043
:52A:CITIUS33
:59:/9876543210
APOLLO MANAGEMENT LP
:70:APOLLO FUND XI Q4 2025
:70:CAPITAL CALL
:70:WIRE REFERENCE APOLLO-Q4-2025
:71A:BEN
:72:/BNF/INVESTMENT
-}
      `.trim();

      const parsed = parseSWIFTMT103(swiftMessage);

      expect(parsed.transactionReference).toBe('CITI2025121500001');
      expect(parsed.amount).toBe(250000);
      expect(parsed.currency).toBe('USD');
      expect(parsed.reference).toContain('APOLLO FUND XI');
      expect(parsed.reference).toContain('CAPITAL CALL');
    });

    it('should parse JPMorgan SWIFT message', () => {
      const swiftMessage = `
{1:F01CHASUS33AXXX0000000000}{2:I103CITIGB2LXXXXN}{3:{108:MT103}}{4:
:20:JPM2025121500002
:23B:CRED
:32A:251215USD500000,00
:50K:/ACCOUNT123
JPMORGAN CHASE BANK
270 PARK AVENUE
NEW YORK NY 10017
:59:/BENEFICIARY456
BLACKSTONE GROUP LP
:70:BLACKSTONE REAL ESTATE FUND VII
:70:Q4 2025 CAPITAL CALL
:71A:OUR
-}
      `.trim();

      const parsed = parseSWIFTMT103(swiftMessage);

      expect(parsed.amount).toBe(500000);
      expect(parsed.reference).toContain('BLACKSTONE');
      expect(parsed.reference).toContain('REAL ESTATE FUND VII');
    });
  });

  describe('Currency Support', () => {
    it('should support multiple currencies', () => {
      const currencies = ['USD', 'EUR', 'GBP', 'CHF', 'JPY'];

      currencies.forEach((currency) => {
        const swiftMessage = `:32A:251215${currency}100000,00`;
        const parsed = parseField32A(swiftMessage);

        expect(parsed.currency).toBe(currency);
        expect(parsed.amount).toBe(100000);
      });
    });
  });

  describe('Integration with Payment Matching', () => {
    it('should extract data suitable for payment matching', () => {
      const swiftMessage = `
{4:
:20:MATCH123
:32A:251215USD250000,00
:70:APOLLO FUND XI CAPITAL CALL Q4
-}
      `.trim();

      const parsed = parseSWIFTMT103(swiftMessage);

      // Data should be ready for matching
      expect(parsed.amount).toBeTypeOf('number');
      expect(parsed.valueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(parsed.reference).toBeTruthy();
      expect(parsed.currency).toBe('USD');
    });
  });
});

// Mock parser functions (would be implemented in actual code)
function parseSWIFTMT103(message: string) {
  if (!message.includes(':20:') || !message.includes(':32A:')) {
    throw new Error('Invalid SWIFT MT103 message');
  }

  // Extract transaction reference (Field 20)
  const field20Match = message.match(/:20:([^\n:]+)/);
  const transactionReference = field20Match ? field20Match[1].trim() : '';

  // Extract value date, currency, and amount (Field 32A)
  const field32AMatch = message.match(/:32A:([^\n:]+)/);
  if (!field32AMatch) {
    throw new Error('Missing required field 32A');
  }

  const field32A = parseField32A(field32AMatch[0]);

  // Extract sender (Field 50K)
  const field50Match = message.match(/:50K:([^:]+?)(?=:\d{2}[A-Z]:|$)/s);
  const senderLines = field50Match ? field50Match[1].trim().split('\n') : [];
  const senderAccount = senderLines[0] || '';
  const senderName = senderLines.slice(1).join(' ').trim();

  // Extract beneficiary (Field 59)
  const field59Match = message.match(/:59:([^:]+?)(?=:\d{2}[A-Z]:|$)/s);
  const beneficiaryLines = field59Match ? field59Match[1].trim().split('\n') : [];
  const beneficiaryAccount = beneficiaryLines[0] || '';
  const beneficiaryName = beneficiaryLines.slice(1).join(' ').trim();

  // Extract reference (Field 70)
  const field70Matches = message.match(/:70:([^\n:]+)/g);
  const reference = field70Matches
    ? field70Matches.map((m) => m.replace(':70:', '')).join(' ')
    : '';

  return {
    transactionReference,
    amount: field32A.amount,
    currency: field32A.currency,
    valueDate: field32A.valueDate,
    senderAccount,
    senderName,
    beneficiaryAccount,
    beneficiaryName,
    reference: reference.trim(),
  };
}

function parseField32A(field: string) {
  const match = field.match(/:32A:(\d{6})([A-Z]{3})([0-9,\.]+)/);

  if (!match) {
    throw new Error('Invalid field 32A format');
  }

  const [, dateStr, currency, amountStr] = match;

  // Validate currency
  const validCurrencies = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD'];
  if (!validCurrencies.includes(currency)) {
    throw new Error(`Invalid currency: ${currency}`);
  }

  // Parse date (YYMMDD -> YYYY-MM-DD)
  const year = '20' + dateStr.substring(0, 2);
  const month = dateStr.substring(2, 4);
  const day = dateStr.substring(4, 6);
  const valueDate = `${year}-${month}-${day}`;

  // Parse amount (remove commas, handle decimals)
  const amount = parseFloat(amountStr.replace(/,/g, ''));

  if (isNaN(amount)) {
    throw new Error(`Invalid amount: ${amountStr}`);
  }

  return {
    valueDate,
    currency,
    amount,
  };
}
