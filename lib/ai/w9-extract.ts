// lib/ai/w9-extract.ts
// Tax & K-1 Agent - W-9 Form Extraction with AI

import { OpenAI } from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { extractTextFromPDF } from './ocr';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// W-9 Extraction Schema
export const W9ExtractionSchema = z.object({
  // Name
  name: z.string().describe('Name as shown on your income tax return'),
  businessName: z.string().optional().describe('Business name/disregarded entity name, if different'),

  // Tax classification
  taxClassification: z.enum([
    'INDIVIDUAL',
    'C_CORPORATION',
    'S_CORPORATION',
    'PARTNERSHIP',
    'TRUST_ESTATE',
    'LLC_C',
    'LLC_S',
    'LLC_P',
    'OTHER',
  ]).describe('Federal tax classification'),

  // Other classification
  otherClassification: z.string().optional().describe('If Other, specify'),

  // Exemption codes
  exemptPayeeCode: z.string().optional().describe('Exempt payee code (if any)'),
  facta: z.string().optional().describe('Exemption from FATCA reporting code (if any)'),

  // Address
  address: z.string().describe('Address (number, street, and apt. or suite no.)'),
  city: z.string().describe('City'),
  state: z.string().describe('State'),
  zip: z.string().describe('ZIP code'),

  // Account number(s) (optional)
  accountNumbers: z.string().optional().describe('Account number(s)'),

  // Taxpayer Identification Number
  tinType: z.enum(['SSN', 'EIN']).describe('Type of TIN'),
  tin: z.string().describe('Taxpayer Identification Number (SSN or EIN)'),

  // Certification
  isCertified: z.boolean().describe('Whether the form appears to be signed/certified'),
  signatureDate: z.string().optional().describe('Date of signature if present'),

  // Confidence scores
  confidence: z.object({
    name: z.number().min(0).max(1),
    tin: z.number().min(0).max(1),
    taxClassification: z.number().min(0).max(1),
    address: z.number().min(0).max(1),
  }).describe('Confidence scores (0-1) for critical fields'),
});

export type W9Extraction = z.infer<typeof W9ExtractionSchema>;

const W9_EXTRACTION_PROMPT = `You are an expert at extracting data from IRS Form W-9 (Request for Taxpayer Identification Number and Certification).

Extract the following information from the W-9 form:

**CRITICAL FIELDS:**
1. Name - Legal name as shown on tax return
2. Business Name - If different from name (optional)
3. Tax Classification - One of: Individual, C Corp, S Corp, Partnership, Trust/Estate, LLC, etc.
4. Address - Full address including city, state, ZIP
5. TIN - Either SSN (9 digits) or EIN (2 digits-7 digits format like 12-3456789)
6. TIN Type - SSN or EIN

**IMPORTANT RULES:**
- Extract TIN carefully - this is the most critical field
- For SSN: format as XXX-XX-XXXX (9 digits total)
- For EIN: format as XX-XXXXXXX (9 digits total)
- Tax classification must match one of the checkboxes on the form
- Check if the form appears to be signed (certified)
- Be very conservative with confidence scores for TIN (must be 0.95+ to auto-approve)

Return ONLY a JSON object with the extracted data.`;

/**
 * Extract W-9 data using GPT-4o
 */
export async function extractW9(documentUrl: string): Promise<W9Extraction> {
  // Extract text from PDF
  const ocrText = await extractTextFromPDF(documentUrl);

  // Extract with GPT-4o
  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: W9_EXTRACTION_PROMPT,
      },
      {
        role: 'user',
        content: `Extract W-9 data from this document:\n\n${ocrText.slice(0, 10000)}`,
      },
    ],
    response_format: zodResponseFormat(W9ExtractionSchema, 'w9_extraction'),
    temperature: 0,
  });

  const extraction = completion.choices[0].message.parsed!;

  if (!extraction) {
    throw new Error('Failed to extract W-9 data from document');
  }

  return extraction;
}
