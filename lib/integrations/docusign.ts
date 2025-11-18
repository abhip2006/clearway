/**
 * DocuSign Integration Service
 * Task INT-EXP-002: DocuSign Integration
 *
 * Features:
 * - Send documents for e-signature
 * - Track signature status
 * - Webhook support for status updates
 * - Multiple signer support
 * - JWT authentication
 */

import { db } from '@/lib/db';

interface Signer {
  email: string;
  name: string;
  role: string;
  routingOrder?: number;
}

interface SendForSignatureParams {
  capitalCallId: string;
  signers: Signer[];
  emailSubject?: string;
  emailMessage?: string;
}

interface EnvelopeStatus {
  envelopeId: string;
  status: string;
  sentDateTime?: string;
  deliveredDateTime?: string;
  completedDateTime?: string;
  recipients?: any[];
}

export class DocuSignService {
  private integrationKey: string;
  private userId: string;
  private accountId: string;
  private basePath: string;
  private oauthBasePath: string;
  private privateKey: string;

  constructor() {
    this.integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY || '';
    this.userId = process.env.DOCUSIGN_USER_ID || '';
    this.accountId = process.env.DOCUSIGN_ACCOUNT_ID || '';
    this.basePath = process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi';
    this.oauthBasePath = process.env.DOCUSIGN_OAUTH_BASE_PATH || 'account-d.docusign.com';
    this.privateKey = process.env.DOCUSIGN_PRIVATE_KEY || '';

    if (!this.integrationKey || !this.userId) {
      console.warn('DocuSign credentials not configured');
    }
  }

  /**
   * Send capital call document for signature
   */
  async sendForSignature(params: SendForSignatureParams) {
    const capitalCall = await db.capitalCall.findUnique({
      where: { id: params.capitalCallId },
      include: {
        document: true,
      },
    });

    if (!capitalCall) {
      throw new Error('Capital call not found');
    }

    if (!capitalCall.document) {
      throw new Error('Capital call has no associated document');
    }

    // Get access token
    const accessToken = await this.getAccessToken();

    // Get document as base64
    const documentBase64 = await this.getDocumentBase64(capitalCall.document.fileUrl);

    // Create envelope definition
    const envelope = {
      emailSubject: params.emailSubject || `Please Sign: ${capitalCall.fundName} Capital Call`,
      emailBlurb: params.emailMessage || `Please review and sign the capital call document for ${capitalCall.fundName}.`,
      status: 'sent', // Send immediately
      documents: [
        {
          documentBase64,
          name: capitalCall.document.fileName,
          fileExtension: 'pdf',
          documentId: '1',
        },
      ],
      recipients: {
        signers: params.signers.map((signer, index) => ({
          email: signer.email,
          name: signer.name,
          recipientId: String(index + 1),
          routingOrder: String(signer.routingOrder || index + 1),
          tabs: {
            signHereTabs: [
              {
                anchorString: '/sig/',
                anchorXOffset: '10',
                anchorYOffset: '10',
                anchorUnits: 'pixels',
              },
            ],
            dateSignedTabs: [
              {
                anchorString: '/date/',
                anchorXOffset: '10',
                anchorYOffset: '10',
                anchorUnits: 'pixels',
              },
            ],
          },
        })),
      },
    };

    // Send to DocuSign
    const response = await fetch(
      `${this.basePath}/v2.1/accounts/${this.accountId}/envelopes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(envelope),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DocuSign API error: ${error}`);
    }

    const result = await response.json();

    // Store signature request
    await db.signatureRequest.create({
      data: {
        capitalCallId: params.capitalCallId,
        provider: 'DOCUSIGN',
        envelopeId: result.envelopeId,
        status: 'SENT',
        signers: params.signers.map(s => s.email),
      },
    });

