/**
 * Orion Integration Service
 * Handles API key authentication and data synchronization with Orion platform
 */

import axios, { AxiosInstance } from 'axios';
import { PortfolioConnection } from '../../models/PortfolioConnection';
import { Holding, Transaction } from '../../models/Portfolio';

interface OrionConfig {
  apiBaseUrl: string;
  defaultEnvironment: 'production' | 'sandbox';
}

interface OrionCredentials {
  apiKey: string;
  apiSecret: string;
  environment: 'production' | 'sandbox';
  accountId: string;
}

interface OrionPosition {
  id: string;
  securityId: string;
  ticker?: string;
  isin?: string;
  quantity: number;
  costPerShare: number;
  marketValue: number;
  weight: number;
  currency: string;
  accountingMethod: string;
}

interface OrionPortfolio {
  id: string;
  accountId: string;
  totalValue: number;
  baseCurrency: string;
  positions: OrionPosition[];
  assetAllocations: AssetAllocation[];
  lastRebalance?: string;
  syncTimestamp: string;
}

interface AssetAllocation {
  assetClass: string;
  targetWeight: number;
  currentWeight: number;
  drift: number;
}

interface TaxLot {
  id: string;
  positionId: string;
  quantity: number;
  costBasis: number;
  acquiredDate: string;
  unrealizedGain: number;
  holdingPeriod: 'SHORT_TERM' | 'LONG_TERM';
  lotNotes?: string;
}

export class OrionService {
  private config: OrionConfig;
  private client: AxiosInstance;

