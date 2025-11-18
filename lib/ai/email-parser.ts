// lib/ai/email-parser.ts
// AI-ADV-003: Intelligent Email Parsing
// Advanced AI Agent - Week 15-16

import { Anthropic } from '@anthropic-ai/sdk';
import { db } from '../db';
import { inngest } from '../inngest';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface EmailContent {
  subject: string;
  body: string;
  from: string;
  attachments: string[];
  receivedAt?: Date;
}

export interface CapitalCallEmailData {
  fundName?: string;
  amountDue?: number;
  dueDate?: Date;
  wireInstructions?: {
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
    wireReference?: string;
  };
  investorEmail?: string;
  investorAccount?: string;
}

export interface EmailParsingResult {
  hasCapitalCall: boolean;
  confidence: number;
  extractedData?: CapitalCallEmailData;
  attachmentToProcess?: string;
  reasoning: string;
}

export class EmailCapitalCallParser {
  /**
   * Parse email for capital call information using Claude 3.5 Sonnet
   * Uses advanced NLP to extract structured data from unstructured email text
   */
  async parseEmailForCapitalCall(
    emailContent: EmailContent
  ): Promise<EmailParsingResult> {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      temperature: 0, // Deterministic for extraction
      messages: [
        {
          role: 'user',
          content: `You are an expert at analyzing emails from fund administrators to identify and extract capital call information.

Analyze this email for capital call information:

Subject: ${emailContent.subject}
From: ${emailContent.from}
Attachments: ${emailContent.attachments.join(', ') || 'None'}

Email Body:
${emailContent.body.substring(0, 5000)}

Your task:
1. Determine if this email contains or relates to a capital call notice
2. Extract any capital call details directly from the email body
3. Identify which attachment (if any) contains the formal capital call notice

Look for:
- Fund name
- Capital call amount (may be stated as "capital contribution", "funding required", "amount due")
- Due date (may be stated as "payment deadline", "wire by", "due date")
- Wire instructions (bank name, account number, routing number, wire reference)
- Investor information (email, account number)

Common patterns:
- "Please remit $250,000 by December 15th"
- "Capital call for Apollo Fund XI"
- "Amount due: USD 150,000"
- "Wire instructions attached"
- "Capital Call Notice.pdf" in attachments

Respond with ONLY a JSON object in this exact format:
{
  "hasCapitalCall": true,
  "confidence": 0.95,
  "extractedData": {
    "fundName": "Apollo Fund XI",
    "amountDue": 250000,
    "dueDate": "2025-12-15",
    "wireInstructions": {
      "bankName": "JPMorgan Chase",
      "accountNumber": "12345678",
      "routingNumber": "021000021",
      "wireReference": "Apollo Fund XI - Capital Call"
    },
    "investorEmail": "investor@example.com",
    "investorAccount": "INV-12345"
  },
  "attachmentToProcess": "Capital_Call_Notice.pdf",
  "reasoning": "Email clearly states this is a capital call notice for Apollo Fund XI. Amount of $250,000 and due date of December 15, 2025 are explicitly mentioned. Wire instructions are provided in the email body. The attachment 'Capital_Call_Notice.pdf' likely contains the formal notice."
}

If no capital call information is found:
{
  "hasCapitalCall": false,
  "confidence": 0.95,
  "reasoning": "Email is a quarterly report notification and does not contain capital call information."
}

Guidelines:
- hasCapitalCall: true only if this is clearly a capital call related email
- confidence: 0-1 score based on clarity of indicators
  - 0.95-1.0: Explicit capital call language present
  - 0.85-0.94: Strong indicators present
  - 0.75-0.84: Moderate indicators
  - Below 0.75: Weak or ambiguous
- extractedData: Include only fields you can extract with confidence
  - Use null for missing fields
  - Convert amounts to numeric values (no $, commas)
  - Format dates as YYYY-MM-DD
- attachmentToProcess: The filename most likely to contain the capital call document
  - Look for "capital call", "drawdown", "funding notice" in filename
  - Common formats: PDF, DOCX
- reasoning: Explain your decision in 1-2 sentences

Important:
- Do NOT make up data - only extract what is explicitly stated
- Be conservative with confidence scores
- Prefer extracting data from email body when available
- Flag attachments that need to be processed separately`,
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

    // Convert date string to Date object if present
    if (result.extractedData?.dueDate) {
      result.extractedData.dueDate = new Date(result.extractedData.dueDate);
    }

    return {
      hasCapitalCall: result.hasCapitalCall,
      confidence: result.confidence,
      extractedData: result.extractedData,
      attachmentToProcess: result.attachmentToProcess,
      reasoning: result.reasoning,
    };
  }

  /**
   * Auto-process capital call emails
   * Creates capital call record or triggers document processing
   */
  async processCapitalCallEmail(
    emailId: string,
    emailContent: EmailContent,
    userId: string
  ): Promise<{ processed: boolean; capitalCallId?: string; documentId?: string }> {
    const analysis = await this.parseEmailForCapitalCall(emailContent);

    // Only process if confidence is high enough
    if (!analysis.hasCapitalCall || analysis.confidence < 0.75) {
      console.log(
        `Email ${emailId} does not contain capital call or confidence too low (${analysis.confidence})`
      );
      return { processed: false };
    }

    // Scenario 1: Attachment needs to be processed (most common)
    if (analysis.attachmentToProcess) {
      console.log(
        `Creating document from attachment: ${analysis.attachmentToProcess}`
      );
      // In a real implementation, this would:
      // 1. Download the attachment
      // 2. Upload to S3/R2
      // 3. Create Document record
      // 4. Trigger document processing pipeline
      // const documentId = await this.createDocumentFromAttachment(
      //   analysis.attachmentToProcess,
      //   emailContent.from,
      //   userId
      // );
      // await inngest.send({
      //   name: 'document.uploaded',
      //   data: { documentId },
      // });
      // return { processed: true, documentId };

      console.log('Attachment processing not yet implemented - would process attachment');
      return { processed: false };
    }

    // Scenario 2: Complete data extracted from email body
    if (
      analysis.extractedData &&
      analysis.extractedData.fundName &&
      analysis.extractedData.amountDue &&
      analysis.extractedData.dueDate
    ) {
      console.log('Creating capital call directly from email data');

      // Create capital call record directly from email
      const capitalCall = await db.capitalCall.create({
        data: {
          userId,
          fundName: analysis.extractedData.fundName,
          amountDue: analysis.extractedData.amountDue,
          dueDate: analysis.extractedData.dueDate,
          investorEmail: analysis.extractedData.investorEmail,
          investorAccount: analysis.extractedData.investorAccount,
          bankName: analysis.extractedData.wireInstructions?.bankName,
          accountNumber: analysis.extractedData.wireInstructions?.accountNumber,
          routingNumber: analysis.extractedData.wireInstructions?.routingNumber,
          wireReference: analysis.extractedData.wireInstructions?.wireReference,
          status: 'PENDING_REVIEW',
          confidenceScores: {
            overall: analysis.confidence,
            source: 'email',
          },
          rawExtraction: {
            emailSubject: emailContent.subject,
            emailFrom: emailContent.from,
            extractedAt: new Date().toISOString(),
            reasoning: analysis.reasoning,
          },
          // Note: documentId is required by schema but we don't have one for email-sourced calls
          // This would need schema update to make documentId optional
          documentId: 'email-source', // Placeholder - schema needs update
        },
      });

      console.log(`Created capital call ${capitalCall.id} from email`);
      return { processed: true, capitalCallId: capitalCall.id };
    }

    console.log('Insufficient data extracted from email');
    return { processed: false };
  }

  /**
   * Batch process multiple emails
   * Useful for processing inbox or email archive
   */
  async processBatch(
    emails: Array<{ id: string; content: EmailContent; userId: string }>
  ): Promise<Array<{ emailId: string; result: any }>> {
    const results = [];

    for (const email of emails) {
      try {
        const result = await this.processCapitalCallEmail(
          email.id,
          email.content,
          email.userId
        );
        results.push({ emailId: email.id, result });
      } catch (error) {
        console.error(`Failed to process email ${email.id}:`, error);
        results.push({
          emailId: email.id,
          result: { processed: false, error: (error as Error).message },
        });
      }
    }

    return results;
  }

  /**
   * Helper: Create document from email attachment
   * This would integrate with email provider (Gmail API, etc.)
   */
  private async createDocumentFromAttachment(
    filename: string,
    senderEmail: string,
    userId: string
  ): Promise<string> {
    // In real implementation:
    // 1. Download attachment using email provider API
    // 2. Upload to S3/R2 storage
    // 3. Create Document record
    // 4. Return document ID
    throw new Error('Attachment processing not yet implemented');
  }

  /**
   * Helper: Fetch email from provider
   * This would integrate with email provider (Gmail API, etc.)
   */
  private async fetchEmail(emailId: string): Promise<EmailContent> {
    // In real implementation:
    // 1. Connect to email provider API (Gmail, Outlook, etc.)
    // 2. Fetch email by ID
    // 3. Extract subject, body, attachments
    // 4. Return EmailContent object
    throw new Error('Email fetching not yet implemented');
  }
}

/**
 * Singleton instance
 */
export const emailParser = new EmailCapitalCallParser();