    return {
      success: true,
      envelopeId: result.envelopeId,
      status: result.status,
      uri: result.uri,
    };
  }

  /**
   * Check signature status
   */
  async checkStatus(envelopeId: string): Promise<EnvelopeStatus> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `${this.basePath}/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch envelope status');
    }

    const envelope = await response.json();

    // Update database
    const signatureRequest = await db.signatureRequest.findUnique({
      where: { envelopeId },
    });

    if (signatureRequest) {
      await db.signatureRequest.update({
        where: { envelopeId },
        data: {
          status: envelope.status.toUpperCase(),
          completedAt: envelope.status === 'completed' ? new Date() : null,
        },
      });
    }

    return {
      envelopeId: envelope.envelopeId,
      status: envelope.status,
      sentDateTime: envelope.sentDateTime,
      deliveredDateTime: envelope.deliveredDateTime,
      completedDateTime: envelope.completedDateTime,
    };
  }

  /**
   * Get envelope recipients and their signing status
   */
  async getRecipients(envelopeId: string) {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `${this.basePath}/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/recipients`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch envelope recipients');
    }

    return await response.json();
  }

  /**
   * Download completed document
   */
  async downloadDocument(envelopeId: string, documentId: string = '1'): Promise<Buffer> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `${this.basePath}/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/documents/${documentId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to download document');
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Void/cancel an envelope
   */
  async voidEnvelope(envelopeId: string, reason: string = 'Cancelled by user') {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `${this.basePath}/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'voided',
          voidedReason: reason,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to void envelope');
    }

    // Update database
    await db.signatureRequest.update({
      where: { envelopeId },
      data: {
        status: 'VOIDED',
      },
    });

    return await response.json();
  }

  /**
   * Resend envelope notification
   */
  async resendNotification(envelopeId: string) {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `${this.basePath}/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/notification`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expirations: {
            expireEnabled: 'true',
            expireAfter: '120',
            expireWarn: '20',
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to resend notification');
    }

    return await response.json();
  }

  /**
   * Get access token using JWT
   */
  private async getAccessToken(): Promise<string> {
    // In production, implement JWT token caching
    // For now, we'll use a simplified approach

    if (!this.privateKey) {
      throw new Error('DocuSign private key not configured');
    }

    // Create JWT assertion
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      iss: this.integrationKey,
      sub: this.userId,
      aud: this.oauthBasePath,
      iat: now,
      exp: now + 3600,
      scope: 'signature impersonation',
    };

    // In a real implementation, you'd sign this with the private key
    // For this example, we'll assume JWT signing is handled elsewhere
    // const jwt = await this.signJWT(jwtPayload, this.privateKey);

    // For development, return a placeholder
    // In production, replace with actual JWT token request
    if (process.env.DOCUSIGN_ACCESS_TOKEN) {
      return process.env.DOCUSIGN_ACCESS_TOKEN;
    }

    throw new Error('DocuSign access token not available. Configure DOCUSIGN_ACCESS_TOKEN or implement JWT signing.');
  }

  /**
   * Fetch document and convert to base64
   */
  private async getDocumentBase64(fileUrl: string): Promise<string> {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer.toString('base64');
    } catch (error) {
      throw new Error(`Failed to fetch document: ${error}`);
    }
  }

  /**
   * Verify DocuSign webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, hmacKey: string): boolean {
    const crypto = require('crypto');
    const computedSignature = crypto
      .createHmac('sha256', hmacKey)
      .update(payload)
      .digest('base64');

    return computedSignature === signature;
  }

  /**
   * Process DocuSign webhook event
   */
  async processWebhookEvent(event: any) {
    const envelopeId = event.data?.envelopeId;
    const status = event.event;

    if (!envelopeId) {
      throw new Error('Invalid webhook event: missing envelopeId');
    }

    // Map DocuSign event to our status
    const statusMap: Record<string, string> = {
      'envelope-sent': 'SENT',
      'envelope-delivered': 'DELIVERED',
      'envelope-completed': 'COMPLETED',
      'envelope-declined': 'DECLINED',
      'envelope-voided': 'VOIDED',
    };

    const mappedStatus = statusMap[status] || 'UNKNOWN';

    // Update signature request
    await db.signatureRequest.update({
      where: { envelopeId },
      data: {
        status: mappedStatus,
        completedAt: mappedStatus === 'COMPLETED' ? new Date() : null,
      },
    });

    return { success: true, envelopeId, status: mappedStatus };
  }
}

// Export singleton instance
export const docuSignService = new DocuSignService();
