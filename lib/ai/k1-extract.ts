// lib/ai/k1-extract.ts
// Tax & K-1 Agent - K-1 Form Extraction with AI
// Extracts K-1 forms (1065, 1120-S, 1041) with 98%+ accuracy target

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

// K-1 Extraction Schema - Comprehensive for all K-1 types
export const K1ExtractionSchema = z.object({
  // Form identification
  formType: z.enum(['K1_1065', 'K1_1120S', 'K1_1041']).describe('Type of K-1 form'),
  taxYear: z.number().describe('Tax year (e.g., 2024)'),

  // Partnership/Entity information (Part I)
  partnershipName: z.string().describe('Name of partnership/S-Corp/Trust'),
  partnershipEIN: z.string().optional().describe('EIN of partnership'),
  partnershipAddress: z.string().optional().describe('Address of partnership'),

  // Partner/Shareholder information (Part II)
  partnerName: z.string().describe('Name of partner/shareholder/beneficiary'),
  partnerSSN: z.string().optional().describe('SSN or EIN of partner'),
  partnerAddress: z.string().optional().describe('Address of partner'),
  partnerType: z.string().optional().describe('Type: General, Limited, Individual, etc.'),

  // Share information
  profitSharePercentage: z.number().optional().describe('Partner profit share %'),
  lossSharePercentage: z.number().optional().describe('Partner loss share %'),
  capitalSharePercentage: z.number().optional().describe('Partner capital share %'),

  // Part III - Income/Loss items (Box 1-11)
  ordinaryBusinessIncome: z.number().optional().describe('Box 1: Ordinary business income/loss'),
  netRentalRealEstateIncome: z.number().optional().describe('Box 2: Net rental real estate income'),
  otherNetRentalIncome: z.number().optional().describe('Box 3: Other net rental income'),
  guaranteedPayments: z.number().optional().describe('Box 4: Guaranteed payments'),
  interestIncome: z.number().optional().describe('Box 5: Interest income'),
  ordinaryDividends: z.number().optional().describe('Box 6a: Ordinary dividends'),
  qualifiedDividends: z.number().optional().describe('Box 6b: Qualified dividends'),
  royalties: z.number().optional().describe('Box 7: Royalties'),
  netShortTermCapitalGain: z.number().optional().describe('Box 8: Net short-term capital gain/loss'),
  netLongTermCapitalGain: z.number().optional().describe('Box 9a: Net long-term capital gain/loss'),
  collectiblesGain: z.number().optional().describe('Box 9b: Collectibles (28%) gain/loss'),
  unrecaptured1250Gain: z.number().optional().describe('Box 9c: Unrecaptured section 1250 gain'),
  otherIncome: z.number().optional().describe('Box 11: Other income/loss'),

  // Deductions (Box 12-13)
  section179Deduction: z.number().optional().describe('Box 12: Section 179 deduction'),
  otherDeductions: z.number().optional().describe('Box 13: Other deductions'),

  // Self-employment earnings (Box 14)
  selfEmploymentEarnings: z.number().optional().describe('Box 14: Self-employment earnings'),

  // Credits (Box 15)
  credits: z.number().optional().describe('Box 15: Credits'),

  // Foreign transactions (Box 16)
  foreignCountry: z.string().optional().describe('Box 16: Name of foreign country'),
  foreignTaxesPaid: z.number().optional().describe('Box 16: Foreign taxes paid'),

  // Alternative Minimum Tax (Box 17)
  amtAdjustments: z.number().optional().describe('Box 17: AMT adjustments'),

  // Tax-exempt income (Box 18)
  taxExemptIncome: z.number().optional().describe('Box 18: Tax-exempt income'),

  // Distributions (Box 19)
  cashDistributions: z.number().optional().describe('Box 19a: Cash distributions'),
  nonCashDistributions: z.number().optional().describe('Box 19b: Non-cash distributions'),

  // Capital account (Box 20)
  beginningCapital: z.number().optional().describe('Box 20: Beginning capital account'),
  endingCapital: z.number().optional().describe('Box 20: Ending capital account'),
  capitalContributions: z.number().optional().describe('Capital contributions during year'),

  // State and local information
  stateIncome: z.array(z.object({
    state: z.string(),
    income: z.number(),
    withholding: z.number().optional(),
  })).optional().describe('State-specific K-1 data'),

  // Confidence scores for critical fields
  confidence: z.object({
    formType: z.number().min(0).max(1),
    partnershipName: z.number().min(0).max(1),
    partnerName: z.number().min(0).max(1),
    ordinaryBusinessIncome: z.number().min(0).max(1),
    cashDistributions: z.number().min(0).max(1),
  }).describe('Confidence scores (0-1) for critical fields'),

  // Additional metadata
  finalK1: z.boolean().optional().describe('Is this a final K-1 (not amended)?'),
  amendedK1: z.boolean().optional().describe('Is this an amended K-1?'),
});

