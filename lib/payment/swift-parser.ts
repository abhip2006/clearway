// Payment Processing Agent - Task PAY-001: SWIFT Message Parser
// Parses SWIFT MT103 messages with fuzzy matching and confidence scoring

import { z } from 'zod';
import { db } from '@/lib/db';

const SwiftMT103Schema = z.object({
  messageType: z.literal('MT103'),
  senderReference: z.string(), // Field 20
  valueDate: z.string(), // Field 32A
  currency: z.string().length(3),
  amount: z.number(),
  orderingCustomer: z.string(), // Field 50K
  beneficiaryCustomer: z.string(), // Field 59
  remittanceInfo: z.string().optional(), // Field 70
  senderToReceiverInfo: z.string().optional(), // Field 72
});

export type SwiftMT103 = z.infer<typeof SwiftMT103Schema>;

export interface PaymentMatchResult {
  capitalCallId: string | null;
  confidence: number;
  matchedBy: 'reference' | 'amount' | 'fuzzy' | 'none';
}

export class SwiftMessageParser {
  /**
   * Parse a SWIFT MT103 message from raw text
   * @param rawMessage - Raw SWIFT message text
   * @returns Parsed SWIFT MT103 object
   */
  parseMessage(rawMessage: string): SwiftMT103 {
    const lines = rawMessage.split('\n');

    const parsed = {
      messageType: this.extractField(lines, 'MT103') as 'MT103',
      senderReference: this.extractField(lines, ':20:'),
      valueDate: this.extractField(lines, ':32A:').substring(0, 6),
      currency: this.extractField(lines, ':32A:').substring(6, 9),
      amount: parseFloat(
        this.extractField(lines, ':32A:').substring(9).replace(',', '.')
      ),
      orderingCustomer: this.extractField(lines, ':50K:'),
      beneficiaryCustomer: this.extractField(lines, ':59:'),
      remittanceInfo: this.extractField(lines, ':70:', false),
      senderToReceiverInfo: this.extractField(lines, ':72:', false),
    };

    return SwiftMT103Schema.parse(parsed);
  }

  /**
   * Extract a field value from SWIFT message lines
   * @param lines - Array of SWIFT message lines
   * @param fieldTag - Field tag to extract (e.g., ':20:')
   * @param required - Whether the field is required
   * @returns Extracted field value
   */
  private extractField(
    lines: string[],
    fieldTag: string,
    required = true
  ): string {
    const fieldLine = lines.find((line) => line.includes(fieldTag));

    if (!fieldLine && required) {
      throw new Error(
        `Required field ${fieldTag} not found in SWIFT message`
      );
    }

    if (!fieldLine) return '';

    // Extract field value (everything after the tag)
    return fieldLine
      .substring(fieldLine.indexOf(fieldTag) + fieldTag.length)
      .trim();
  }

  /**
   * Match a SWIFT message to a capital call using multiple strategies
   * Tries: 1) Wire reference, 2) Fuzzy matching with amount/fund name
   * @param swiftMessage - Parsed SWIFT MT103 message
   * @returns Match result with capital call ID, confidence score, and match method
   */
  async matchToCapitalCall(
    swiftMessage: SwiftMT103
  ): Promise<PaymentMatchResult> {
    // Strategy 1: Try exact wire reference match first
    const byReference = await db.capitalCall.findFirst({
      where: {
        wireReference: swiftMessage.senderReference,
        status: 'APPROVED',
      },
    });

    if (byReference) {
      return {
        capitalCallId: byReference.id,
        confidence: 1.0,
        matchedBy: 'reference',
      };
    }

    // Strategy 2: Try fuzzy match on remittance info
    const remittanceWords =
      swiftMessage.remittanceInfo?.toLowerCase().split(/\s+/) || [];

    // Find potential matches with similar amount and recent due date
    const potentialMatches = await db.capitalCall.findMany({
      where: {
        status: 'APPROVED',
        amountDue: {
          gte: swiftMessage.amount * 0.99, // 1% tolerance
          lte: swiftMessage.amount * 1.01,
        },
        currency: swiftMessage.currency,
        dueDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Within 30 days
        },
      },
    });

    // Score each potential match
    let bestMatch = null;
    let bestScore = 0;

    for (const call of potentialMatches) {
      let score = 0;

      // Exact amount match bonus
      if (Math.abs(call.amountDue.toNumber() - swiftMessage.amount) < 1) {
        score += 0.5;
      }

      // Fund name in remittance info
      const fundWords = call.fundName.toLowerCase().split(/\s+/);
      const matchedWords = fundWords.filter((word) =>
        remittanceWords.includes(word)
      );
      score += (matchedWords.length / fundWords.length) * 0.3;

      // Wire reference similarity
      if (call.wireReference && swiftMessage.senderReference) {
        const similarity = this.stringSimilarity(
          call.wireReference,
          swiftMessage.senderReference
        );
        score += similarity * 0.2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = call;
      }
    }

    // Require 70% confidence for fuzzy match
    if (bestScore > 0.7) {
      return {
        capitalCallId: bestMatch!.id,
        confidence: bestScore,
        matchedBy: 'fuzzy',
      };
    }

    return {
      capitalCallId: null,
      confidence: 0,
      matchedBy: 'none',
    };
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Similarity score between 0 and 1
   */
  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Edit distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

// Export singleton instance
export const swiftParser = new SwiftMessageParser();
