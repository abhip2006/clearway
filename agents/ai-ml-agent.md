# AI/ML Agent 🤖

## Role
Responsible for all AI and machine learning components including OCR, document extraction, prompt engineering, accuracy optimization, and model performance. The core intelligence of the Clearway platform.

## Primary Responsibilities

1. **OCR Integration**
   - Azure Document Intelligence integration
   - Text extraction from PDFs
   - Layout analysis
   - Error handling for various document formats

2. **AI Extraction**
   - GPT-4 integration for structured data extraction
   - Prompt engineering for 95%+ accuracy
   - Confidence score calculation
   - Fallback strategies

3. **Accuracy Optimization**
   - Validation on test dataset
   - Prompt iteration
   - Error pattern analysis
   - Model selection

4. **Observability**
   - Langfuse integration for LLM tracing
   - Cost tracking
   - Performance monitoring
   - Error analysis

5. **Data Quality**
   - Structured output validation
   - Edge case handling
   - Data sanitization

## Tech Stack

### AI/ML Services
- **Azure Document Intelligence** - OCR and layout analysis
- **OpenAI GPT-4o-mini** - Cost-effective extraction ($0.15/1M tokens)
- **Claude 3.5 Sonnet** - Backup model (higher accuracy, higher cost)

### Validation & Types
- **Zod** - Runtime validation + TypeScript types
- **OpenAI Structured Outputs** - JSON mode for reliable parsing

### Observability
- **Langfuse** - LLM tracing, cost tracking, debugging
- **Sentry** - Error tracking

## MVP Features to Build

### Week 2: OCR Pipeline

**Task AI-001: Azure Document Intelligence OCR**
```typescript
// lib/ai/ocr.ts

import {
  DocumentAnalysisClient,
  AzureKeyCredential,
} from '@azure/ai-form-recognizer';

const client = new DocumentAnalysisClient(
  process.env.AZURE_DI_ENDPOINT!,
  new AzureKeyCredential(process.env.AZURE_DI_KEY!)
);

export async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  try {
    // Download PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();

    // Analyze with Azure DI (prebuilt-layout model)
    const poller = await client.beginAnalyzeDocument(
      'prebuilt-layout',
      Buffer.from(buffer),
      {
        locale: 'en-US',
      }
    );

    const result = await poller.pollUntilDone();

    // Extract text in reading order
    let fullText = '';

    if (result.pages) {
      for (const page of result.pages) {
        if (page.lines) {
          for (const line of page.lines) {
            fullText += line.content + '\n';
          }
        }
      }
    }

    // Also extract tables (capital calls often have tables)
    if (result.tables) {
      fullText += '\n\n--- TABLES ---\n';
      for (const table of result.tables) {
        fullText += `Table with ${table.rowCount} rows and ${table.columnCount} columns:\n`;
        if (table.cells) {
          for (const cell of table.cells) {
            fullText += `  [Row ${cell.rowIndex}, Col ${cell.columnIndex}]: ${cell.content}\n`;
          }
        }
      }
    }

    return fullText;
  } catch (error) {
    console.error('OCR extraction failed:', error);
    throw new Error(`OCR failed: ${error.message}`);
  }
}
```

**Acceptance Criteria**:
- ✅ Extracts text from PDF using Azure DI
- ✅ Preserves reading order
- ✅ Extracts tables separately
- ✅ Error handling for malformed PDFs
- ✅ Returns clean text

**Dependencies**:
- Integration Agent: Azure DI API keys configured

---

### Week 2: GPT-4 Extraction

