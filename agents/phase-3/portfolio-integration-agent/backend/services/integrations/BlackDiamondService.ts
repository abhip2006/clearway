/**
 * Black Diamond Integration Service
 * Handles OAuth authentication and data synchronization with Black Diamond platform
 */

import axios, { AxiosInstance } from 'axios';
import { PortfolioConnection } from '../../models/PortfolioConnection';
import { Holding, Transaction, PerformanceMetric } from '../../models/Portfolio';

interface BlackDiamondConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiBaseUrl: string;
  oauthBaseUrl: string;
}

interface BlackDiamondHolding {
  id: string;
  accountId: string;
  securityId: string;
  ticker?: string;
  isin?: string;
  cusip?: string;
  quantity: number;
  marketValue: number;
  costBasis: number;
  unrealizedGainLoss: number;
  percentOfPortfolio: number;
  currency: string;
  lastUpdated: string;
}

interface BlackDiamondTransaction {
  id: string;
  accountId: string;
  transactionDate: string;
  settlementDate: string;
  type: string;
  quantity?: number;
  price?: number;
  amount: number;
  currency: string;
  fee?: number;
  description?: string;
  securityId: string;
  tradeId?: string;
  status: string;
}

interface BlackDiamondPerformance {
  accountId: string;
  period: string;
  returnValue: number;
  returnPercent: number;
  benchmarkReturn: number;
  excessReturn: number;
  calculationDate: string;
}

export class BlackDiamondService {
  private config: BlackDiamondConfig;
  private client: AxiosInstance;

  constructor(config: BlackDiamondConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.apiBaseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Step 1: Generate OAuth authorization URL
   */
  generateAuthUrl(state: string): string {
    const scopes = [
      'portfolio:read',
      'holdings:read',
      'transactions:read',
      'performance:read',
      'accounts:read',
      'trades:read'
    ];

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state: state
    });

