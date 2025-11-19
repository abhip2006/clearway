// app/api/v1/marketplace/oauth/token/route.ts
// OAuth 2.0 Token endpoint
import { db } from '@/lib/db';
import { successResponse, errorResponse, hashAPIKey } from '@/lib/api-marketplace/utils';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(req: Request) {
  try {
    const body = await req.formData();
    const grantType = body.get('grant_type');
    const clientId = body.get('client_id');
    const clientSecret = body.get('client_secret');

    if (!clientId || !clientSecret) {
      return errorResponse('invalid_client', 'Missing client credentials', 401);
    }

    // Verify client
    const secretHash = hashAPIKey(clientSecret as string);
    const oauthClient = await db.marketplaceOAuthClient.findFirst({
      where: { clientId: clientId as string, clientSecretHash: secretHash },
    });

    if (!oauthClient) {
      return errorResponse('invalid_client', 'Invalid client credentials', 401);
    }

    if (grantType === 'authorization_code') {
      const code = body.get('code') as string;
      const redirectUri = body.get('redirect_uri') as string;

      // In production: verify code from Redis
      // For demo, generate tokens directly

      const userId = 'demo_user_id'; // Should come from auth code
      const scopes = oauthClient.scopes;

      const accessToken = jwt.sign(
        { clientId, userId, scopes, type: 'access' },
        JWT_SECRET,
        { expiresIn: oauthClient.accessTokenLifetime }
      );

      const refreshToken = jwt.sign(
        { clientId, userId, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: oauthClient.refreshTokenLifetime }
      );

      const accessTokenHash = hashAPIKey(accessToken);
      const refreshTokenHash = hashAPIKey(refreshToken);

      await db.marketplaceOAuthToken.create({
        data: {
          oauthClientId: oauthClient.id,
          userId,
          accessTokenHash,
          refreshTokenHash,
          scopes,
          expiresAt: new Date(Date.now() + oauthClient.accessTokenLifetime * 1000),
        },
      });

      return successResponse({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: oauthClient.accessTokenLifetime,
        refresh_token: refreshToken,
        scope: scopes.join(' '),
      });
    } else if (grantType === 'refresh_token') {
      const refreshToken = body.get('refresh_token') as string;
      const refreshTokenHash = hashAPIKey(refreshToken);

      const token = await db.marketplaceOAuthToken.findFirst({
        where: { refreshTokenHash, revokedAt: null },
        include: { oauthClient: true },
      });

      if (!token) {
        return errorResponse('invalid_grant', 'Invalid refresh token', 400);
      }

      const accessToken = jwt.sign(
        { clientId: token.oauthClient.clientId, userId: token.userId, scopes: token.scopes, type: 'access' },
        JWT_SECRET,
        { expiresIn: token.oauthClient.accessTokenLifetime }
      );

      return successResponse({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: token.oauthClient.accessTokenLifetime,
        scope: token.scopes.join(' '),
      });
    }

    return errorResponse('unsupported_grant_type', 'Grant type not supported', 400);
  } catch (error) {
    return errorResponse('server_error', 'Token generation failed', 500);
  }
}
