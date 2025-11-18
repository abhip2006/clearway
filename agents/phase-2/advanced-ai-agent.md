# Advanced AI Agent 🤖

## Role
Specialized agent responsible for advanced AI/ML capabilities beyond basic extraction: document classification, anomaly detection, fraud detection, predictive analytics, NLP processing, and intelligent automation. Enables Clearway to provide AI-powered insights and recommendations.

## Primary Responsibilities

1. **Document Classification**
   - Auto-categorize documents (capital call, distribution notice, K-1, etc.)
   - Confidence-based routing
   - Multi-language support
   - Custom document type training

2. **Anomaly Detection**
   - Unusual amount patterns
   - Timing anomalies
   - Duplicate detection
   - Fraud indicators
   - Data quality issues

3. **Intelligent Extraction Enhancement**
   - Context-aware field extraction
   - Cross-document validation
   - Historical pattern learning
   - Self-improving extraction models

4. **Natural Language Processing**
   - Email parsing for capital call info
   - Investor question answering
   - Document summarization
   - Sentiment analysis on communications

5. **Recommendation Engine**
   - Payment timing recommendations
   - Cash management suggestions
   - Fund allocation insights
   - Risk mitigation recommendations

## Tech Stack

### ML Frameworks
- **TensorFlow.js** for in-browser ML
- **Scikit-learn** (Python microservice)
- **Hugging Face Transformers** for NLP

### AI Services
- **Claude 3.5 Sonnet** for advanced reasoning
- **GPT-4 Vision** for document analysis
- **AWS Comprehend** for NLP

### Vector Database
- **Pinecone** for semantic search
- **Weaviate** for document embeddings

## Phase 2 Features

### Week 15-16: Advanced Document Intelligence

**Task AI-ADV-001: Document Classification Engine**
```typescript
// lib/ai/classifier.ts

import { Anthropic } from '@anthropic-ai/sdk';

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

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export class DocumentClassifier {
  async classifyDocument(documentText: string): Promise<{
    type: DocumentType;
    confidence: number;
    reasoning: string;
    suggestedActions: string[];
  }> {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a financial document classifier. Analyze the following document and determine its type.

Document text (first 2000 characters):
${documentText.substring(0, 2000)}

Classify this document into ONE of these types:
- CAPITAL_CALL: Notice to investors to contribute capital
- DISTRIBUTION_NOTICE: Notice of fund distributions/returns
- K1_TAX_FORM: Schedule K-1 tax form
- QUARTERLY_REPORT: Fund performance report (quarterly)
- ANNUAL_REPORT: Fund performance report (annual)
- SUBSCRIPTION_AGREEMENT: Initial investment agreement
- AMENDMENT: Amendment to fund documents
- OTHER: None of the above

Respond in JSON format:
{
  "type": "CAPITAL_CALL",
  "confidence": 0.95,
  "reasoning": "Document contains capital call language, wire instructions, and due date",
  "suggestedActions": ["Extract capital call details", "Send payment reminder"]
}`,
      }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const result = JSON.parse(content.text);
    return {
      type: result.type as DocumentType,
      confidence: result.confidence,
      reasoning: result.reasoning,
      suggestedActions: result.suggestedActions,
    };
  }

  /**
   * Route document to appropriate processor based on classification
   */
  async routeDocument(documentId: string) {
    const document = await db.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Get document text from OCR
    const text = await extractTextFromPDF(document.fileUrl);

    // Classify
    const classification = await this.classifyDocument(text);

    // Update document with classification
    await db.document.update({
      where: { id: documentId },
      data: {
        documentType: classification.type,
        classificationConfidence: classification.confidence,
        classificationReasoning: classification.reasoning,
      },
    });

    // Route to appropriate processor
    switch (classification.type) {
      case DocumentType.CAPITAL_CALL:
        await inngest.send({
          name: 'document.process.capital-call',
          data: { documentId },
        });
        break;

      case DocumentType.DISTRIBUTION_NOTICE:
        await inngest.send({
          name: 'document.process.distribution',
          data: { documentId },
        });
        break;

      case DocumentType.K1_TAX_FORM:
        await inngest.send({
          name: 'document.process.k1',
          data: { documentId },
        });
        break;

      default:
        // Store but don't process
        await db.document.update({
          where: { id: documentId },
          data: { status: 'CLASSIFIED' },
        });
    }

    return classification;
  }
}
```

**Task AI-ADV-002: Anomaly Detection System**
```typescript
// lib/ai/anomaly-detection.ts

