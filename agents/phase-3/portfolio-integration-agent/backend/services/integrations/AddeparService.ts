/**
 * Addepar Integration Service
 * Handles OAuth + API token authentication and advanced analytics from Addepar
 */

import axios, { AxiosInstance } from 'axios';
import { PortfolioConnection } from '../../models/PortfolioConnection';

interface AddeparConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiBaseUrl: string;
  oauthBaseUrl: string;
}

interface AddeparAnalytics {
  portfolioId: string;
  analysisDate: string;
  riskMetrics: RiskMetrics;
  performanceAttribution: PerformanceAttribution;
  benchmarkComparison: BenchmarkComparison;
  recommendations: AdvisoryRecommendation[];
}

interface RiskMetrics {
  variance: number;
  standardDeviation: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  betaToSP500: number;
  correlation: CorrelationPair[];
}

interface PerformanceAttribution {
  assetAllocationEffect: number;
  securitySelectionEffect: number;
  interactionEffect: number;
  currencyEffect: number;
  totalEffect: number;
  period: string;
}

interface BenchmarkComparison {
  benchmarkId: string;
  benchmarkName: string;
  portfolioReturn: number;
  benchmarkReturn: number;
  trackingError: number;
  informationRatio: number;
}

interface CorrelationPair {
  assetClass: string;
  correlation: number;
}

interface AdvisoryRecommendation {
  id: string;
  type: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  expectedImpact: number;
  rationale: string;
}

interface WealthPlan {
  id: string;
  clientId: string;
  objectives: PlanObjective[];
  projections: CashFlowProjection[];
  recommendations: PlanRecommendation[];
  lastUpdated: string;
}

interface PlanObjective {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  priority: number;
  currentProgress: number;
}

interface CashFlowProjection {
  year: number;
  projectedBalance: number;
  projectedIncome: number;
  projectedExpenses: number;
  needsFunding: boolean;
}

interface PlanRecommendation {
  id: string;
  category: string;
  action: string;
  impact: number;
}

export class AddeparService {
  private config: AddeparConfig;
  private client: AxiosInstance;

