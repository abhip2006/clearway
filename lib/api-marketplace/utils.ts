// lib/api-marketplace/utils.ts
// Common utilities for API Marketplace

import { authenticateAPIKey, logAPIUsage, RateLimitResult } from './rate-limit';

export interface APIResponse<T = any> {
  id?: string;
  status: 'success' | 'error';
  code: number;
  data?: T;
  error?: {
    type: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    rate_limit?: {
      limit: number;
      remaining: number;
      reset: number;
    };
    trace_id?: string;
  };
}

export function successResponse<T>(
  data: T,
  code: number = 200,
  rateLimit?: RateLimitResult
): Response {
  const response: APIResponse<T> = {
    status: 'success',
    code,
    data,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  if (rateLimit) {
    response.meta!.rate_limit = {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      reset: rateLimit.reset,
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (rateLimit) {
    headers['X-RateLimit-Limit'] = rateLimit.limit.toString();
    headers['X-RateLimit-Remaining'] = rateLimit.remaining.toString();
    headers['X-RateLimit-Reset'] = rateLimit.reset.toString();
  }

  return new Response(JSON.stringify(response), {
    status: code,
    headers,
  });
}

export function errorResponse(
  type: string,
  message: string,
  code: number = 400,
  details?: any,
  rateLimit?: RateLimitResult
): Response {
  const response: APIResponse = {
    status: 'error',
    code,
    error: {
      type,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  if (rateLimit) {
    response.meta!.rate_limit = {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      reset: rateLimit.reset,
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (rateLimit) {
    headers['X-RateLimit-Limit'] = rateLimit.limit.toString();
    headers['X-RateLimit-Remaining'] = rateLimit.remaining.toString();
    headers['X-RateLimit-Reset'] = rateLimit.reset.toString();
    headers['Retry-After'] = '60';
  }

  return new Response(JSON.stringify(response), {
    status: code,
    headers,
  });
}

// Generate API key
export function generateAPIKey(): { key: string; secret: string } {
  const crypto = require('crypto');
  const key = `key_${crypto.randomBytes(16).toString('hex')}`;
  const secret = crypto.randomBytes(32).toString('base64');
  return { key, secret };
}

// Hash API key
export function hashAPIKey(key: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Verify OAuth scopes
export function verifyScopesScopes(
  requiredScopes: string[],
  providedScopes: string[]
): boolean {
  return requiredScopes.every((scope) => providedScopes.includes(scope));
}

// Middleware to authenticate API requests
export async function withAPIAuth(
  req: Request,
  handler: (req: Request, auth: any) => Promise<Response>
): Promise<Response> {
  const startTime = Date.now();

  // Extract API key from Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(
      'authentication_error',
      'Missing or invalid Authorization header',
      401
    );
  }

  const apiKey = authHeader.replace('Bearer ', '');

  // Authenticate and check rate limits
  const auth = await authenticateAPIKey(apiKey);

  if (!auth.success) {
    if (auth.rateLimit && !auth.rateLimit.allowed) {
      return errorResponse(
        'rate_limit_exceeded',
        auth.error || 'Rate limit exceeded',
        429,
        undefined,
        auth.rateLimit
      );
    }

    return errorResponse(
      'authentication_error',
      auth.error || 'Authentication failed',
      401
    );
  }

  // Execute the handler
  try {
    const response = await handler(req, auth);

    // Log API usage
    const requestTimeMs = Date.now() - startTime;
    const url = new URL(req.url);

    await logAPIUsage(
      auth.apiKeyData.id,
      auth.apiKeyData.developer.userId,
      url.pathname,
      req.method,
      response.status,
      requestTimeMs,
      parseInt(req.headers.get('content-length') || '0'),
      parseInt(response.headers.get('content-length') || '0')
    );

    return response;
  } catch (error: any) {
    console.error('API handler error:', error);
    return errorResponse(
      'internal_error',
      'An internal error occurred',
      500,
      { message: error.message }
    );
  }
}
