# Clearway AI/ML Components

This directory contains all AI and machine learning components for the Clearway MVP, including OCR extraction and intelligent data extraction from capital call documents.

## Overview

The AI/ML pipeline consists of two main steps:

1. **OCR Extraction** (`ocr.ts`) - Extracts text from PDF documents using Azure Document Intelligence
2. **Data Extraction** (`extract.ts`) - Extracts structured capital call data using GPT-4o-mini with Claude 3.5 Sonnet fallback

## Architecture

```
PDF Document (URL)
    ↓
Azure Document Intelligence (OCR)
    ↓
Extracted Text
    ↓
GPT-4o-mini (Primary Model)
    ↓
Confidence Check (< 0.8?)
    ↓ (if low confidence)
Claude 3.5 Sonnet (Fallback)
    ↓
Structured Data + Confidence Scores
    ↓
Langfuse Trace + Cost Tracking
```

## Files

### `ocr.ts`
- **Purpose**: Extract text from PDF documents using Azure Document Intelligence
- **Input**: PDF URL (from Cloudflare R2)
- **Output**: Plain text with tables included
- **Key Features**:
  - Preserves reading order
  - Extracts tables separately for better structure
  - Handles multi-page documents
  - Error handling for malformed PDFs

### `extract.ts`
- **Purpose**: Extract structured capital call data from OCR text
- **Input**: Document ID (looks up PDF URL from database)
- **Output**: Structured data with confidence scores
- **Key Features**:
  - Zod schema validation for type safety
  - GPT-4o-mini primary extraction (~$0.02/doc)
  - Claude 3.5 Sonnet fallback for low confidence or errors (~$0.10/doc)
  - Langfuse tracing for observability
  - Cost tracking per extraction
  - Confidence scores for critical fields
  - Few-shot examples in prompt
  - Chain of Thought reasoning

## Usage

### Basic Extraction

```typescript
import { extractCapitalCall } from '@/lib/ai/extract';

// In a background job (Inngest)
export const processDocument = inngest.createFunction(
  { id: 'process-document' },
  { event: 'document/uploaded' },
  async ({ event }) => {
    const extraction = await extractCapitalCall(event.data.documentId);

    // Save to database
    await db.capitalCall.create({
      data: {
        documentId: event.data.documentId,
        userId: extraction.userId,
        ...extraction.data,
      },
    });
  }
);
```

### OCR Only

```typescript
import { extractTextFromPDF } from '@/lib/ai/ocr';

const text = await extractTextFromPDF('https://cdn.clearway.com/doc.pdf');
console.log(text);
```

## Data Schema

The extraction returns the following structured data:

```typescript
{
  userId: string;
  data: {
    // Critical fields (must be present)
    fundName: string;
    amountDue: number;
    currency: string;
    dueDate: Date;

    // Optional fields
    investorEmail?: string;
    investorAccount?: string;
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
    wireReference?: string;

    // Metadata
    confidenceScores: {
      fundName: number;    // 0-1
      amountDue: number;   // 0-1
      dueDate: number;     // 0-1
    };
    rawExtraction: any;
    modelUsed: 'gpt-4o-mini' | 'claude-3-5-sonnet';
    extractionCost: number;
  };
}
```

## Environment Variables

Required environment variables (see `.env.example`):

```bash
# Azure Document Intelligence
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your_key_here

# OpenAI
OPENAI_API_KEY=sk-your_key_here

# Anthropic (for fallback)
ANTHROPIC_API_KEY=sk-ant-your_key_here

# Langfuse (observability)
LANGFUSE_PUBLIC_KEY=pk-lf-your_key_here
LANGFUSE_SECRET_KEY=sk-lf-your_key_here
LANGFUSE_HOST=https://cloud.langfuse.com
```

## Testing

### Accuracy Testing

Run the accuracy validation script:

```bash
npm run test:accuracy
```

