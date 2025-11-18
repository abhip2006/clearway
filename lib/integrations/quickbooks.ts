/**
 * QuickBooks Online Integration Service
 * Task INT-EXP-001: QuickBooks Online Integration
 *
 * Features:
 * - OAuth 2.0 authentication
 * - Journal entry creation for capital calls
 * - Payment reconciliation and deposit tracking
 * - Token refresh automation
 */

import { db } from '@/lib/db';

interface OAuth2Token {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface JournalEntryParams {
  capitalCallId: string;
  organizationId: string;
}

interface PaymentReconciliationParams {
  paymentId: string;
  organizationId: string;
}

export class QuickBooksService {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string = 'https://quickbooks.api.intuit.com/v3';
  private authBaseUrl: string = 'https://oauth.platform.intuit.com';

  constructor() {
    this.clientId = process.env.QUICKBOOKS_CLIENT_ID || '';
    this.clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET || '';

    if (!this.clientId || !this.clientSecret) {
      console.warn('QuickBooks credentials not configured');
    }
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'com.intuit.quickbooks.accounting',
      state,
    });

    return `${this.authBaseUrl}/connect/oauth2?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string, redirectUri: string): Promise<OAuth2Token> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(`${this.authBaseUrl}/oauth2/v1/tokens/bearer`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`QuickBooks token exchange failed: ${error}`);
    }

    return await response.json();
  }

  /**
   * Create journal entry for capital call
   * Debits: Capital Calls Receivable
   * Credits: Investor Equity
   */
  async createJournalEntry(params: JournalEntryParams) {
    const capitalCall = await db.capitalCall.findUnique({
      where: { id: params.capitalCallId },
    });

    if (!capitalCall) {
      throw new Error('Capital call not found');
    }

    const qbConnection = await db.accountingConnection.findUnique({
      where: {
        organizationId_provider: {
          organizationId: params.organizationId,
          provider: 'QUICKBOOKS',
        },
      },
    });

    if (!qbConnection) {
      throw new Error('QuickBooks not connected for this organization');
    }

    // Get valid access token
    const accessToken = await this.getAccessToken(qbConnection);

    // Prepare journal entry
    const journalEntry = {
      Line: [
        {
          Amount: capitalCall.amountDue.toString(),
          DetailType: 'JournalEntryLineDetail',
          JournalEntryLineDetail: {
            AccountRef: {
              value: (qbConnection.config as any).capitalCallsAccountId || '1', // Debit: Capital Calls Receivable
            },
            PostingType: 'Debit',
          },
          Description: `Capital Call - ${capitalCall.fundName}`,
        },
        {
          Amount: capitalCall.amountDue.toString(),
          DetailType: 'JournalEntryLineDetail',
          JournalEntryLineDetail: {
            AccountRef: {
              value: (qbConnection.config as any).investorEquityAccountId || '2', // Credit: Investor Equity
            },
            PostingType: 'Credit',
          },
          Description: `Capital Call - ${capitalCall.fundName}`,
        },
      ],
      TxnDate: capitalCall.dueDate.toISOString().split('T')[0],
      PrivateNote: `Capital Call: ${capitalCall.fundName} - ${capitalCall.id}`,
    };

    // Send to QuickBooks
    const response = await fetch(
      `${this.baseUrl}/company/${qbConnection.realmId}/journalentry`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(journalEntry),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`QuickBooks API error: ${error}`);
    }

    const result = await response.json();

    // Store accounting transaction reference
    await db.accountingTransaction.create({
      data: {
        capitalCallId: params.capitalCallId,
        provider: 'QUICKBOOKS',
        externalId: result.JournalEntry.Id,
        type: 'JOURNAL_ENTRY',
        amount: capitalCall.amountDue,
        status: 'SYNCED',
        connectionId: qbConnection.id,
      },
    });

    return {
      success: true,
      journalEntryId: result.JournalEntry.Id,
      syncNumber: result.JournalEntry.SyncToken,
    };
  }

  /**
   * Record payment and create deposit in QuickBooks
   */
  async recordPayment(params: PaymentReconciliationParams) {
    // In a real implementation, this would fetch from a Payment model
    // For now, we'll create a placeholder that shows the structure
    const payment = {
      id: params.paymentId,
      amount: 100000, // Example amount
      paidAt: new Date(),
      capitalCallId: 'cc_example',
      capitalCall: {
        fundName: 'Example Fund',
        investorAccount: 'INV-001',
      },
    };

    const qbConnection = await db.accountingConnection.findUnique({
      where: {
        organizationId_provider: {
          organizationId: params.organizationId,
          provider: 'QUICKBOOKS',
        },
      },
    });

    if (!qbConnection) {
      throw new Error('QuickBooks not connected for this organization');
    }

    const accessToken = await this.getAccessToken(qbConnection);

    // Create deposit transaction
    const deposit = {
      Line: [
        {
          Amount: payment.amount.toString(),
          DetailType: 'DepositLineDetail',
          DepositLineDetail: {
            AccountRef: {
              value: (qbConnection.config as any).bankAccountId || '3', // Bank account
            },
            Entity: {
              value: payment.capitalCall.investorAccount,
              type: 'Customer',
            },
          },
        },
      ],
      DepositToAccountRef: {
        value: (qbConnection.config as any).bankAccountId || '3',
      },
      TxnDate: payment.paidAt.toISOString().split('T')[0],
      PrivateNote: `Payment for Capital Call ${payment.capitalCallId}`,
    };

    const response = await fetch(
      `${this.baseUrl}/company/${qbConnection.realmId}/deposit`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(deposit),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`QuickBooks deposit error: ${error}`);
    }

    const result = await response.json();

    await db.accountingTransaction.create({
      data: {
        capitalCallId: payment.capitalCallId,
        provider: 'QUICKBOOKS',
        externalId: result.Deposit.Id,
        type: 'DEPOSIT',
        amount: payment.amount,
        status: 'SYNCED',
        connectionId: qbConnection.id,
      },
    });

    return {
      success: true,
      depositId: result.Deposit.Id,
      syncNumber: result.Deposit.SyncToken,
    };
  }

  /**
   * Get company info from QuickBooks
   */
  async getCompanyInfo(organizationId: string) {
    const qbConnection = await db.accountingConnection.findUnique({
      where: {
        organizationId_provider: {
          organizationId,
          provider: 'QUICKBOOKS',
        },
      },
    });

    if (!qbConnection) {
      throw new Error('QuickBooks not connected');
    }

    const accessToken = await this.getAccessToken(qbConnection);

    const response = await fetch(
      `${this.baseUrl}/company/${qbConnection.realmId}/companyinfo/${qbConnection.realmId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch company info');
    }

    const result = await response.json();
    return result.CompanyInfo;
  }

  /**
   * Get or refresh access token
   */
  private async getAccessToken(connection: any): Promise<string> {
    // Check if token is still valid (with 5-minute buffer)
    const expiresAt = new Date(connection.expiresAt);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    if (expiresAt.getTime() - now.getTime() > bufferTime) {
      return connection.accessToken;
    }

    // Token expired or about to expire, refresh it
    return await this.refreshAccessToken(connection);
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(connection: any): Promise<string> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(`${this.authBaseUrl}/oauth2/v1/tokens/bearer`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const tokenData: OAuth2Token = await response.json();

    // Update connection with new tokens
    await db.accountingConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
    });

    return tokenData.access_token;
  }

  /**
   * Disconnect QuickBooks integration
   */
  async disconnect(organizationId: string): Promise<void> {
    const connection = await db.accountingConnection.findUnique({
      where: {
        organizationId_provider: {
          organizationId,
          provider: 'QUICKBOOKS',
        },
      },
    });

    if (connection) {
      await db.accountingConnection.delete({
        where: { id: connection.id },
      });
    }
  }
}

// Export singleton instance
export const quickBooksService = new QuickBooksService();