export class AnomalyDetector {
  /**
   * Detect unusual capital call amounts
   */
  async detectAmountAnomalies(capitalCall: {
    fundName: string;
    amountDue: number;
    userId: string;
  }): Promise<{
    isAnomaly: boolean;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    reason: string;
    historicalAverage: number;
    standardDeviations: number;
  }> {
    // Get historical capital calls for this fund
    const historical = await db.capitalCall.findMany({
      where: {
        fundName: capitalCall.fundName,
        userId: capitalCall.userId,
        status: { in: ['APPROVED', 'PAID'] },
      },
      orderBy: { dueDate: 'desc' },
      take: 20,
    });

    if (historical.length < 3) {
      return {
        isAnomaly: false,
        severity: 'LOW',
        reason: 'Insufficient historical data',
        historicalAverage: 0,
        standardDeviations: 0,
      };
    }

    // Calculate statistics
    const amounts = historical.map(cc => cc.amountDue.toNumber());
    const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    // Z-score: how many standard deviations from mean
    const zScore = (capitalCall.amountDue - average) / stdDev;

    let isAnomaly = false;
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let reason = '';

    if (Math.abs(zScore) > 3) {
      isAnomaly = true;
      severity = 'HIGH';
      reason = `Amount is ${Math.abs(zScore).toFixed(1)} standard deviations from historical average`;
    } else if (Math.abs(zScore) > 2) {
      isAnomaly = true;
      severity = 'MEDIUM';
      reason = `Amount is ${Math.abs(zScore).toFixed(1)} standard deviations from historical average`;
    }

    return {
      isAnomaly,
      severity,
      reason: reason || 'Amount within normal range',
      historicalAverage: average,
      standardDeviations: zScore,
    };
  }

