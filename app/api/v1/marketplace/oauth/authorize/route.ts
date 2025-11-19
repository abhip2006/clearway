// app/api/v1/marketplace/oauth/authorize/route.ts
// OAuth 2.0 Authorization Code Flow - Authorization endpoint
import { db } from '@/lib/db';
import { errorResponse } from '@/lib/api-marketplace/utils';
import { currentUser } from '@clerk/nextjs/server';
import crypto from 'crypto';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const clientId = url.searchParams.get('client_id');
    const redirectUri = url.searchParams.get('redirect_uri');
    const state = url.searchParams.get('state');
    const scope = url.searchParams.get('scope') || '';
    const responseType = url.searchParams.get('response_type');

    if (!clientId || !redirectUri || responseType !== 'code') {
      return errorResponse('invalid_request', 'Missing or invalid parameters', 400);
    }

    // Verify OAuth client exists
    const oauthClient = await db.marketplaceOAuthClient.findUnique({
      where: { clientId },
      include: { app: true },
    });

    if (!oauthClient) {
      return errorResponse('invalid_client', 'Invalid client_id', 400);
    }

    // Verify redirect URI is registered
    if (!oauthClient.redirectUris.includes(redirectUri)) {
      return errorResponse('invalid_redirect_uri', 'Redirect URI not registered', 400);
    }

    // Check if user is authenticated
    const user = await currentUser();
    if (!user) {
      // Redirect to login with return URL
      return Response.redirect(
        `/login?redirect=${encodeURIComponent(req.url)}`
      );
    }

    // Show consent screen (in production, this would be a proper page)
    // For now, auto-approve and generate authorization code
    const authCode = crypto.randomBytes(32).toString('hex');

    // Store authorization code temporarily (use Redis in production)
    // For demo, we'll generate the code and redirect
    // In production: store { authCode, clientId, userId, scope, expiresAt } in Redis

    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', authCode);
    if (state) redirectUrl.searchParams.set('state', state);

    return Response.redirect(redirectUrl.toString());
  } catch (error) {
    return errorResponse('server_error', 'Authorization failed', 500);
  }
}