**Task AI-002: Capital Call Extraction Function**
```typescript
// lib/ai/extract.ts

import { OpenAI } from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { extractTextFromPDF } from './ocr';
import { db } from '../db';
import { Langfuse } from 'langfuse';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
});

// Define extraction schema
const CapitalCallExtractionSchema = z.object({
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

    // Step 2: Extract with GPT-4
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

    const extraction = completion.choices[0].message.parsed;

    if (!extraction) {
      throw new Error('Failed to extract data from document');
    }

    extractionSpan.end({
      output: extraction,
      metadata: {
        tokensUsed: completion.usage?.total_tokens,
        model: 'gpt-4o-mini',
      },
    });

    // Calculate cost
    const cost = (
      (completion.usage?.prompt_tokens || 0) * 0.15 / 1_000_000 +
      (completion.usage?.completion_tokens || 0) * 0.60 / 1_000_000
    );

    trace.end({
      output: extraction,
      metadata: {
        cost,
        tokensUsed: completion.usage?.total_tokens,
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
      },
    };
  } catch (error) {
    trace.end({
      level: 'ERROR',
      statusMessage: error.message,
    });
    throw error;
  }
}

// System prompt for extraction
const EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting structured data from capital call documents.

A capital call is a request from a fund (like a private equity or venture capital fund) asking an investor to send money.

Extract the following information with high accuracy:

**Critical Fields (must have high confidence)**:
1. Fund Name - The full official name of the fund (e.g., "Apollo Fund XI", "Blackstone Real Estate Fund VII")
   - Often appears in the header or title
   - May include Roman numerals (XI, XII) or years (2019, 2020)
   - Common fund families: Apollo, Blackstone, KKR, Carlyle, TPG, Warburg Pincus

2. Amount Due - The total amount the investor must pay in USD
   - Look for: "Capital Call Amount", "Amount Due", "Total Capital Called"
   - Extract numeric value only (no $, no commas)
   - If you see "$250,000.00", extract as 250000

3. Due Date - When the payment is due
   - Look for: "Due Date", "Payment Due", "Deadline"
   - Format as YYYY-MM-DD
   - If you see "December 15, 2025", format as "2025-12-15"

**Wire Instructions (important but may be missing)**:
4. Bank Name - Where to send the wire (e.g., "JPMorgan Chase", "Bank of America")
5. Account Number - Bank account to send to
6. Routing Number - 9-digit US routing number
7. Wire Reference - Reference number or memo to include with wire

**Investor Information (helpful if present)**:
8. Investor Email - Email address of the investor
9. Investor Account - Investor's account number with the fund

**Confidence Scores**:
For fundName, amountDue, and dueDate, provide a confidence score from 0 to 1:
- 1.0 = Completely certain, field explicitly labeled
- 0.9 = Very confident, found in expected location
- 0.7 = Moderately confident, inferred from context
- 0.5 = Low confidence, best guess
- < 0.5 = Should flag for human review

**Important Rules**:
- If a field is not found, use null (not an empty string)
- Do NOT make up data - only extract what is explicitly stated
- For amounts, do NOT include $ or commas
- For dates, always use YYYY-MM-DD format
- Be conservative with confidence scores - better to flag for review than guess wrong
- Fund names often appear in ALL CAPS - preserve proper capitalization if possible

**Common Patterns**:
- Capital call documents often have a table with investor details
- Wire instructions are usually in a dedicated section or box
- Amounts may be formatted as "$250,000.00" or "USD 250,000"
- Dates may be written as "12/15/2025" or "December 15, 2025" or "15-Dec-2025"`;
```

**Acceptance Criteria**:
- ✅ Extracts capital call data with 95%+ accuracy
- ✅ Returns structured output with Zod validation
- ✅ Provides confidence scores
- ✅ Langfuse tracing for observability
- ✅ Cost tracking
- ✅ Error handling and retries

**Dependencies**:
- Integration Agent: OpenAI API key, Langfuse configured
- Database Agent: Document model available

---

### Week 3: Accuracy Validation

**Task AI-003: Accuracy Testing Script**
```typescript
// scripts/test-ai-accuracy.ts

import { extractCapitalCall } from '@/lib/ai/extract';
import { db } from '@/lib/db';
import fs from 'fs';

interface GroundTruth {
  documentId: string;
  fundName: string;
  amountDue: number;
  dueDate: string;
}

// Load ground truth data
const groundTruth: GroundTruth[] = JSON.parse(
  fs.readFileSync('./scripts/ground-truth.json', 'utf-8')
);

async function validateAccuracy() {
  let results = {
    total: 0,
    correct: {
      fundName: 0,
      amountDue: 0,
      dueDate: 0,
    },
    errors: [] as any[],
  };

  for (const truth of groundTruth) {
    results.total++;

    try {
      const extraction = await extractCapitalCall(truth.documentId);

      // Check fund name (exact match)
      if (extraction.data.fundName === truth.fundName) {
        results.correct.fundName++;
      } else {
        results.errors.push({
          documentId: truth.documentId,
          field: 'fundName',
          expected: truth.fundName,
          actual: extraction.data.fundName,
        });
      }

      // Check amount (allow 1% variance)
      const amountVariance = Math.abs(extraction.data.amountDue - truth.amountDue) / truth.amountDue;
      if (amountVariance < 0.01) {
        results.correct.amountDue++;
      } else {
        results.errors.push({
          documentId: truth.documentId,
          field: 'amountDue',
          expected: truth.amountDue,
          actual: extraction.data.amountDue,
        });
      }

      // Check due date (exact match)
      const extractedDate = extraction.data.dueDate.toISOString().split('T')[0];
      if (extractedDate === truth.dueDate) {
        results.correct.dueDate++;
      } else {
        results.errors.push({
          documentId: truth.documentId,
          field: 'dueDate',
          expected: truth.dueDate,
          actual: extractedDate,
        });
      }
    } catch (error) {
      console.error(`Failed to extract ${truth.documentId}:`, error);
      results.errors.push({
        documentId: truth.documentId,
        error: error.message,
      });
    }
  }

  // Calculate accuracy
  const accuracy = {
    fundName: (results.correct.fundName / results.total * 100).toFixed(1),
    amountDue: (results.correct.amountDue / results.total * 100).toFixed(1),
    dueDate: (results.correct.dueDate / results.total * 100).toFixed(1),
    overall: (
      (results.correct.fundName + results.correct.amountDue + results.correct.dueDate) /
      (results.total * 3) * 100
    ).toFixed(1),
  };

  console.log('\n=== AI Extraction Accuracy Report ===\n');
  console.log(`Total Documents: ${results.total}`);
  console.log(`\nAccuracy by Field:`);
  console.log(`  Fund Name:  ${accuracy.fundName}%`);
  console.log(`  Amount Due: ${accuracy.amountDue}%`);
  console.log(`  Due Date:   ${accuracy.dueDate}%`);
  console.log(`\nOverall Accuracy: ${accuracy.overall}%`);

  console.log(`\n=== Errors (${results.errors.length}) ===\n`);
  results.errors.forEach((error) => {
    console.log(`Document: ${error.documentId}`);
    console.log(`  Field: ${error.field}`);
    console.log(`  Expected: ${error.expected}`);
    console.log(`  Actual: ${error.actual}\n`);
  });

  // Write report to file
  fs.writeFileSync(
    './scripts/accuracy-report.json',
    JSON.stringify({ accuracy, results }, null, 2)
  );

  return accuracy;
}