This will:
1. Load ground truth data from `scripts/ground-truth.json`
2. Extract data from each test document
3. Compare against expected values
4. Generate accuracy report
5. Exit with error if accuracy < 95%

### Adding Test Cases

Edit `scripts/ground-truth.json`:

```json
[
  {
    "documentId": "doc_test_001",
    "fundName": "Apollo Fund XI",
    "amountDue": 250000,
    "dueDate": "2025-12-15"
  }
]
```

## Prompt Engineering

The extraction prompt includes:

1. **Chain of Thought** - Step-by-step reasoning before extraction
2. **Few-Shot Examples** - 3 examples of correct extractions
3. **Detailed Instructions** - Specific rules for each field
4. **Confidence Scoring** - Guidelines for assigning confidence scores

### Improving Accuracy

If accuracy falls below 95%:

1. Review errors in `scripts/accuracy-report.json`
2. Identify patterns (e.g., date format issues, fund name capitalization)
3. Update `EXTRACTION_SYSTEM_PROMPT` in `extract.ts`
4. Add more few-shot examples
5. Re-run accuracy tests

## Model Selection

### Primary: GPT-4o-mini
- **Cost**: $0.15/1M input tokens, $0.60/1M output tokens
- **Average cost per doc**: ~$0.02
- **Speed**: ~3-5 seconds
- **Accuracy**: 93-96% (depends on document quality)

### Fallback: Claude 3.5 Sonnet
- **Cost**: $3/1M input tokens, $15/1M output tokens
- **Average cost per doc**: ~$0.10
- **Speed**: ~4-6 seconds
- **Accuracy**: 96-98% (higher than GPT-4o-mini)
- **Triggered when**:
  - GPT-4o-mini fails with error
  - Confidence scores < 0.8 for any critical field

## Observability

All extractions are traced in Langfuse with:

- **Trace ID**: Unique identifier for debugging
- **Input**: Document ID, OCR text length
- **Output**: Extracted data
- **Metadata**: Model used, tokens, cost, confidence scores
- **Spans**:
  - OCR extraction
  - GPT-4 extraction
  - Claude fallback (if triggered)

View traces at: https://cloud.langfuse.com

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Overall Accuracy | 95%+ | TBD (run tests) |
| Critical Fields Accuracy | 97%+ | TBD (run tests) |
| OCR Time | < 10s | ~8s (estimated) |
| Extraction Time | < 5s | ~3-5s (estimated) |
| Total Time | < 60s | ~15s (estimated) |
| Cost per Document | < $0.05 | $0.02-0.10 (varies) |

## Error Handling

The system handles:

1. **PDF Download Failures** - Returns error if PDF URL is invalid
2. **OCR Failures** - Throws error with details
3. **GPT-4 Failures** - Automatically falls back to Claude
4. **Low Confidence** - Falls back to Claude if confidence < 0.8
5. **Invalid Schema** - Zod validation catches malformed data
6. **Missing Document** - Returns error if document not found in database

All errors are logged to Langfuse and Sentry.

## Dependencies

This module depends on:

- **Database Agent**: Document and CapitalCall models
- **Integration Agent**: API keys configured
- **DevOps Agent**: Environment variables in production

## Next Steps

1. Database Agent: Create Prisma schema
2. Integration Agent: Configure API keys
3. Backend Agent: Integrate into Inngest jobs
4. Run accuracy tests with real documents
5. Iterate on prompts if needed
6. Deploy to production

## Maintenance

### Weekly
- Review Langfuse traces for errors
- Monitor cost per extraction
- Check accuracy metrics

### Monthly
- Re-run accuracy tests
- Update ground truth dataset
- Optimize prompts if needed

### As Needed
- Add new fund name patterns
- Handle new document formats
- Adjust confidence thresholds

## Support

For questions or issues:
- Check Langfuse traces for debugging
- Review accuracy report for patterns
- Contact AI/ML Agent for prompt updates
- See agent spec: `agents/ai-ml-agent.md`
