/**
 * Carta Fund Administration API Client
 * Task FA-004: Capital calls, investors, acknowledgements
 */

import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  CartaCapitalCallSchema,
  CartaInvestorSchema,
  type CartaCapitalCall,
  type CartaInvestor,
} from '../types';

export interface CartaCapitalCallParams {
  since?: Date;
  status?: 'pending' | 'settled' | 'all';
}

export interface CartaAcknowledgement {
  investorId: string;
  acknowledgedAt: Date;
  acknowledgedBy: string;
}

export interface CartaPayment {
  investorId: string;
  amount: number;
  paidAt: Date;
  reference: string;
}

export class CartaFundAdminClient {
  private client: AxiosInstance;
  private readonly baseUrl = 'https://api.carta.com/v2';
  private readonly apiVersion = '2024-01-01';

  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new Error('CartaFundAdminClient requires an API key');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Carta-Version': this.apiVersion,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      this.handleError
    );
  }

  /**
   * Get capital calls for a specific fund
   */
  async getCapitalCalls(
    fundId: string,
    params?: CartaCapitalCallParams
  ): Promise<CartaCapitalCall[]> {
    try {
      const response = await this.client.get(`/funds/${fundId}/capital-calls`, {
        params: {
          created_after: params?.since?.toISOString(),
          status: params?.status || 'all',
        },
      });

      return this.parseCapitalCalls(response.data.capital_calls);
    } catch (error) {
      throw this.wrapError(error, 'Failed to fetch capital calls from Carta');
    }
  }

  /**
   * Get a specific capital call by ID
   */
  async getCapitalCall(capitalCallId: string): Promise<CartaCapitalCall> {
    try {
      const response = await this.client.get(`/capital-calls/${capitalCallId}`);
      return CartaCapitalCallSchema.parse(response.data);
    } catch (error) {
      throw this.wrapError(error, 'Failed to fetch capital call from Carta');
    }
  }

  /**
   * Get all investors for a specific fund
   */
  async getInvestors(fundId: string): Promise<CartaInvestor[]> {
    try {
      const response = await this.client.get(`/funds/${fundId}/investors`);
      return this.parseInvestors(response.data.investors);
    } catch (error) {
      throw this.wrapError(error, 'Failed to fetch investors from Carta');
    }
  }

  /**
   * Get a specific investor by ID
   */
  async getInvestor(investorId: string): Promise<CartaInvestor> {
    try {
      const response = await this.client.get(`/investors/${investorId}`);
      return CartaInvestorSchema.parse(response.data);
    } catch (error) {
      throw this.wrapError(error, 'Failed to fetch investor from Carta');
    }
  }

  /**
   * Acknowledge a capital call (bidirectional sync)
   * Sends acknowledgement back to Carta when investor acknowledges in Clearway
   */
  async acknowledgeCapitalCall(
    capitalCallId: string,
    acknowledgement: CartaAcknowledgement
  ): Promise<void> {
    try {
      await this.client.post(`/capital-calls/${capitalCallId}/acknowledge`, {
        investor_id: acknowledgement.investorId,
        acknowledged_at: acknowledgement.acknowledgedAt.toISOString(),
        acknowledged_by: acknowledgement.acknowledgedBy,
      });
    } catch (error) {
      throw this.wrapError(error, 'Failed to acknowledge capital call');
    }
  }

  /**
   * Report a payment back to Carta (bidirectional sync)
   * Sends payment information when investor pays in Clearway
   */
  async reportPayment(
    capitalCallId: string,
    payment: CartaPayment
  ): Promise<void> {
    try {
      await this.client.post(`/capital-calls/${capitalCallId}/payments`, {
        investor_id: payment.investorId,
        amount: payment.amount,
        paid_at: payment.paidAt.toISOString(),
        reference: payment.reference,
      });
    } catch (error) {
      throw this.wrapError(error, 'Failed to report payment to Carta');
    }
  }

  /**
   * List all funds accessible with the API key
   */
  async listFunds(): Promise<
    Array<{
      id: string;
      name: string;
      vintage: number;
      status: string;
    }>
  > {
    try {
      const response = await this.client.get('/funds');
      return response.data.funds;
    } catch (error) {
      throw this.wrapError(error, 'Failed to list funds from Carta');
    }
  }

  /**
   * Test API connection and credentials
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/ping');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Parse and validate capital calls from Carta API response
   */
  private parseCapitalCalls(data: unknown): CartaCapitalCall[] {
    try {
      return data instanceof Array
        ? data.map((item) => CartaCapitalCallSchema.parse(item))
        : [CartaCapitalCallSchema.parse(data)];
    } catch (error) {
      console.error('Failed to parse Carta capital call data:', error);
      throw new Error('Invalid capital call data received from Carta');
    }
  }

  /**
   * Parse and validate investors from Carta API response
   */
  private parseInvestors(data: unknown): CartaInvestor[] {
    try {
      return data instanceof Array
        ? data.map((item) => CartaInvestorSchema.parse(item))
        : [CartaInvestorSchema.parse(data)];
    } catch (error) {
      console.error('Failed to parse Carta investor data:', error);
      throw new Error('Invalid investor data received from Carta');
    }
  }

  /**
   * Handle axios errors and convert to meaningful error messages
   */
  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = (error.response.data as { error?: string })?.error || error.message;

      switch (status) {
        case 401:
          throw new Error('Carta API authentication failed. Check your API key.');
        case 403:
          throw new Error('Carta API access forbidden. Check your permissions.');
        case 404:
          throw new Error('Carta API resource not found.');
        case 429:
          throw new Error('Carta API rate limit exceeded. Please try again later.');
        case 500:
        case 502:
        case 503:
          throw new Error('Carta API server error. Please try again later.');
        default:
          throw new Error(`Carta API error (${status}): ${message}`);
      }
    } else if (error.request) {
      // Request made but no response received
      throw new Error('No response from Carta API. Check your network connection.');
    } else {
      // Error setting up request
      throw new Error(`Carta API request error: ${error.message}`);
    }
  }

  /**
   * Wrap errors with context
   */
  private wrapError(error: unknown, context: string): Error {
    if (error instanceof Error) {
      return new Error(`${context}: ${error.message}`);
    }
    return new Error(`${context}: ${String(error)}`);
  }
}