validateAccuracy()
  .then((accuracy) => {
    if (parseFloat(accuracy.overall) < 95) {
      console.error(`\n❌ Accuracy ${accuracy.overall}% is below 95% target\n`);
      process.exit(1);
    } else {
      console.log(`\n✅ Accuracy ${accuracy.overall}% meets 95% target\n`);
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
```

**Usage**:
```bash
npm run test:accuracy
```

**Acceptance Criteria**:
- ✅ Tests on 100+ real capital call documents
- ✅ Measures accuracy per field
- ✅ Identifies error patterns
- ✅ Generates detailed report
- ✅ Fails if accuracy < 95%

---

### Week 4: Prompt Optimization

**Task AI-004: Prompt Engineering Iterations**

**Version 1 Baseline**: Initial prompt (see EXTRACTION_SYSTEM_PROMPT above)

**Version 2 - Add Few-Shot Examples**:
```typescript
const FEW_SHOT_EXAMPLES = `
Example 1:
Input: "APOLLO FUND XI CAPITAL CALL - Amount Due: $250,000.00 - Due Date: December 15, 2025"
Output: { "fundName": "Apollo Fund XI", "amountDue": 250000, "dueDate": "2025-12-15", "confidence": { "fundName": 0.95, "amountDue": 0.98, "dueDate": 0.95 } }

Example 2:
Input: "KKR Global Impact Fund / Investor: ABC Wealth / Call Amount: USD 150,000 / Payment Deadline: 1/10/2026"
Output: { "fundName": "KKR Global Impact Fund", "amountDue": 150000, "dueDate": "2026-01-10", "confidence": { "fundName": 0.92, "amountDue": 0.95, "dueDate": 0.90 } }
`;

// Add to system prompt
const IMPROVED_SYSTEM_PROMPT = EXTRACTION_SYSTEM_PROMPT + '\n\n' + FEW_SHOT_EXAMPLES;
```

**Version 3 - Chain of Thought**:
```typescript
// Update system prompt to include reasoning
const COT_SYSTEM_PROMPT = `${EXTRACTION_SYSTEM_PROMPT}

Before extracting, reason through these steps:
1. Identify the document type (is this definitely a capital call?)
2. Locate the fund name (where in the document?)
3. Find the amount (what section? what format?)
4. Find the due date (where mentioned?)
5. Assess confidence for each field

Then provide the structured output.`;
```

**Testing Process**:
1. Run accuracy test with baseline prompt
2. Analyze errors to identify patterns
3. Iterate prompt to address patterns
4. Re-run accuracy test
5. Repeat until 95%+ accuracy

**Common Error Patterns & Fixes**:

| Error Pattern | Fix |
|---------------|-----|
| Fund names in ALL CAPS → "APOLLO FUND XI" instead of "Apollo Fund XI" | Add instruction: "Preserve proper capitalization (Title Case) for fund names" |
| Missing wire instructions → Confidence score should be lower | Add: "If wire instructions section is incomplete, reduce overall confidence" |
| Date format errors → "12/15/25" misinterpreted | Add examples of various date formats to recognize |
| Amount includes commas → "$250,000" extracted as 250 | Emphasize: "Remove all $ symbols and commas" |

---

### Week 5: Model Selection & Fallback

**Task AI-005: Claude 3.5 Sonnet Fallback**
```typescript
// lib/ai/extract.ts - Enhanced with model fallback

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function extractWithClaude(ocrText: string) {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: `${EXTRACTION_SYSTEM_PROMPT}\n\nDocument text:\n${ocrText.slice(0, 15000)}`,
      },
    ],
  });

  // Parse JSON from response
  const content = message.content[0].text;
  const jsonMatch = content.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  const extraction = JSON.parse(jsonMatch[0]);
  return CapitalCallExtractionSchema.parse(extraction);
}

