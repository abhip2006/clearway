/**
 * Investor Portal Middleware
 * Authentication and authorization helpers for investor API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from './auth-service';
import { cookies } from 'next/headers';

export interface AuthenticatedInvestor {
  id: string;
  email: string;
  legalName: string;
  status: string;
  fundParticipations: any[];
}

export interface AuthenticatedRequest extends NextRequest {
  investor?: AuthenticatedInvestor;
}

/**
 * Authenticate investor from session cookie
 */
export async function authenticateInvestor(): Promise<{
  authenticated: boolean;
  investor?: AuthenticatedInvestor;
  error?: string;
}> {
  try {
    const sessionToken = cookies().get('investor_session')?.value;

    if (!sessionToken) {
      return {
        authenticated: false,
        error: 'No active session',
      };
    }

    const result = await validateSession(sessionToken);

    if (!result.valid || !result.investor) {
      return {
        authenticated: false,
        error: 'Invalid or expired session',
      };
    }

    return {
      authenticated: true,
      investor: result.investor,
    };
  } catch (error) {
    console.error('Error authenticating investor:', error);
    return {
      authenticated: false,
      error: 'Authentication failed',
    };
  }
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Create a forbidden response
 */
export function forbiddenResponse(message: string = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Create an internal server error response
 */
export function errorResponse(message: string = 'Internal server error') {
  return NextResponse.json({ error: message }, { status: 500 });
}