  /**
   * Detect duplicate capital calls
   */
  async detectDuplicates(capitalCall: {
    fundName: string;
    amountDue: number;
    dueDate: Date;
    userId: string;
  }): Promise<{
    isDuplicate: boolean;
    matchedCallId?: string;
    similarity: number;
  }> {
    // Find potential duplicates
    const potentialDuplicates = await db.capitalCall.findMany({
      where: {
        userId: capitalCall.userId,
        fundName: capitalCall.fundName,
        amountDue: {
          gte: capitalCall.amountDue * 0.95,
          lte: capitalCall.amountDue * 1.05,
        },
        dueDate: {
          gte: new Date(capitalCall.dueDate.getTime() - 7 * 24 * 60 * 60 * 1000),
          lte: new Date(capitalCall.dueDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
        status: { not: 'REJECTED' },
      },
    });

    if (potentialDuplicates.length === 0) {
      return { isDuplicate: false, similarity: 0 };
    }

    // Calculate similarity score
    for (const duplicate of potentialDuplicates) {
      const amountSimilarity = 1 - Math.abs(duplicate.amountDue.toNumber() - capitalCall.amountDue) / capitalCall.amountDue;
      const dateSimilarity = 1 - Math.abs(duplicate.dueDate.getTime() - capitalCall.dueDate.getTime()) / (7 * 24 * 60 * 60 * 1000);
      const similarity = (amountSimilarity + dateSimilarity) / 2;

      if (similarity > 0.9) {
        return {
          isDuplicate: true,
          matchedCallId: duplicate.id,
          similarity,
        };
      }
    }

    return { isDuplicate: false, similarity: 0 };
  }

  /**
   * Detect fraud indicators
   */
  async detectFraudIndicators(capitalCall: {
    fundName: string;
    bankName: string;
    accountNumber: string;
    wireReference: string;
  }): Promise<{
    riskScore: number;
    indicators: string[];
    requiresManualReview: boolean;
  }> {
    const indicators: string[] = [];
    let riskScore = 0;

    // Check if wire instructions changed
    const historicalCalls = await db.capitalCall.findMany({
      where: { fundName: capitalCall.fundName },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    const uniqueBanks = new Set(historicalCalls.map(cc => cc.bankName));
    if (uniqueBanks.size > 1 && !uniqueBanks.has(capitalCall.bankName)) {
      indicators.push('Wire instructions bank changed from historical pattern');
      riskScore += 30;
    }

    // Check for suspicious patterns in wire reference
    if (capitalCall.wireReference.match(/urgent|immediately|asap/i)) {
      indicators.push('Wire reference contains urgency language');
      riskScore += 20;
    }

    // Check account number format
    if (capitalCall.accountNumber.length < 8 || capitalCall.accountNumber.length > 17) {
      indicators.push('Unusual account number length');
      riskScore += 10;
    }

    // Domain reputation check for email-based verification
    // (Would integrate with email security service)

    return {
      riskScore,
      indicators,
      requiresManualReview: riskScore >= 50,
    };
  }
}
```

**Task AI-ADV-003: Intelligent Email Parsing**
```typescript
// lib/ai/email-parser.ts

export class EmailCapitalCallParser {
  async parseEmailForCapitalCall(emailContent: {
    subject: string;
    body: string;
    from: string;
    attachments: string[];
  }): Promise<{
    hasCapitalCall: boolean;
    confidence: number;
    extractedData?: {
      fundName?: string;
      amountDue?: number;
      dueDate?: Date;
      wireInstructions?: any;
    };
    attachmentToProcess?: string;
  }> {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Analyze this email for capital call information.

Subject: ${emailContent.subject}
From: ${emailContent.from}
Attachments: ${emailContent.attachments.join(', ')}

Body:
${emailContent.body}

Determine:
1. Is this a capital call notice? (true/false)
2. Can you extract capital call details from the email body?
3. Which attachment (if any) contains the formal capital call notice?

Respond in JSON:
{
  "hasCapitalCall": true,
  "confidence": 0.95,
  "extractedData": {
    "fundName": "Apollo Fund XI",
    "amountDue": 250000,
    "dueDate": "2025-12-15",
    "wireInstructions": { ... }
  },
  "attachmentToProcess": "Capital_Call_Notice.pdf"
}`,
      }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const result = JSON.parse(content.text);

    return {
      hasCapitalCall: result.hasCapitalCall,
      confidence: result.confidence,
      extractedData: result.extractedData,
      attachmentToProcess: result.attachmentToProcess,
    };
  }

  /**
   * Auto-process capital call emails
   */
  async processCapitalCallEmail(emailId: string) {
    const email = await this.fetchEmail(emailId);
    const analysis = await this.parseEmailForCapitalCall(email);

    if (analysis.hasCapitalCall && analysis.confidence > 0.8) {
      // Create document from attachment
      if (analysis.attachmentToProcess) {
        const documentId = await this.createDocumentFromAttachment(
          analysis.attachmentToProcess,
          email.from
        );

        // Trigger processing
        await inngest.send({
          name: 'document.uploaded',
          data: { documentId },
        });
      } else if (analysis.extractedData) {
        // Create capital call directly from email
        await db.capitalCall.create({
          data: {
            ...analysis.extractedData,
            source: 'EMAIL',
            status: 'PENDING_REVIEW',
            confidenceScores: { overall: analysis.confidence },
          },
        });
      }
    }
  }

  private async fetchEmail(emailId: string) {
    // Integration with email provider (Gmail API, etc.)
    throw new Error('Not implemented');
  }

  private async createDocumentFromAttachment(filename: string, senderEmail: string) {
    // Download and create document
    throw new Error('Not implemented');
  }
}
```

---

**Advanced AI Agent ready to provide intelligent automation and insights beyond basic extraction.**