export type K1Extraction = z.infer<typeof K1ExtractionSchema>;

// Few-shot examples for K-1 extraction
const K1_FEW_SHOT_EXAMPLES = `
**Example 1 - Partnership K-1 (Form 1065):**
Input: "Schedule K-1 (Form 1065) 2024 - Apollo Fund XI LP - EIN: 12-3456789 - Partner: John Smith - SSN: 123-45-6789 - Box 1 Ordinary business income: $50,000 - Box 19a Cash distributions: $25,000"
Output: { "formType": "K1_1065", "taxYear": 2024, "partnershipName": "Apollo Fund XI LP", "partnershipEIN": "12-3456789", "partnerName": "John Smith", "partnerSSN": "123-45-6789", "ordinaryBusinessIncome": 50000, "cashDistributions": 25000, "confidence": { "formType": 0.99, "partnershipName": 0.98, "partnerName": 0.98, "ordinaryBusinessIncome": 0.95, "cashDistributions": 0.95 } }

**Example 2 - S-Corporation K-1 (Form 1120-S):**
Input: "Schedule K-1 (Form 1120-S) 2024 - TechCo Inc - EIN: 98-7654321 - Shareholder: Jane Doe - Box 1 Ordinary business income: $100,000 - Box 16d Cash distributions: $50,000"
Output: { "formType": "K1_1120S", "taxYear": 2024, "partnershipName": "TechCo Inc", "partnershipEIN": "98-7654321", "partnerName": "Jane Doe", "ordinaryBusinessIncome": 100000, "cashDistributions": 50000, "confidence": { "formType": 0.99, "partnershipName": 0.98, "partnerName": 0.98, "ordinaryBusinessIncome": 0.96, "cashDistributions": 0.95 } }

**Example 3 - Trust K-1 (Form 1041):**
Input: "Schedule K-1 (Form 1041) 2024 - Smith Family Trust - EIN: 11-2233445 - Beneficiary: Robert Smith - Box 2a Interest: $15,000 - Box 9a Net long-term capital gain: $30,000"
Output: { "formType": "K1_1041", "taxYear": 2024, "partnershipName": "Smith Family Trust", "partnershipEIN": "11-2233445", "partnerName": "Robert Smith", "interestIncome": 15000, "netLongTermCapitalGain": 30000, "confidence": { "formType": 0.99, "partnershipName": 0.97, "partnerName": 0.98, "ordinaryBusinessIncome": 0.0, "cashDistributions": 0.0 } }
`;

// System prompt for K-1 extraction
const K1_EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting structured data from IRS Schedule K-1 tax forms.

Schedule K-1 is issued by partnerships (Form 1065), S-Corporations (Form 1120-S), and trusts/estates (Form 1041) to report each partner's, shareholder's, or beneficiary's share of income, deductions, credits, and other tax items.

**CRITICAL REQUIREMENTS:**
- 98%+ accuracy required for all financial fields (this is TAX DATA - errors have serious consequences)
- NEVER make up or estimate data - only extract what is explicitly stated
- For amounts, extract numeric values without $ or commas (e.g., "$50,000.00" → 50000)
- Negative numbers (losses) should be extracted as negative (e.g., "($10,000)" → -10000)
- Tax year should be a 4-digit year (e.g., 2024)
- SSN/EIN should preserve format with dashes if present

**FORM TYPE DETECTION:**
- Form 1065 = Partnership K-1 (formType: "K1_1065")
- Form 1120-S = S-Corporation K-1 (formType: "K1_1120S")
- Form 1041 = Trust/Estate K-1 (formType: "K1_1041")
- Look for form number in header or footer

**EXTRACTION STRATEGY:**
1. Identify form type (1065, 1120-S, or 1041) from document header
2. Extract Part I: Partnership/Entity information (name, EIN, address)
3. Extract Part II: Partner/Shareholder information (name, SSN, address, type, ownership %)
4. Extract Part III: Line-by-line income/loss items (Boxes 1-20+)
5. Extract state-specific K-1 data if present (usually separate pages)
6. Assess confidence for each critical field

**KEY BOXES TO EXTRACT:**
- Box 1: Ordinary business income/loss (MOST IMPORTANT - almost always present)
- Boxes 2-3: Rental income
- Box 4: Guaranteed payments
- Boxes 5-7: Interest, dividends, royalties
- Boxes 8-9: Capital gains/losses
- Box 11: Other income
- Boxes 12-13: Deductions
- Box 14: Self-employment earnings
- Box 15: Credits
- Box 16: Foreign transactions
- Box 17: AMT adjustments
- Box 18: Tax-exempt income
- Box 19: Distributions (CRITICAL - shows cash received)
- Box 20: Capital account