// Update main extraction function with fallback
export async function extractCapitalCall(documentId: string) {
  // ... (existing code)

  let extraction;
  let model = 'gpt-4o-mini';

  try {
    // Try GPT-4 first
    const completion = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [/* ... */],
      response_format: zodResponseFormat(CapitalCallExtractionSchema, 'capital_call'),
      temperature: 0,
    });

    extraction = completion.choices[0].message.parsed;

    // If low confidence, retry with Claude
    if (extraction.confidence.fundName < 0.8 ||
        extraction.confidence.amountDue < 0.8 ||
        extraction.confidence.dueDate < 0.8) {
      console.log('Low confidence detected, retrying with Claude');
      extraction = await extractWithClaude(ocrText);
      model = 'claude-3-5-sonnet';
    }
  } catch (error) {
    console.log('GPT-4 extraction failed, falling back to Claude');
    extraction = await extractWithClaude(ocrText);
    model = 'claude-3-5-sonnet';
  }

  // ... (rest of function)
}
```

**Acceptance Criteria**:
- ✅ Falls back to Claude if GPT-4 fails
- ✅ Falls back to Claude if confidence scores low
- ✅ Tracks which model was used
- ✅ Cost tracking for both models

---

## Handoff Requirements

### To Backend Agent
```markdown
## Function Ready: extractCapitalCall

**Location**: `lib/ai/extract.ts`

**Function Signature**:
```typescript
async function extractCapitalCall(documentId: string): Promise<{
  userId: string;
  data: {
    fundName: string;
    investorEmail?: string;
    investorAccount?: string;
    amountDue: number;
    currency: string;
    dueDate: Date;
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
    wireReference?: string;
    confidenceScores: {
      fundName: number;
      amountDue: number;
      dueDate: number;
    };
    rawExtraction: any;
  };
}>
```

**Usage in Inngest Job**:
```typescript
import { extractCapitalCall } from '@/lib/ai/extract';

// In background job
const extraction = await extractCapitalCall(documentId);

// Save to database
await db.capitalCall.create({
  data: {
    documentId,
    userId: extraction.userId,
    ...extraction.data,
  },
});
```

**Error Handling**:
- Throws error if document not found
- Throws error if OCR fails
- Throws error if extraction fails
- All errors logged to Langfuse
```

## Quality Standards

### Accuracy Targets
- **Overall**: 95%+ across all fields
- **Critical fields** (fundName, amountDue, dueDate): 97%+
- **Optional fields** (wire instructions): 85%+

### Performance
- OCR: < 10 seconds per document
- Extraction: < 5 seconds per document
- Total: < 60 seconds end-to-end

### Cost
- Target: < $0.05 per document
- GPT-4o-mini: ~$0.02 per document
- Azure DI: ~$0.01 per document
- Claude fallback: ~$0.10 per document (rare)

### Observability
- All extractions traced in Langfuse
- Cost tracked per extraction
- Error rates monitored
- Confidence scores logged

## Testing

### Unit Tests
```typescript
// tests/ai/extract.test.ts

import { extractCapitalCall } from '@/lib/ai/extract';

describe('extractCapitalCall', () => {
  it('extracts capital call from sample PDF', async () => {
    const result = await extractCapitalCall('test-doc-id');

    expect(result.data.fundName).toBe('Apollo Fund XI');
    expect(result.data.amountDue).toBe(250000);
    expect(result.data.dueDate).toEqual(new Date('2025-12-15'));
    expect(result.data.confidenceScores.fundName).toBeGreaterThan(0.9);
  });
});
```

## Status Reporting

Location: `.agents/status/ai-ml-status.json`

```json
{
  "agent": "ai-ml-agent",
  "date": "2025-11-20",
  "status": "in-progress",
  "current_week": 3,
  "completed_tasks": ["AI-001", "AI-002", "AI-003"],
  "in_progress_tasks": ["AI-004"],
  "blocked_tasks": [],
  "upcoming_tasks": ["AI-005"],
  "metrics": {
    "accuracy": "96.2%",
    "avg_cost_per_doc": "$0.023",
    "avg_extraction_time": "12s",
    "documents_processed": 150
  }
}
```

---

**AI/ML Agent is ready to deliver 95%+ accurate capital call extraction for Clearway MVP.**
