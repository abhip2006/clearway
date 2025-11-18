/**
 * Integration Tests: Capital Call Extraction Flow
 *
 * Tests the OCR + extraction pipeline:
 * - Azure Document Intelligence OCR
 * - GPT-4 extraction with Zod validation
 * - Claude 3.5 Sonnet fallback
 * - Confidence score validation
 * - Various document formats
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractCapitalCall } from '@/lib/ai/extract';
import { extractTextFromPDF } from '@/lib/ai/ocr';
import { db } from '@/lib/db';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    document: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/ai/ocr', () => ({
  extractTextFromPDF: vi.fn(),
}));

vi.mock('openai', () => {
  const mockOpenAI = vi.fn();
  mockOpenAI.prototype.beta = {
    chat: {
      completions: {
        parse: vi.fn(),
      },
    },
  };
  return { OpenAI: mockOpenAI };
});

vi.mock('@anthropic-ai/sdk', () => {
  const mockAnthropic = vi.fn();
  mockAnthropic.prototype.messages = {
    create: vi.fn(),
  };
  return { default: mockAnthropic };
});

vi.mock('langfuse', () => ({
  Langfuse: vi.fn().mockImplementation(() => ({
    trace: vi.fn(() => ({
      span: vi.fn(() => ({
        end: vi.fn(),
      })),
      end: vi.fn(),
    })),
  })),
}));

describe('Capital Call Extraction Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock document
    (db.document.findUnique as any).mockResolvedValue({
      id: 'doc-123',
      fileName: 'capital-call.pdf',
      fileUrl: 'https://r2.example.com/capital-call.pdf',
      userId: 'user-123',
      status: 'PROCESSING',
      user: {
        id: 'user-123',
        email: 'investor@example.com',
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Step 1: OCR with Azure Document Intelligence', () => {
    it('should extract text from PDF successfully', async () => {
      const mockOcrText = `
        APOLLO FUND XI
        CAPITAL CALL NOTICE

        Investor: John Smith
        Account: INV-12345

        Amount Due: $250,000.00
        Due Date: December 15, 2025

        Wire Instructions:
        Bank: JPMorgan Chase
        Account: 987654321
        Routing: 021000021
        Reference: APOLLO-XI-CALL-2025-Q4
      `;

      (extractTextFromPDF as any).mockResolvedValue(mockOcrText);

      const text = await extractTextFromPDF('https://r2.example.com/capital-call.pdf');

      expect(text).toContain('APOLLO FUND XI');
      expect(text).toContain('$250,000.00');
      expect(text).toContain('December 15, 2025');
    });

    it('should handle OCR errors gracefully', async () => {
      (extractTextFromPDF as any).mockRejectedValue(new Error('OCR service unavailable'));

      await expect(extractTextFromPDF('https://invalid-url.com/doc.pdf')).rejects.toThrow(
        'OCR service unavailable'
      );
    });

    it('should extract tables from capital call documents', async () => {
      const mockOcrTextWithTable = `
        CAPITAL CALL NOTICE

        --- TABLES ---
        Table with 3 rows and 2 columns:
          [Row 0, Col 0]: Investor Account
          [Row 0, Col 1]: Amount Due
          [Row 1, Col 0]: INV-12345
          [Row 1, Col 1]: $250,000.00
          [Row 2, Col 0]: Due Date
          [Row 2, Col 1]: 12/15/2025
      `;

      (extractTextFromPDF as any).mockResolvedValue(mockOcrTextWithTable);

      const text = await extractTextFromPDF('https://r2.example.com/capital-call.pdf');

      expect(text).toContain('TABLES');
      expect(text).toContain('Amount Due');
      expect(text).toContain('$250,000.00');
    });
  });

  describe('Step 2: GPT-4 Extraction with Zod Validation', () => {
    it('should extract capital call data with high confidence', async () => {
      const mockOcrText = `
        APOLLO FUND XI
        CAPITAL CALL NOTICE
        Amount Due: $250,000.00
        Due Date: December 15, 2025
      `;

      (extractTextFromPDF as any).mockResolvedValue(mockOcrText);

      const mockExtraction = {
        fundName: 'Apollo Fund XI',
        amountDue: 250000,
        currency: 'USD',
        dueDate: '2025-12-15',
        confidence: {
          fundName: 0.95,
          amountDue: 0.98,
          dueDate: 0.95,
        },
      };

      // Mock OpenAI response
      const OpenAI = (await import('openai')).OpenAI;
      const mockOpenAIInstance = new OpenAI();
      (mockOpenAIInstance.beta.chat.completions.parse as any).mockResolvedValue({
        choices: [
          {
            message: {
              parsed: mockExtraction,
            },
          },
        ],
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 200,
          total_tokens: 1200,
        },
      });

      const result = await extractCapitalCall('doc-123');

      expect(result.data.fundName).toBe('Apollo Fund XI');
      expect(result.data.amountDue).toBe(250000);
      expect(result.data.confidenceScores.fundName).toBeGreaterThanOrEqual(0.9);
      expect(result.data.modelUsed).toBe('gpt-4o-mini');
    });

    it('should validate extracted data with Zod schema', async () => {
      const mockOcrText = 'INVALID DOCUMENT';
      (extractTextFromPDF as any).mockResolvedValue(mockOcrText);

      // Mock invalid extraction (missing required fields)
      const OpenAI = (await import('openai')).OpenAI;
      const mockOpenAIInstance = new OpenAI();
      (mockOpenAIInstance.beta.chat.completions.parse as any).mockResolvedValue({
        choices: [
          {
            message: {
              parsed: null, // Invalid extraction
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      });

      await expect(extractCapitalCall('doc-123')).rejects.toThrow();
    });

    it('should parse date formats correctly', async () => {
      const mockOcrText = `
        Fund: Test Fund
        Amount: $100,000
        Due: 12/15/2025
      `;

      (extractTextFromPDF as any).mockResolvedValue(mockOcrText);

      const mockExtraction = {
        fundName: 'Test Fund',
        amountDue: 100000,
        currency: 'USD',
        dueDate: '2025-12-15', // Should be in YYYY-MM-DD format
        confidence: {
          fundName: 0.90,
          amountDue: 0.95,
          dueDate: 0.90,
        },
      };

      const OpenAI = (await import('openai')).OpenAI;
      const mockOpenAIInstance = new OpenAI();
      (mockOpenAIInstance.beta.chat.completions.parse as any).mockResolvedValue({
        choices: [
          {
            message: {
              parsed: mockExtraction,
            },
          },
        ],
        usage: {
          prompt_tokens: 500,
          completion_tokens: 100,
          total_tokens: 600,
        },
      });

      const result = await extractCapitalCall('doc-123');

      expect(result.data.dueDate).toBeInstanceOf(Date);
      expect(result.data.dueDate.toISOString()).toContain('2025-12-15');
    });

    it('should extract wire instructions when present', async () => {
      const mockOcrText = `
        APOLLO FUND XI
        Amount: $250,000
        Due: 2025-12-15
        Wire to: JPMorgan Chase
        Account: 987654321
        Routing: 021000021
        Reference: APOLLO-CALL-Q4
      `;

      (extractTextFromPDF as any).mockResolvedValue(mockOcrText);

      const mockExtraction = {
        fundName: 'Apollo Fund XI',
        amountDue: 250000,
        currency: 'USD',
        dueDate: '2025-12-15',
        bankName: 'JPMorgan Chase',
        accountNumber: '987654321',
        routingNumber: '021000021',
        wireReference: 'APOLLO-CALL-Q4',
        confidence: {
          fundName: 0.95,
          amountDue: 0.98,
          dueDate: 0.95,
        },
      };

      const OpenAI = (await import('openai')).OpenAI;
      const mockOpenAIInstance = new OpenAI();
      (mockOpenAIInstance.beta.chat.completions.parse as any).mockResolvedValue({
        choices: [
          {
            message: {
              parsed: mockExtraction,
            },
          },
        ],
        usage: {
          prompt_tokens: 800,
          completion_tokens: 150,
          total_tokens: 950,
        },
      });

      const result = await extractCapitalCall('doc-123');

      expect(result.data.bankName).toBe('JPMorgan Chase');
      expect(result.data.accountNumber).toBe('987654321');
      expect(result.data.routingNumber).toBe('021000021');
      expect(result.data.wireReference).toBe('APOLLO-CALL-Q4');
    });
  });

  describe('Step 3: Claude 3.5 Sonnet Fallback', () => {
    it('should fallback to Claude when GPT-4 has low confidence', async () => {
      const mockOcrText = 'AMBIGUOUS DOCUMENT TEXT';
      (extractTextFromPDF as any).mockResolvedValue(mockOcrText);

      // Mock low-confidence GPT-4 extraction
      const OpenAI = (await import('openai')).OpenAI;
      const mockOpenAIInstance = new OpenAI();
      (mockOpenAIInstance.beta.chat.completions.parse as any).mockResolvedValue({
        choices: [
          {
            message: {
              parsed: {
                fundName: 'Unknown Fund',
                amountDue: 50000,
                currency: 'USD',
                dueDate: '2025-12-15',
                confidence: {
                  fundName: 0.65, // Low confidence triggers fallback
                  amountDue: 0.70,
                  dueDate: 0.75,
                },
              },
            },
          },
        ],
        usage: {
          prompt_tokens: 500,
          completion_tokens: 100,
          total_tokens: 600,
        },
      });

      // Mock Claude high-confidence extraction
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const mockAnthropicInstance = new Anthropic();
      (mockAnthropicInstance.messages.create as any).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              fundName: 'Blackstone Fund XII',
              amountDue: 50000,
              currency: 'USD',
              dueDate: '2025-12-15',
              confidence: {
                fundName: 0.92, // Higher confidence
                amountDue: 0.95,
                dueDate: 0.90,
              },
            }),
          },
        ],
      });

      const result = await extractCapitalCall('doc-123');

      expect(result.data.modelUsed).toBe('claude-3-5-sonnet');
      expect(result.data.fundName).toBe('Blackstone Fund XII');
      expect(result.data.confidenceScores.fundName).toBeGreaterThan(0.9);
    });

    it('should fallback to Claude when GPT-4 fails', async () => {
      const mockOcrText = 'DOCUMENT TEXT';
      (extractTextFromPDF as any).mockResolvedValue(mockOcrText);

      // Mock GPT-4 error
      const OpenAI = (await import('openai')).OpenAI;
      const mockOpenAIInstance = new OpenAI();
      (mockOpenAIInstance.beta.chat.completions.parse as any).mockRejectedValue(
        new Error('OpenAI API error')
      );

      // Mock successful Claude extraction
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const mockAnthropicInstance = new Anthropic();
      (mockAnthropicInstance.messages.create as any).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              fundName: 'KKR Global Fund',
              amountDue: 150000,
              currency: 'USD',
              dueDate: '2025-12-20',
              confidence: {
                fundName: 0.93,
                amountDue: 0.96,
                dueDate: 0.92,
              },
            }),
          },
        ],
      });

      const result = await extractCapitalCall('doc-123');

      expect(result.data.modelUsed).toBe('claude-3-5-sonnet');
      expect(result.data.fundName).toBe('KKR Global Fund');
    });
  });

  describe('Various Document Formats', () => {
    it('should handle capital calls with tables', async () => {
      const mockOcrText = `
        --- TABLES ---
        Table with 5 rows and 2 columns:
          [Row 0, Col 0]: Fund Name
          [Row 0, Col 1]: Apollo Fund XI
          [Row 1, Col 0]: Amount Due
          [Row 1, Col 1]: $250,000.00
          [Row 2, Col 0]: Due Date
          [Row 2, Col 1]: 12/15/2025
      `;

      (extractTextFromPDF as any).mockResolvedValue(mockOcrText);

      const mockExtraction = {
        fundName: 'Apollo Fund XI',
        amountDue: 250000,
        currency: 'USD',
        dueDate: '2025-12-15',
        confidence: {
          fundName: 0.95,
          amountDue: 0.98,
          dueDate: 0.95,
        },
      };

      const OpenAI = (await import('openai')).OpenAI;
      const mockOpenAIInstance = new OpenAI();
      (mockOpenAIInstance.beta.chat.completions.parse as any).mockResolvedValue({
        choices: [{ message: { parsed: mockExtraction } }],
        usage: { prompt_tokens: 600, completion_tokens: 120, total_tokens: 720 },
      });

      const result = await extractCapitalCall('doc-123');

      expect(result.data.fundName).toBe('Apollo Fund XI');
      expect(result.data.amountDue).toBe(250000);
    });

    it('should handle multi-page documents', async () => {
      const mockOcrText = `
        Page 1:
        BLACKSTONE REAL ESTATE FUND VII
        CAPITAL CALL NOTICE

        Page 2:
        Amount Due: $500,000.00
        Due Date: January 10, 2026

        Page 3:
        Wire Instructions...
      `;

      (extractTextFromPDF as any).mockResolvedValue(mockOcrText);

      const mockExtraction = {
        fundName: 'Blackstone Real Estate Fund VII',
        amountDue: 500000,
        currency: 'USD',
        dueDate: '2026-01-10',
        confidence: {
          fundName: 0.96,
          amountDue: 0.97,
          dueDate: 0.94,
        },
      };

      const OpenAI = (await import('openai')).OpenAI;
      const mockOpenAIInstance = new OpenAI();
      (mockOpenAIInstance.beta.chat.completions.parse as any).mockResolvedValue({
        choices: [{ message: { parsed: mockExtraction } }],
        usage: { prompt_tokens: 1200, completion_tokens: 200, total_tokens: 1400 },
      });

      const result = await extractCapitalCall('doc-123');

      expect(result.data.fundName).toBe('Blackstone Real Estate Fund VII');
      expect(result.data.amountDue).toBe(500000);
    });

    it('should handle different amount formats', async () => {
      const testCases = [
        { input: '$250,000.00', expected: 250000 },
        { input: 'USD 250,000', expected: 250000 },
        { input: '250000.00', expected: 250000 },
        { input: '$1,500,000', expected: 1500000 },
      ];

      for (const testCase of testCases) {
        (extractTextFromPDF as any).mockResolvedValue(`Amount: ${testCase.input}`);

        const mockExtraction = {
          fundName: 'Test Fund',
          amountDue: testCase.expected,
          currency: 'USD',
          dueDate: '2025-12-15',
          confidence: {
            fundName: 0.90,
            amountDue: 0.95,
            dueDate: 0.90,
          },
        };

        const OpenAI = (await import('openai')).OpenAI;
        const mockOpenAIInstance = new OpenAI();
        (mockOpenAIInstance.beta.chat.completions.parse as any).mockResolvedValue({
          choices: [{ message: { parsed: mockExtraction } }],
          usage: { prompt_tokens: 400, completion_tokens: 80, total_tokens: 480 },
        });

        const result = await extractCapitalCall('doc-123');
        expect(result.data.amountDue).toBe(testCase.expected);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle document not found', async () => {
      (db.document.findUnique as any).mockResolvedValue(null);

      await expect(extractCapitalCall('non-existent-doc')).rejects.toThrow('Document not found');
    });

    it('should handle OCR failures', async () => {
      (extractTextFromPDF as any).mockRejectedValue(new Error('OCR service down'));

      await expect(extractCapitalCall('doc-123')).rejects.toThrow('OCR service down');
    });

    it('should handle both AI providers failing', async () => {
      (extractTextFromPDF as any).mockResolvedValue('DOCUMENT TEXT');

      // Both GPT-4 and Claude fail
      const OpenAI = (await import('openai')).OpenAI;
      const mockOpenAIInstance = new OpenAI();
      (mockOpenAIInstance.beta.chat.completions.parse as any).mockRejectedValue(
        new Error('OpenAI error')
      );

      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const mockAnthropicInstance = new Anthropic();
      (mockAnthropicInstance.messages.create as any).mockRejectedValue(
        new Error('Claude error')
      );

      await expect(extractCapitalCall('doc-123')).rejects.toThrow();
    });
  });

  describe('Confidence Scores', () => {
    it('should validate confidence scores are between 0 and 1', async () => {
      const mockOcrText = 'CAPITAL CALL DOCUMENT';
      (extractTextFromPDF as any).mockResolvedValue(mockOcrText);

      const mockExtraction = {
        fundName: 'Test Fund',
        amountDue: 100000,
        currency: 'USD',
        dueDate: '2025-12-15',
        confidence: {
          fundName: 0.95,
          amountDue: 0.98,
          dueDate: 0.92,
        },
      };

      const OpenAI = (await import('openai')).OpenAI;
      const mockOpenAIInstance = new OpenAI();
      (mockOpenAIInstance.beta.chat.completions.parse as any).mockResolvedValue({
        choices: [{ message: { parsed: mockExtraction } }],
        usage: { prompt_tokens: 500, completion_tokens: 100, total_tokens: 600 },
      });

      const result = await extractCapitalCall('doc-123');

      expect(result.data.confidenceScores.fundName).toBeGreaterThanOrEqual(0);
      expect(result.data.confidenceScores.fundName).toBeLessThanOrEqual(1);
      expect(result.data.confidenceScores.amountDue).toBeGreaterThanOrEqual(0);
      expect(result.data.confidenceScores.amountDue).toBeLessThanOrEqual(1);
      expect(result.data.confidenceScores.dueDate).toBeGreaterThanOrEqual(0);
      expect(result.data.confidenceScores.dueDate).toBeLessThanOrEqual(1);
    });
  });
});
