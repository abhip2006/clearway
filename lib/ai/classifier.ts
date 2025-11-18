// lib/ai/classifier.ts
// AI-ADV-001: Document Classification Engine
// Advanced AI Agent - Week 15-16

import { Anthropic } from '@anthropic-ai/sdk';
import { db } from '../db';
import { extractTextFromPDF } from './ocr';
import { inngest } from '../inngest';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export enum DocumentType {
  CAPITAL_CALL = 'CAPITAL_CALL',
  DISTRIBUTION_NOTICE = 'DISTRIBUTION_NOTICE',
  K1_TAX_FORM = 'K1_TAX_FORM',
  QUARTERLY_REPORT = 'QUARTERLY_REPORT',
  ANNUAL_REPORT = 'ANNUAL_REPORT',
  SUBSCRIPTION_AGREEMENT = 'SUBSCRIPTION_AGREEMENT',
  AMENDMENT = 'AMENDMENT',
  OTHER = 'OTHER',
}

export interface ClassificationResult {
  type: DocumentType;
  confidence: number;
  reasoning: string;
  suggestedActions: string[];
}

export class DocumentClassifier {
  /**
   * Classify a document using Claude 3.5 Sonnet
   * Uses advanced prompt engineering for high accuracy
   */
  async classifyDocument(documentText: string): Promise<ClassificationResult> {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      temperature: 0, // Deterministic for classification
      messages: [
        {
          role: 'user',
          content: `You are an expert financial document classifier for private equity and alternative investment documents.

Your task is to classify the following document into ONE of these categories:

1. CAPITAL_CALL
   - Notice to investors to contribute capital to a fund
   - Contains: fund name, amount due, due date, wire instructions
   - Keywords: "capital call", "capital contribution", "drawdown", "funding notice"
   - Usually includes wire transfer instructions

2. DISTRIBUTION_NOTICE
   - Notice of fund distributions/returns to investors
   - Contains: distribution amount, payment date, tax information
   - Keywords: "distribution", "return of capital", "dividend", "proceeds"

3. K1_TAX_FORM
   - Schedule K-1 tax form (Form 1065)
   - Contains: partnership income, deductions, credits
   - Keywords: "Schedule K-1", "Form 1065", "Partner's Share", "IRS"

4. QUARTERLY_REPORT
   - Fund performance report (quarterly)
   - Contains: NAV, returns, portfolio updates
   - Keywords: "quarterly report", "Q1", "Q2", "Q3", "Q4", "three months ended"

5. ANNUAL_REPORT
   - Fund performance report (annual)
   - Contains: annual returns, audited financials
   - Keywords: "annual report", "year ended", "audited financial statements"

6. SUBSCRIPTION_AGREEMENT
   - Initial investment agreement for joining a fund
   - Contains: commitment amount, investor qualifications, terms
   - Keywords: "subscription agreement", "limited partnership agreement", "commitment"

7. AMENDMENT
   - Amendment to fund documents (LPA, subscription, etc.)
   - Keywords: "amendment", "modification", "revised", "supplemental"

8. OTHER
   - None of the above categories

Document text (first 2000 characters):
${documentText.substring(0, 2000)}

Analyze the document carefully and respond with ONLY a JSON object in this exact format:
{
  "type": "CAPITAL_CALL",
  "confidence": 0.95,
  "reasoning": "Document contains clear capital call language with fund name, amount due ($250,000), due date (December 15, 2025), and wire instructions to JPMorgan Chase. The header states 'Capital Call Notice' and includes typical capital call structure.",
  "suggestedActions": ["Extract capital call details", "Send payment reminder", "Verify wire instructions"]
}

Confidence score guidelines:
- 0.95-1.0: Extremely confident, clear indicators present
- 0.85-0.94: Very confident, most indicators present
- 0.75-0.84: Confident, key indicators present
- 0.60-0.74: Moderately confident, some ambiguity
- Below 0.60: Low confidence, flag for manual review

Suggested actions should be specific and actionable based on the document type.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      type: result.type as DocumentType,
      confidence: result.confidence,
      reasoning: result.reasoning,
      suggestedActions: result.suggestedActions || [],
    };
  }

  /**
   * Route document to appropriate processor based on classification
   * This is the main entry point for intelligent document routing
   */
  async routeDocument(documentId: string): Promise<ClassificationResult> {
    const document = await db.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Step 1: Extract text from PDF
    console.log(`Extracting text from document ${documentId}...`);
    const text = await extractTextFromPDF(document.fileUrl);

    // Step 2: Classify document
    console.log(`Classifying document ${documentId}...`);
    const classification = await this.classifyDocument(text);

    console.log(`Document classified as ${classification.type} with confidence ${classification.confidence}`);

    // Step 3: Update document with classification (will be persisted when schema is updated)
    // For now, we'll store in rawExtraction field or skip DB update
    // await db.document.update({
    //   where: { id: documentId },
    //   data: {
    //     documentType: classification.type,
    //     classificationConfidence: classification.confidence,
    //     classificationReasoning: classification.reasoning,
    //     suggestedActions: classification.suggestedActions,
    //   },
    // });

    // Step 4: Route to appropriate processor based on classification
    await this.triggerProcessingWorkflow(documentId, classification);

    return classification;
  }

  /**
   * Trigger appropriate processing workflow based on classification
   */
  private async triggerProcessingWorkflow(
    documentId: string,
    classification: ClassificationResult
  ): Promise<void> {
    // Only process if confidence is high enough
    if (classification.confidence < 0.75) {
      console.log(`Low confidence (${classification.confidence}), flagging for manual review`);
      await db.document.update({
        where: { id: documentId },
        data: { status: 'REVIEW' },
      });
      return;
    }

    // Route based on document type
    switch (classification.type) {
      case DocumentType.CAPITAL_CALL:
        console.log(`Routing to capital call processor...`);
        await inngest.send({
          name: 'document.process.capital-call',
          data: { documentId },
        });
        break;

      case DocumentType.DISTRIBUTION_NOTICE:
        console.log(`Routing to distribution processor...`);
        await inngest.send({
          name: 'document.process.distribution',
          data: { documentId },
        });
        break;

      case DocumentType.K1_TAX_FORM:
        console.log(`Routing to K-1 processor...`);
        await inngest.send({
          name: 'document.process.k1',
          data: { documentId },
        });
        break;

      case DocumentType.QUARTERLY_REPORT:
      case DocumentType.ANNUAL_REPORT:
        console.log(`Routing to report processor...`);
        await inngest.send({
          name: 'document.process.report',
          data: { documentId, reportType: classification.type },
        });
        break;

      default:
        // Store classification but don't process
        console.log(`Document type ${classification.type} - storing without processing`);
        // await db.document.update({
        //   where: { id: documentId },
        //   data: { status: 'CLASSIFIED' },
        // });
    }
  }

  /**
   * Batch classify multiple documents
   * Useful for classifying documents already in the system
   */
  async classifyBatch(documentIds: string[]): Promise<Map<string, ClassificationResult>> {
    const results = new Map<string, ClassificationResult>();

    for (const documentId of documentIds) {
      try {
        const classification = await this.routeDocument(documentId);
        results.set(documentId, classification);
      } catch (error) {
        console.error(`Failed to classify document ${documentId}:`, error);
      }
    }

    return results;
  }
}

/**
 * Singleton instance
 */
export const documentClassifier = new DocumentClassifier();
