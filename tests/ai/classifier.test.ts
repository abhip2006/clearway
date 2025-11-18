// tests/ai/classifier.test.ts
// Tests for Document Classification Engine (AI-ADV-001)

import { describe, it, expect, beforeAll } from 'vitest';
import { DocumentClassifier, DocumentType } from '@/lib/ai/classifier';

describe('DocumentClassifier (AI-ADV-001)', () => {
  let classifier: DocumentClassifier;

  beforeAll(() => {
    classifier = new DocumentClassifier();
  });

  describe('classifyDocument', () => {
    it('should classify capital call documents with high confidence', async () => {
      const capitalCallText = `
        APOLLO FUND XI
        CAPITAL CALL NOTICE

        Date: November 15, 2025
        Capital Call No: 5

        Dear Limited Partner,

        This letter serves as notice that Apollo Fund XI, L.P. is making a capital call to fund new investments.

        Amount Due: $250,000.00
        Due Date: December 15, 2025

        Wire Instructions:
        Bank Name: JPMorgan Chase Bank, N.A.
        Account Number: 123456789
        Routing Number: 021000021
        Wire Reference: Apollo Fund XI - Capital Call #5

        Please remit payment by the due date.
      `;

      const result = await classifier.classifyDocument(capitalCallText);

      expect(result.type).toBe(DocumentType.CAPITAL_CALL);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.reasoning).toContain('capital call');
      expect(result.suggestedActions).toContain('Extract capital call details');
    }, 30000); // 30s timeout for API call

    it('should classify distribution notices correctly', async () => {
      const distributionText = `
        KKR GLOBAL IMPACT FUND
        DISTRIBUTION NOTICE

        Date: October 1, 2025

        Dear Investor,

        We are pleased to announce a distribution from KKR Global Impact Fund.

        Distribution Amount: $50,000.00
        Distribution Date: November 1, 2025

        This distribution consists of:
        - Return of Capital: $30,000
        - Capital Gains: $20,000

        Tax information will be provided separately.
      `;

      const result = await classifier.classifyDocument(distributionText);

      expect(result.type).toBe(DocumentType.DISTRIBUTION_NOTICE);
      expect(result.confidence).toBeGreaterThan(0.85);
    }, 30000);

    it('should classify K-1 tax forms correctly', async () => {
      const k1Text = `
        SCHEDULE K-1 (Form 1065)
        Partner's Share of Income, Deductions, Credits, etc.

        For calendar year 2024

        Partnership: BLACKSTONE REAL ESTATE FUND VII L.P.
        EIN: 12-3456789

        Partner's Information:
        Name: John Doe
        SSN: XXX-XX-XXXX

        Part III - Partner's Share of Current Year Income, Deductions, Credits
        1. Ordinary business income (loss): $15,000
        2. Net rental real estate income (loss): $25,000
      `;

      const result = await classifier.classifyDocument(k1Text);

      expect(result.type).toBe(DocumentType.K1_TAX_FORM);
      expect(result.confidence).toBeGreaterThan(0.90);
    }, 30000);

    it('should classify quarterly reports correctly', async () => {
      const quarterlyText = `
        CARLYLE PARTNERS VII
        QUARTERLY REPORT

        For the Quarter Ended September 30, 2025

        Portfolio Performance Summary:
        - Net Asset Value: $1.2 billion
        - Quarterly Return: 4.5%
        - Year-to-Date Return: 12.3%

        Portfolio Companies (Top 5):
        1. Company A - $250M
        2. Company B - $180M
        3. Company C - $150M
      `;

      const result = await classifier.classifyDocument(quarterlyText);

      expect(result.type).toBe(DocumentType.QUARTERLY_REPORT);
      expect(result.confidence).toBeGreaterThan(0.85);
    }, 30000);

    it('should handle low-confidence classifications', async () => {
      const ambiguousText = `
        Dear Investor,

        Thank you for your continued support.

        Best regards,
        Fund Manager
      `;

      const result = await classifier.classifyDocument(ambiguousText);

      expect(result.confidence).toBeLessThan(0.75);
      expect(result.type).toBe(DocumentType.OTHER);
    }, 30000);
  });

  describe('Document Type Coverage', () => {
    it('should support all 8 document types', () => {
      const types = Object.values(DocumentType);
      expect(types).toHaveLength(8);
      expect(types).toContain(DocumentType.CAPITAL_CALL);
      expect(types).toContain(DocumentType.DISTRIBUTION_NOTICE);
      expect(types).toContain(DocumentType.K1_TAX_FORM);
      expect(types).toContain(DocumentType.QUARTERLY_REPORT);
      expect(types).toContain(DocumentType.ANNUAL_REPORT);
      expect(types).toContain(DocumentType.SUBSCRIPTION_AGREEMENT);
      expect(types).toContain(DocumentType.AMENDMENT);
      expect(types).toContain(DocumentType.OTHER);
    });
  });
});