  constructor(config: AddeparConfig) {
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
      'analytics:read',
      'portfolios:read',
      'wealth-plan:read',
      'benchmarks:read',
      'collaboration:read'
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
   * Step 2: Exchange authorization code for tokens
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
   * Refresh access token (Addepar tokens expire in 1 hour)
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
      throw new Error(`Failed to refresh Addepar token: ${error.message}`);
    }
  }

  /**
   * Ensure valid access token
   */
  async ensureValidToken(connection: PortfolioConnection): Promise<string> {
    if (!connection.accessToken) {
      throw new Error('No access token available');
    }

    const now = new Date();
    const expiresAt = connection.tokenExpiresAt ? new Date(connection.tokenExpiresAt) : null;

    if (expiresAt && (expiresAt.getTime() - now.getTime()) < 5 * 60 * 1000) {
      if (!connection.refreshToken) {
        throw new Error('No refresh token available');
      }

      const tokens = await this.refreshAccessToken(connection.refreshToken);
      return tokens.accessToken;
    }

    return connection.accessToken;
  }

  /**
   * Fetch analytics data from Addepar
   */
  async fetchAnalytics(
    connection: PortfolioConnection,
    portfolioId?: string
  ): Promise<AddeparAnalytics> {
    const accessToken = await this.ensureValidToken(connection);
    const targetPortfolioId = portfolioId || connection.accountId;

    try {
      const response = await this.client.get<AddeparAnalytics>(
        `/portfolios/${targetPortfolioId}/analytics`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch analytics: ${error.message}`);
    }
  }

  /**
   * Fetch risk metrics
   */
  async fetchRiskMetrics(
    connection: PortfolioConnection,
    portfolioId?: string
  ): Promise<RiskMetrics> {
    const analytics = await this.fetchAnalytics(connection, portfolioId);
    return analytics.riskMetrics;
  }

  /**
   * Fetch performance attribution
   */
  async fetchPerformanceAttribution(
    connection: PortfolioConnection,
    portfolioId?: string,
    period?: string
  ): Promise<PerformanceAttribution> {
    const accessToken = await this.ensureValidToken(connection);
    const targetPortfolioId = portfolioId || connection.accountId;

    try {
      const response = await this.client.get<PerformanceAttribution>(
        `/portfolios/${targetPortfolioId}/performance-attribution`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          params: { period }
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch performance attribution: ${error.message}`);
    }
  }

  /**
   * Fetch benchmark comparison
   */
  async fetchBenchmarkComparison(
    connection: PortfolioConnection,
    portfolioId?: string,
    benchmarkId?: string
  ): Promise<BenchmarkComparison> {
    const accessToken = await this.ensureValidToken(connection);
    const targetPortfolioId = portfolioId || connection.accountId;

    try {
      const response = await this.client.get<BenchmarkComparison>(
        `/portfolios/${targetPortfolioId}/benchmark-comparison`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          params: { benchmark_id: benchmarkId }
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch benchmark comparison: ${error.message}`);
    }
  }

  /**
   * Fetch wealth plan data
   */
  async fetchWealthPlan(
    connection: PortfolioConnection,
    clientId?: string
  ): Promise<WealthPlan> {
    const accessToken = await this.ensureValidToken(connection);
    const targetClientId = clientId || connection.accountId;

    try {
      const response = await this.client.get<WealthPlan>(
        `/clients/${targetClientId}/wealth-plan`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch wealth plan: ${error.message}`);
    }
  }

  /**
   * Fetch cash flow projections
   */
  async fetchCashFlowProjections(
    connection: PortfolioConnection,
    clientId?: string,
    years?: number
  ): Promise<CashFlowProjection[]> {
    const wealthPlan = await this.fetchWealthPlan(connection, clientId);

    if (years) {
      return wealthPlan.projections.slice(0, years);
    }

    return wealthPlan.projections;
  }

  /**
   * Get advisory recommendations
   */
  async getRecommendations(
    connection: PortfolioConnection,
    portfolioId?: string
  ): Promise<AdvisoryRecommendation[]> {
    const analytics = await this.fetchAnalytics(connection, portfolioId);
    return analytics.recommendations;
  }

  /**
   * Fetch collaboration data (advisors working on portfolio)
   */
  async fetchCollaboration(
    connection: PortfolioConnection,
    portfolioId?: string
  ): Promise<any> {
    const accessToken = await this.ensureValidToken(connection);
    const targetPortfolioId = portfolioId || connection.accountId;

    try {
      const response = await this.client.get(
        `/portfolios/${targetPortfolioId}/collaboration`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch collaboration data: ${error.message}`);
    }
  }

  /**
   * Get available benchmarks
   */
  async getAvailableBenchmarks(connection: PortfolioConnection): Promise<any[]> {
    const accessToken = await this.ensureValidToken(connection);

    try {
      const response = await this.client.get('/benchmarks', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch benchmarks: ${error.message}`);
    }
  }

  /**
   * Test connection validity
   */
  async testConnection(connection: PortfolioConnection): Promise<boolean> {
    try {
      const accessToken = await this.ensureValidToken(connection);

      await this.client.get(`/portfolios/${connection.accountId}`, {
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
   * Revoke access
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
      console.error('Failed to revoke Addepar access:', error.message);
    }
  }

  /**
   * Generate custom report
   */
  async generateCustomReport(
    connection: PortfolioConnection,
    portfolioId: string,
    reportConfig: any
  ): Promise<any> {
    const accessToken = await this.ensureValidToken(connection);

    try {
      const response = await this.client.post(
        `/portfolios/${portfolioId}/reports/custom`,
        reportConfig,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to generate custom report: ${error.message}`);
    }
  }
}