    return `${this.config.oauthBaseUrl}/authorize?${params.toString()}`;
  }

  /**
   * Step 2: Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  }> {
    try {
      const response = await axios.post(`${this.config.oauthBaseUrl}/token`, {
        grant_type: 'authorization_code',
        code: code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type
      };
    } catch (error: any) {
      throw new Error(`Failed to exchange code for token: ${error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    try {
      const response = await axios.post(`${this.config.oauthBaseUrl}/token`, {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || refreshToken,
        expiresIn: response.data.expires_in
      };
    } catch (error: any) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Validate and refresh token if needed
   */
  async ensureValidToken(connection: PortfolioConnection): Promise<string> {
    if (!connection.accessToken) {
      throw new Error('No access token available');
    }

    // Check if token is about to expire (within 5 minutes)
    const now = new Date();
    const expiresAt = connection.tokenExpiresAt ? new Date(connection.tokenExpiresAt) : null;

    if (expiresAt && (expiresAt.getTime() - now.getTime()) < 5 * 60 * 1000) {
      // Token is expiring soon, refresh it
      if (!connection.refreshToken) {
        throw new Error('No refresh token available');
      }

      const tokens = await this.refreshAccessToken(connection.refreshToken);
      // Note: In real implementation, update the connection in database here
      return tokens.accessToken;
    }

    return connection.accessToken;
  }

  /**
   * Fetch holdings from Black Diamond
   */
  async fetchHoldings(connection: PortfolioConnection): Promise<Holding[]> {
    const accessToken = await this.ensureValidToken(connection);

    try {
      const response = await this.client.get<BlackDiamondHolding[]>(
        `/accounts/${connection.accountId}/holdings`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      return response.data.map(bdHolding => this.mapHolding(bdHolding));
    } catch (error: any) {
      throw new Error(`Failed to fetch holdings: ${error.message}`);
    }
  }

  /**
   * Fetch transactions from Black Diamond
   */
  async fetchTransactions(
    connection: PortfolioConnection,
    startDate?: Date,
    endDate?: Date
  ): Promise<Transaction[]> {
    const accessToken = await this.ensureValidToken(connection);

    try {
      const params: any = {};
      if (startDate) params.start_date = startDate.toISOString().split('T')[0];
      if (endDate) params.end_date = endDate.toISOString().split('T')[0];

      const response = await this.client.get<BlackDiamondTransaction[]>(
        `/accounts/${connection.accountId}/transactions`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          params
        }
      );

      return response.data.map(bdTxn => this.mapTransaction(bdTxn));
    } catch (error: any) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }
  }

  /**
   * Fetch performance metrics from Black Diamond
   */
  async fetchPerformance(
    connection: PortfolioConnection,
    period: string
  ): Promise<PerformanceMetric[]> {
    const accessToken = await this.ensureValidToken(connection);

    try {
      const response = await this.client.get<BlackDiamondPerformance[]>(
        `/accounts/${connection.accountId}/performance`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          params: { period }
        }
      );

      return response.data.map(bdPerf => this.mapPerformance(bdPerf));
    } catch (error: any) {
      throw new Error(`Failed to fetch performance: ${error.message}`);
    }
  }

  /**
   * Map Black Diamond holding to Clearway format
   */
  private mapHolding(bdHolding: BlackDiamondHolding): Partial<Holding> {
    return {
      securityId: bdHolding.securityId,
      ticker: bdHolding.ticker,
      isin: bdHolding.isin,
      cusip: bdHolding.cusip,
      quantity: bdHolding.quantity,
      marketValue: bdHolding.marketValue,
      costBasis: bdHolding.costBasis,
      unrealizedGain: bdHolding.unrealizedGainLoss,
      percentOfPortfolio: bdHolding.percentOfPortfolio,
      currency: bdHolding.currency,
      lastUpdated: new Date(bdHolding.lastUpdated)
    };
  }

  /**
   * Map Black Diamond transaction to Clearway format
   */
  private mapTransaction(bdTxn: BlackDiamondTransaction): Partial<Transaction> {
    return {
      securityId: bdTxn.securityId,
      transactionDate: new Date(bdTxn.transactionDate),
      settlementDate: bdTxn.settlementDate ? new Date(bdTxn.settlementDate) : undefined,
      type: this.mapTransactionType(bdTxn.type),
      quantity: bdTxn.quantity,
      price: bdTxn.price,
      amount: bdTxn.amount,
      currency: bdTxn.currency,
      fee: bdTxn.fee,
      description: bdTxn.description,
      status: this.mapTransactionStatus(bdTxn.status)
    };
  }

  /**
   * Map Black Diamond performance to Clearway format
   */
  private mapPerformance(bdPerf: BlackDiamondPerformance): Partial<PerformanceMetric> {
    return {
      period: bdPerf.period as any,
      returnValue: bdPerf.returnValue,
      returnPercent: bdPerf.returnPercent,
      benchmarkReturn: bdPerf.benchmarkReturn,
      excessReturn: bdPerf.excessReturn,
      calculationDate: new Date(bdPerf.calculationDate)
    };
  }

  /**
   * Map transaction type from Black Diamond to Clearway
   */
  private mapTransactionType(bdType: string): any {
    const typeMap: Record<string, string> = {
      'BUY': 'BUY',
      'SELL': 'SELL',
      'DIVIDEND': 'DIVIDEND',
      'INTEREST': 'INTEREST',
      'FEE': 'FEE',
      'TRANSFER': 'TRANSFER'
    };

    return typeMap[bdType] || 'TRANSFER';
  }

  /**
   * Map transaction status from Black Diamond to Clearway
   */
  private mapTransactionStatus(bdStatus: string): any {
    const statusMap: Record<string, string> = {
      'PENDING': 'PENDING',
      'COMPLETED': 'COMPLETED',
      'FAILED': 'FAILED'
    };

    return statusMap[bdStatus] || 'COMPLETED';
  }

  /**
   * Test connection validity
   */
  async testConnection(connection: PortfolioConnection): Promise<boolean> {
    try {
      const accessToken = await this.ensureValidToken(connection);

      await this.client.get(`/accounts/${connection.accountId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Revoke access token
   */
  async revokeAccess(connection: PortfolioConnection): Promise<void> {
    if (!connection.accessToken) {
      return;
    }

    try {
      await axios.post(`${this.config.oauthBaseUrl}/revoke`, {
        token: connection.accessToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      });
    } catch (error: any) {
      console.error('Failed to revoke access:', error.message);
    }
  }
}
