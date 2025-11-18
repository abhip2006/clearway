// tests/ai/email-parser.test.ts
// Tests for Email Parsing System (AI-ADV-003)

import { describe, it, expect, beforeAll } from 'vitest';
import { EmailCapitalCallParser } from '@/lib/ai/email-parser';

describe('EmailCapitalCallParser (AI-ADV-003)', () => {
  let parser: EmailCapitalCallParser;

  beforeAll(() => {
    parser = new EmailCapitalCallParser();
  });

  describe('parseEmailForCapitalCall', () => {
    it('should detect capital call emails with complete information', async () => {
      const email = {
        subject: 'Apollo Fund XI - Capital Call Notice',
        from: 'fundadmin@apollo.com',
        body: `
          Dear Limited Partner,

          This is to notify you of a capital call for Apollo Fund XI.

          Amount Due: $250,000.00
          Due Date: December 15, 2025

          Wire Instructions:
          Bank: JPMorgan Chase Bank, N.A.
          Account: 123456789
          Routing: 021000021
          Reference: Apollo Fund XI - CC#5

          Please remit payment by the due date.

          Best regards,
          Apollo Fund Admin
        `,
        attachments: ['Capital_Call_Notice.pdf'],
      };

      const result = await parser.parseEmailForCapitalCall(email);

      expect(result.hasCapitalCall).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.extractedData?.fundName).toContain('Apollo');
      expect(result.extractedData?.amountDue).toBe(250000);
      expect(result.extractedData?.dueDate).toBeInstanceOf(Date);
      expect(result.extractedData?.wireInstructions?.bankName).toContain('JPMorgan');
      expect(result.attachmentToProcess).toBe('Capital_Call_Notice.pdf');
    }, 30000);

    it('should detect capital call emails with attachment reference', async () => {
      const email = {
        subject: 'KKR - Capital Call Notification',
        from: 'notices@kkr.com',
        body: `
          Dear Investor,

          Please see attached capital call notice for KKR Global Impact Fund.

          Wire payment by November 30, 2025.

          Thank you.
        `,
        attachments: ['KKR_Capital_Call_Nov2025.pdf', 'Wire_Instructions.pdf'],
      };

      const result = await parser.parseEmailForCapitalCall(email);

      expect(result.hasCapitalCall).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.85);
      expect(result.attachmentToProcess).toMatch(/capital.*call/i);
    }, 30000);

    it('should extract partial information from emails', async () => {
      const email = {
        subject: 'Funding Notice - Blackstone REIT VII',
        from: 'admin@blackstone.com',
        body: `
          This is a reminder that your capital contribution of $150,000 is due on January 10, 2026.

          Please contact us if you have any questions.
        `,
        attachments: [],
      };

      const result = await parser.parseEmailForCapitalCall(email);

      expect(result.hasCapitalCall).toBe(true);
      expect(result.extractedData?.amountDue).toBe(150000);
      expect(result.extractedData?.fundName).toContain('Blackstone');
    }, 30000);

    it('should not detect capital calls in non-capital-call emails', async () => {
      const email = {
        subject: 'Quarterly Report - Q3 2025',
        from: 'reports@fund.com',
        body: `
          Dear Investor,

          Please find attached your Q3 2025 quarterly report.

          The fund has performed well this quarter with a return of 5.2%.

          Thank you for your investment.
        `,
        attachments: ['Q3_2025_Report.pdf'],
      };

      const result = await parser.parseEmailForCapitalCall(email);

      expect(result.hasCapitalCall).toBe(false);
      expect(result.reasoning).toContain('quarterly report');
    }, 30000);

    it('should handle distribution notice emails correctly', async () => {
      const email = {
        subject: 'Distribution Notice - Apollo Fund XI',
        from: 'distributions@apollo.com',
        body: `
          We are pleased to announce a distribution of $50,000 from Apollo Fund XI.

          Distribution date: December 1, 2025

          Tax forms will follow.
        `,
        attachments: [],
      };

      const result = await parser.parseEmailForCapitalCall(email);

      expect(result.hasCapitalCall).toBe(false);
      expect(result.reasoning).toContain('distribution');
    }, 30000);
  });

  describe('Email Parsing Edge Cases', () => {
    it('should handle emails with multiple amounts', async () => {
      const email = {
        subject: 'Capital Call - Multiple Funds',
        from: 'admin@funds.com',
        body: `
          Capital Call Summary:
          - Fund A: $100,000
          - Fund B: $150,000
          Total: $250,000

          Due: December 15, 2025
        `,
        attachments: [],
      };

      const result = await parser.parseEmailForCapitalCall(email);

      expect(result.hasCapitalCall).toBe(true);
      // Should extract the total or flag for manual review
    }, 30000);

    it('should handle different date formats', async () => {
      const dateFormats = [
        'December 15, 2025',
        '12/15/2025',
        '15-Dec-2025',
        '2025-12-15',
        'Dec 15th, 2025',
      ];

      // All should be parseable to the same date
      const expectedDate = new Date('2025-12-15');

      for (const dateStr of dateFormats) {
        const parsed = new Date(dateStr);
        expect(parsed.toISOString().split('T')[0]).toBe('2025-12-15');
      }
    });
  });

  describe('Email Parsing Accuracy Metrics', () => {
    it('should achieve >95% confidence on clear capital call emails', async () => {
      const clearEmail = {
        subject: 'CAPITAL CALL NOTICE - Apollo Fund XI',
        from: 'admin@apollo.com',
        body: `
          CAPITAL CALL NOTICE

          Fund: Apollo Fund XI
          Amount: $250,000.00
          Due Date: December 15, 2025

          Wire to JPMorgan Chase
        `,
        attachments: ['CC_Notice.pdf'],
      };

      const result = await parser.parseEmailForCapitalCall(clearEmail);
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    }, 30000);

    it('should flag low-confidence emails for review', async () => {
      const ambiguousEmail = {
        subject: 'Funding Update',
        from: 'info@fund.com',
        body: `
          We may need additional funding soon.
          Will update you next week.
        `,
        attachments: [],
      };

      const result = await parser.parseEmailForCapitalCall(ambiguousEmail);
      expect(result.confidence).toBeLessThan(0.75);
    }, 30000);
  });
});