  constructor(config: OrionConfig) {
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
   * Create Orion connection with API key
   */
  async createConnection(credentials: OrionCredentials): Promise<boolean> {
    try {
      // Test the API key by making a simple request
      await this.client.get(`/accounts/${credentials.accountId}`, {
        headers: this.getAuthHeaders(credentials.apiKey, credentials.apiSecret)
      });

      return true;
    } catch (error: any) {
      throw new Error(`Failed to create Orion connection: ${error.message}`);
    }
  }

  /**
   * Generate authentication headers
   */
  private getAuthHeaders(apiKey: string, apiSecret: string): Record<string, string> {
    // Orion uses API key in header
    return {
      'X-Api-Key': apiKey,
      'X-Api-Secret': apiSecret
    };
  }

  /**
   * Extract credentials from connection (decrypt in real implementation)
   */
  private getCredentials(connection: PortfolioConnection): OrionCredentials {
    if (!connection.accessToken) {
      throw new Error('No API key available');
    }

    // In real implementation, decrypt the stored credentials
    // For now, assume accessToken contains the API key and refreshToken contains the secret
    return {
      apiKey: connection.accessToken,
      apiSecret: connection.refreshToken || '',
      environment: 'production',
      accountId: connection.accountId
    };
  }

  /**
   * Fetch portfolio composition from Orion
   */
  async fetchPortfolio(connection: PortfolioConnection): Promise<OrionPortfolio> {
    const credentials = this.getCredentials(connection);

    try {
      const response = await this.client.get<OrionPortfolio>(
        `/portfolios/${connection.accountId}`,
        {
          headers: this.getAuthHeaders(credentials.apiKey, credentials.apiSecret)
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch portfolio: ${error.message}`);
    }
  }

  /**
   * Fetch positions (holdings) from Orion
   */
  async fetchPositions(connection: PortfolioConnection): Promise<Holding[]> {
    const credentials = this.getCredentials(connection);

    try {
      const response = await this.client.get<OrionPosition[]>(
        `/accounts/${connection.accountId}/positions`,
        {
          headers: this.getAuthHeaders(credentials.apiKey, credentials.apiSecret)
        }
      );

      return response.data.map(position => this.mapPosition(position));
    } catch (error: any) {
      throw new Error(`Failed to fetch positions: ${error.message}`);
    }
  }

  /**
   * Fetch tax lots for a position
   */
  async fetchTaxLots(
    connection: PortfolioConnection,
    positionId: string
  ): Promise<TaxLot[]> {
    const credentials = this.getCredentials(connection);

    try {
      const response = await this.client.get<TaxLot[]>(
        `/positions/${positionId}/tax-lots`,
        {
          headers: this.getAuthHeaders(credentials.apiKey, credentials.apiSecret)
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch tax lots: ${error.message}`);
    }
  }

  /**
   * Fetch all tax lots for an account
   */
  async fetchAllTaxLots(connection: PortfolioConnection): Promise<TaxLot[]> {
    const credentials = this.getCredentials(connection);

    try {
      const response = await this.client.get<TaxLot[]>(
        `/accounts/${connection.accountId}/tax-lots`,
        {
          headers: this.getAuthHeaders(credentials.apiKey, credentials.apiSecret)
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch all tax lots: ${error.message}`);
    }
  }

  /**
   * Fetch custom reports
   */
  async fetchReport(
    connection: PortfolioConnection,
    reportType: 'PERFORMANCE' | 'TAX' | 'ALLOCATION' | 'REBALANCING'
  ): Promise<any> {
    const credentials = this.getCredentials(connection);

    try {
      const response = await this.client.get(
        `/accounts/${connection.accountId}/reports/${reportType.toLowerCase()}`,
        {
          headers: this.getAuthHeaders(credentials.apiKey, credentials.apiSecret)
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch ${reportType} report: ${error.message}`);
    }
  }

  /**
   * Map Orion position to Clearway holding
   */
  private mapPosition(position: OrionPosition): Partial<Holding> {
    return {
      securityId: position.securityId,
      ticker: position.ticker,
      isin: position.isin,
      quantity: position.quantity,
      marketValue: position.marketValue,
      costBasis: position.costPerShare * position.quantity,
      unrealizedGain: position.marketValue - (position.costPerShare * position.quantity),
      percentOfPortfolio: position.weight * 100,
      currency: position.currency
    };
  }

  /**
   * Test connection validity
   */
  async testConnection(connection: PortfolioConnection): Promise<boolean> {
    try {
      const credentials = this.getCredentials(connection);

      await this.client.get(`/accounts/${connection.accountId}`, {
        headers: this.getAuthHeaders(credentials.apiKey, credentials.apiSecret)
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Rotate API credentials (security best practice)
   */
  async rotateCredentials(connection: PortfolioConnection): Promise<OrionCredentials> {
    const credentials = this.getCredentials(connection);

    try {
      const response = await this.client.post(
        '/credentials/rotate',
        {
          accountId: credentials.accountId
        },
        {
          headers: this.getAuthHeaders(credentials.apiKey, credentials.apiSecret)
        }
      );

      return {
        apiKey: response.data.apiKey,
        apiSecret: response.data.apiSecret,
        environment: credentials.environment,
        accountId: credentials.accountId
      };
    } catch (error: any) {
      throw new Error(`Failed to rotate credentials: ${error.message}`);
    }
  }

  /**
   * Get asset allocation data
   */
  async getAssetAllocation(connection: PortfolioConnection): Promise<AssetAllocation[]> {
    const portfolio = await this.fetchPortfolio(connection);
    return portfolio.assetAllocations;
  }

  /**
   * Calculate rebalancing recommendations
   */
  async getRebalancingRecommendations(
    connection: PortfolioConnection,
    targetAllocations: AssetAllocation[]
  ): Promise<any> {
    const credentials = this.getCredentials(connection);

    try {
      const response = await this.client.post(
        `/accounts/${connection.accountId}/rebalancing/calculate`,
        {
          targetAllocations
        },
        {
          headers: this.getAuthHeaders(credentials.apiKey, credentials.apiSecret)
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get rebalancing recommendations: ${error.message}`);
    }
  }

  /**
   * Disconnect and invalidate API credentials
   */
  async disconnect(connection: PortfolioConnection): Promise<void> {
    const credentials = this.getCredentials(connection);

    try {
      await this.client.post(
        '/credentials/revoke',
        {
          accountId: credentials.accountId
        },
        {
          headers: this.getAuthHeaders(credentials.apiKey, credentials.apiSecret)
        }
      );
    } catch (error: any) {
      console.error('Failed to revoke Orion credentials:', error.message);
    }
  }
}
