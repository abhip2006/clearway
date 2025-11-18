// lib/ai/extract.ts
// Task AI-002: Capital Call Extraction Function with GPT-4, Zod, and Langfuse
// Task AI-004: Prompt optimization with few-shot examples and Chain of Thought
// Task AI-005: Claude 3.5 Sonnet fallback for low confidence

import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { extractTextFromPDF } from './ocr';
import { db } from '../db';
import { Langfuse } from 'langfuse';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
});

// Define extraction schema with Zod
export const CapitalCallExtractionSchema = z.object({
  fundName: z.string().describe('Full name of the fund (e.g., "Apollo Fund XI")'),
  investorEmail: z.string().email().optional().describe('Investor email address if present'),
  investorAccount: z.string().optional().describe('Investor account number or ID'),
  amountDue: z.number().describe('Amount due in USD (numeric only, no $ or commas)'),
  currency: z.string().length(3).default('USD').describe('3-letter currency code'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Due date in YYYY-MM-DD format'),
  bankName: z.string().optional().describe('Bank name for wire transfer'),
  accountNumber: z.string().optional().describe('Bank account number'),
  routingNumber: z.string().optional().describe('Bank routing number'),
  wireReference: z.string().optional().describe('Wire reference or memo'),
  confidence: z.object({
    fundName: z.number().min(0).max(1),
    amountDue: z.number().min(0).max(1),
    dueDate: z.number().min(0).max(1),
  }).describe('Confidence scores (0-1) for critical fields'),
});

export type CapitalCallExtraction = z.infer<typeof CapitalCallExtractionSchema>;

// Few-shot examples for improved accuracy (Task AI-004)
const FEW_SHOT_EXAMPLES = `
**Example 1:**
Input: "APOLLO FUND XI CAPITAL CALL - Amount Due: $250,000.00 - Due Date: December 15, 2025"
Output: { "fundName": "Apollo Fund XI", "amountDue": 250000, "dueDate": "2025-12-15", "confidence": { "fundName": 0.95, "amountDue": 0.98, "dueDate": 0.95 } }

**Example 2:**
Input: "KKR Global Impact Fund / Investor: ABC Wealth / Call Amount: USD 150,000 / Payment Deadline: 1/10/2026"
Output: { "fundName": "KKR Global Impact Fund", "amountDue": 150000, "dueDate": "2026-01-10", "confidence": { "fundName": 0.92, "amountDue": 0.95, "dueDate": 0.90 } }

**Example 3:**
Input: "Blackstone Real Estate Fund VII - Capital Call Notice - Wire $500,000.00 by 03/25/2026 to JPMorgan Chase Account #12345678"
Output: { "fundName": "Blackstone Real Estate Fund VII", "amountDue": 500000, "dueDate": "2026-03-25", "bankName": "JPMorgan Chase", "accountNumber": "12345678", "confidence": { "fundName": 0.98, "amountDue": 0.99, "dueDate": 0.97 } }
`;

// System prompt with Chain of Thought (Task AI-004)
const EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting structured data from capital call documents.

A capital call is a request from a fund (like a private equity or venture capital fund) asking an investor to send money.

**REASONING PROCESS (Chain of Thought):**
Before extracting, reason through these steps:
1. Identify the document type (is this definitely a capital call?)
2. Locate the fund name (where in the document? what section?)
3. Find the amount due (what section? what format?)
4. Find the due date (where mentioned? what format?)
5. Locate wire instructions (if present)
6. Assess confidence for each field based on how explicitly it's stated

Extract the following information with high accuracy:

**Critical Fields (must have high confidence)**:
1. Fund Name - The full official name of the fund (e.g., "Apollo Fund XI", "Blackstone Real Estate Fund VII")
   - Often appears in the header or title
   - May include Roman numerals (XI, XII) or years (2019, 2020)
   - Common fund families: Apollo, Blackstone, KKR, Carlyle, TPG, Warburg Pincus
   - Preserve proper capitalization (Title Case, not ALL CAPS)

2. Amount Due - The total amount the investor must pay in USD
   - Look for: "Capital Call Amount", "Amount Due", "Total Capital Called"
   - Extract numeric value only (no $, no commas)
   - If you see "$250,000.00", extract as 250000
   - Remove all $ symbols and commas from the number

3. Due Date - When the payment is due
   - Look for: "Due Date", "Payment Due", "Deadline", "Wire By"
   - Format as YYYY-MM-DD (always use this format)
   - If you see "December 15, 2025", format as "2025-12-15"
   - If you see "12/15/25", interpret as "2025-12-15"
   - If you see "15-Dec-2025", format as "2025-12-15"

**Wire Instructions (important but may be missing)**:
4. Bank Name - Where to send the wire (e.g., "JPMorgan Chase", "Bank of America")
5. Account Number - Bank account to send to
6. Routing Number - 9-digit US routing number (also called ABA number)
7. Wire Reference - Reference number or memo to include with wire

**Investor Information (helpful if present)**:
8. Investor Email - Email address of the investor
9. Investor Account - Investor's account number with the fund

**Confidence Scores**:
For fundName, amountDue, and dueDate, provide a confidence score from 0 to 1:
- 1.0 = Completely certain, field explicitly labeled and clear
- 0.9 = Very confident, found in expected location with clear labeling
- 0.8 = Confident, field present but formatting unclear
- 0.7 = Moderately confident, inferred from context
- 0.6 = Somewhat confident, found but ambiguous
- 0.5 = Low confidence, best guess
- < 0.5 = Should flag for human review

**Important Rules**:
- If a field is not found, omit it or use null (not an empty string)
- Do NOT make up data - only extract what is explicitly stated
- For amounts, do NOT include $ or commas - numeric value only
- For dates, always use YYYY-MM-DD format regardless of input format
- Be conservative with confidence scores - better to flag for review than guess wrong
- Fund names: Preserve proper capitalization (Title Case), not ALL CAPS
- If wire instructions section is incomplete or missing, note this reduces confidence
- If multiple amounts are present, extract the "Total Capital Called" or "Amount Due"

**Common Patterns**:
- Capital call documents often have a table with investor details
- Wire instructions are usually in a dedicated section or box
- Amounts may be formatted as "$250,000.00" or "USD 250,000" or "250000.00"
- Dates may be written as "12/15/2025" or "December 15, 2025" or "15-Dec-2025"
- Fund names often appear in ALL CAPS in the document - convert to Title Case

${FEW_SHOT_EXAMPLES}
`;

/**
 * Extract capital call data using Claude 3.5 Sonnet (fallback or high-accuracy mode)
 * Task AI-005: Claude 3.5 Sonnet fallback implementation
 */
async function extractWithClaude(ocrText: string): Promise<CapitalCallExtraction> {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: `${EXTRACTION_SYSTEM_PROMPT}

Extract capital call data from this document and return ONLY a JSON object with the extracted data.

Document text:
${ocrText.slice(0, 15000)}`,
      },
    ],
  });

  // Parse JSON from response
  const content = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  const extraction = JSON.parse(jsonMatch[0]);
  return CapitalCallExtractionSchema.parse(extraction);
}

/**
 * Main extraction function with GPT-4 and Claude fallback
 * Task AI-002: GPT-4 extraction with Langfuse tracing
 * Task AI-005: Claude fallback for low confidence
 *
 * @param documentId - ID of the document to extract from
 * @returns Extracted capital call data with confidence scores
 */
export async function extractCapitalCall(documentId: string) {
  // Start Langfuse trace
  const trace = langfuse.trace({
    name: 'capital-call-extraction',
    metadata: { documentId },
  });

  try {
    // Get document
    const document = await db.document.findUnique({
      where: { id: documentId },
      include: { user: true },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Step 1: OCR
    const ocrSpan = trace.span({
      name: 'ocr-extraction',
      input: { fileUrl: document.fileUrl },
    });

    const ocrText = await extractTextFromPDF(document.fileUrl);

    ocrSpan.end({
      output: { textLength: ocrText.length },
    });

    // Step 2: Extract with GPT-4 (try first) or Claude (fallback)
    let extraction: CapitalCallExtraction;
    let model = 'gpt-4o-mini';
    let tokensUsed = 0;
    let cost = 0;

    try {
      const extractionSpan = trace.span({
        name: 'gpt4-extraction',
        input: { textLength: ocrText.length },
      });

      const completion = await openai.beta.chat.completions.parse({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: EXTRACTION_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: `Extract capital call data from this document:\n\n${ocrText.slice(0, 15000)}`, // Limit to ~15k chars
          },
        ],
        response_format: zodResponseFormat(CapitalCallExtractionSchema, 'capital_call'),
        temperature: 0, // Deterministic
      });

      extraction = completion.choices[0].message.parsed!;

      if (!extraction) {
        throw new Error('Failed to extract data from document');
      }

      tokensUsed = completion.usage?.total_tokens || 0;

      // Calculate cost for GPT-4o-mini
      cost = (
        (completion.usage?.prompt_tokens || 0) * 0.15 / 1_000_000 +
        (completion.usage?.completion_tokens || 0) * 0.60 / 1_000_000
      );

      extractionSpan.end({
        output: extraction,
        metadata: {
          tokensUsed,
          model: 'gpt-4o-mini',
          cost,
        },
      });

      // Task AI-005: If low confidence, retry with Claude
      if (
        extraction.confidence.fundName < 0.8 ||
        extraction.confidence.amountDue < 0.8 ||
        extraction.confidence.dueDate < 0.8
      ) {
        console.log('Low confidence detected, retrying with Claude 3.5 Sonnet');

        const claudeSpan = trace.span({
          name: 'claude-extraction-fallback',
          input: { textLength: ocrText.length, reason: 'low_confidence' },
        });

        extraction = await extractWithClaude(ocrText);
        model = 'claude-3-5-sonnet';

        // Estimate Claude cost (higher than GPT-4o-mini)
        // Claude 3.5 Sonnet: $3/MTok input, $15/MTok output
        const estimatedInputTokens = Math.ceil(ocrText.length / 4);
        const estimatedOutputTokens = 500;
        cost = (estimatedInputTokens * 3 / 1_000_000) + (estimatedOutputTokens * 15 / 1_000_000);

        claudeSpan.end({
          output: extraction,
          metadata: {
            model: 'claude-3-5-sonnet',
            estimatedCost: cost,
          },
        });
      }
    } catch (error) {
      console.log('GPT-4 extraction failed, falling back to Claude 3.5 Sonnet');

      const claudeSpan = trace.span({
        name: 'claude-extraction-fallback',
        input: { textLength: ocrText.length, reason: 'gpt4_error' },
      });

      extraction = await extractWithClaude(ocrText);
      model = 'claude-3-5-sonnet';

      // Estimate Claude cost
      const estimatedInputTokens = Math.ceil(ocrText.length / 4);
      const estimatedOutputTokens = 500;
      cost = (estimatedInputTokens * 3 / 1_000_000) + (estimatedOutputTokens * 15 / 1_000_000);

      claudeSpan.end({
        output: extraction,
        metadata: {
          model: 'claude-3-5-sonnet',
          estimatedCost: cost,
          error: (error as Error).message,
        },
      });
    }

    trace.end({
      output: extraction,
      metadata: {
        cost,
        tokensUsed,
        model,
      },
    });

    return {
      userId: document.userId,
      data: {
        fundName: extraction.fundName,
        investorEmail: extraction.investorEmail,
        investorAccount: extraction.investorAccount,
        amountDue: extraction.amountDue,
        currency: extraction.currency,
        dueDate: new Date(extraction.dueDate),
        bankName: extraction.bankName,
        accountNumber: extraction.accountNumber,
        routingNumber: extraction.routingNumber,
        wireReference: extraction.wireReference,
        confidenceScores: extraction.confidence,
        rawExtraction: extraction,
        modelUsed: model,
        extractionCost: cost,
      },
    };
  } catch (error) {
    trace.end({
      level: 'ERROR',
      statusMessage: (error as Error).message,
    });
    throw error;
  }
}