**CONFIDENCE SCORING:**
For critical fields (formType, partnershipName, partnerName, ordinaryBusinessIncome, cashDistributions):
- 1.0 = Field explicitly labeled and clearly printed
- 0.95-0.99 = Field clearly present, minor ambiguity
- 0.90-0.94 = Field present but handwritten or unclear formatting
- 0.85-0.89 = Field inferred from context
- <0.85 = Flag for human review (set requiresReview: true)

**HANDLING AMENDMENTS:**
- Check for "AMENDED K-1" or "CORRECTED K-1" in header
- Set amendedK1: true if found
- Set finalK1: false if it says "PRELIMINARY" or "DRAFT"

**STATE K-1 DATA:**
Many states require state-specific K-1 forms. Extract state income allocation if present.

${K1_FEW_SHOT_EXAMPLES}
`;

/**
 * Extract K-1 data using Claude 3.5 Sonnet (fallback or high-accuracy mode)
 */
async function extractK1WithClaude(ocrText: string): Promise<K1Extraction> {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 8192,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: `${K1_EXTRACTION_SYSTEM_PROMPT}

Extract K-1 data from this document and return ONLY a JSON object with the extracted data.

Document text:
${ocrText.slice(0, 20000)}`,
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
  return K1ExtractionSchema.parse(extraction);
}

/**
 * Main K-1 extraction function with GPT-4 and Claude fallback
 * 98%+ accuracy target
 *
 * @param documentId - ID of the document to extract from
 * @returns Extracted K-1 data with confidence scores
 */
export async function extractK1(documentId: string) {
  // Start Langfuse trace
  const trace = langfuse.trace({
    name: 'k1-extraction',
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

    // Step 2: Extract with GPT-4o or Claude
    let extraction: K1Extraction;
    let model = 'gpt-4o';
    let tokensUsed = 0;
    let cost = 0;

    try {
      const extractionSpan = trace.span({
        name: 'gpt4-k1-extraction',
        input: { textLength: ocrText.length },
      });

      const completion = await openai.beta.chat.completions.parse({
        model: 'gpt-4o', // Use full GPT-4o for high accuracy
        messages: [
          {
            role: 'system',
            content: K1_EXTRACTION_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: `Extract K-1 data from this document:\n\n${ocrText.slice(0, 20000)}`,
          },
        ],
        response_format: zodResponseFormat(K1ExtractionSchema, 'k1_extraction'),
        temperature: 0, // Deterministic for tax accuracy
      });

      extraction = completion.choices[0].message.parsed!;

      if (!extraction) {
        throw new Error('Failed to extract K-1 data from document');
      }

      tokensUsed = completion.usage?.total_tokens || 0;

      // Calculate cost for GPT-4o
      cost = (
        (completion.usage?.prompt_tokens || 0) * 2.50 / 1_000_000 +
        (completion.usage?.completion_tokens || 0) * 10.00 / 1_000_000
      );

      extractionSpan.end({
        output: extraction,
        metadata: {
          tokensUsed,
          model: 'gpt-4o',
          cost,
        },
      });

      // If low confidence on ANY critical field, retry with Claude
      const minConfidence = Math.min(
        extraction.confidence.formType,
        extraction.confidence.partnershipName,
        extraction.confidence.partnerName,
        extraction.confidence.ordinaryBusinessIncome || 0,
        extraction.confidence.cashDistributions || 0
      );

      if (minConfidence < 0.85) {
        console.log('Low confidence detected, retrying with Claude 3.5 Sonnet');

        const claudeSpan = trace.span({
          name: 'claude-k1-extraction-fallback',
          input: { textLength: ocrText.length, reason: 'low_confidence' },
        });

        extraction = await extractK1WithClaude(ocrText);
        model = 'claude-3-5-sonnet';

        // Estimate Claude cost (higher than GPT-4o)
        const estimatedInputTokens = Math.ceil(ocrText.length / 4);
        const estimatedOutputTokens = 1000;
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
        name: 'claude-k1-extraction-fallback',
        input: { textLength: ocrText.length, reason: 'gpt4_error' },
      });

      extraction = await extractK1WithClaude(ocrText);
      model = 'claude-3-5-sonnet';

      // Estimate Claude cost
      const estimatedInputTokens = Math.ceil(ocrText.length / 4);
      const estimatedOutputTokens = 1000;
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

    // Determine if requires review
    const requiresReview = (
      extraction.confidence.formType < 0.90 ||
      extraction.confidence.partnershipName < 0.90 ||
      extraction.confidence.partnerName < 0.90 ||
      (extraction.confidence.ordinaryBusinessIncome || 0) < 0.85 ||
      (extraction.confidence.cashDistributions || 0) < 0.85
    );

    return {
      userId: document.userId,
      data: {
        ...extraction,
        requiresReview,
        extractionCost: cost,
        modelUsed: model,
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
