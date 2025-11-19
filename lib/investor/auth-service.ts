/**
 * Investor Portal Authentication Service
 * Handles magic link authentication, SSO, and session management for investors
 */

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { AuthMethod, MFAMethod } from '@prisma/client';

export interface MagicLinkRequestResult {
  success: boolean;
  message: string;
  rateLimited?: boolean;
}

export interface MagicLinkVerificationResult {
  success: boolean;
  investorId?: string;
  sessionToken?: string;
  requiresMFA?: boolean;
  message: string;
}

export interface SessionValidationResult {
  valid: boolean;
  investorId?: string;
  investor?: any;
}

const MAGIC_LINK_EXPIRY_MINUTES = 15;
const MAX_MAGIC_LINK_REQUESTS_PER_HOUR = 5;
const SESSION_EXPIRY_HOURS = 24;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

/**
 * Generate a secure random token for magic links
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token using SHA-256
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Check if an investor has exceeded magic link request rate limit
 */
async function checkRateLimit(email: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentRequests = await prisma.investorAuditLog.count({
    where: {
      investor: {
        email: email.toLowerCase(),
      },
      action: 'MAGIC_LINK_REQUESTED',
      changedDate: {
        gte: oneHourAgo,
      },
    },
  });

  return recentRequests < MAX_MAGIC_LINK_REQUESTS_PER_HOUR;
}

/**
 * Request a magic link for email authentication
 */
export async function requestMagicLink(
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<MagicLinkRequestResult> {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Find investor by email
    const investor = await prisma.investor.findUnique({
      where: { email: normalizedEmail },
      include: {
        authentication: {
          where: {
            authMethod: AuthMethod.EMAIL_MAGIC_LINK,
          },
        },
      },
    });

    if (!investor) {
      // Don't reveal if email exists or not (security)
      return {
        success: true,
        message: 'If your email is registered, you will receive a magic link shortly.',
      };
    }

    // Check if account is active
    if (investor.status !== 'ACTIVE') {
      return {
        success: false,
        message: 'Your account is not active. Please contact support.',
      };
    }

    // Check rate limit
    const withinRateLimit = await checkRateLimit(normalizedEmail);
    if (!withinRateLimit) {
      return {
        success: false,
        message: 'Too many requests. Please try again later.',
        rateLimited: true,
      };
    }

    // Generate magic link token
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

    // Store or update authentication record
    let auth = investor.authentication[0];
    if (!auth) {
      auth = await prisma.investorAuthentication.create({
        data: {
          investorId: investor.id,
          authMethod: AuthMethod.EMAIL_MAGIC_LINK,
          magicLinkTokenHash: tokenHash,
          magicLinkExpiresAt: expiresAt,
        },
      });
    } else {
      // Check if account is locked
      if (auth.lockedUntil && auth.lockedUntil > new Date()) {
        return {
          success: false,
          message: 'Your account is temporarily locked. Please try again later.',
        };
      }

      await prisma.investorAuthentication.update({
        where: { id: auth.id },
        data: {
          magicLinkTokenHash: tokenHash,
          magicLinkExpiresAt: expiresAt,
          failedAttempts: 0, // Reset failed attempts on new request
        },
      });
    }

    // Log the request
    await prisma.investorAuditLog.create({
      data: {
        investorId: investor.id,
        action: 'MAGIC_LINK_REQUESTED',
        ipAddress,
        userAgent,
      },
    });

    // TODO: Send email with magic link
    // const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/investor/auth/verify?token=${token}`;
    // await sendMagicLinkEmail(investor.email, magicLink);

    return {
      success: true,
      message: 'Magic link sent to your email address.',
    };
  } catch (error) {
    console.error('Error requesting magic link:', error);
    return {
      success: false,
      message: 'An error occurred. Please try again.',
    };
  }
}

/**
 * Verify a magic link token and create a session
 */
export async function verifyMagicLink(
  token: string,
  ipAddress?: string,
  userAgent?: string,
  deviceFingerprint?: string
): Promise<MagicLinkVerificationResult> {
  try {
    const tokenHash = hashToken(token);

    // Find authentication record
    const auth = await prisma.investorAuthentication.findFirst({
      where: {
        magicLinkTokenHash: tokenHash,
        authMethod: AuthMethod.EMAIL_MAGIC_LINK,
      },
      include: {
        investor: true,
      },
    });

    if (!auth || !auth.investor) {
      return {
        success: false,
        message: 'Invalid or expired magic link.',
      };
    }

    // Check if account is locked
    if (auth.lockedUntil && auth.lockedUntil > new Date()) {
      return {
        success: false,
        message: 'Your account is temporarily locked. Please try again later.',
      };
    }

    // Check if token is expired
    if (!auth.magicLinkExpiresAt || auth.magicLinkExpiresAt < new Date()) {
      await prisma.investorAuthentication.update({
        where: { id: auth.id },
        data: {
          failedAttempts: { increment: 1 },
        },
      });

      return {
        success: false,
        message: 'Magic link has expired. Please request a new one.',
      };
    }

    // Check if investor account is active
    if (auth.investor.status !== 'ACTIVE') {
      return {
        success: false,
        message: 'Your account is not active. Please contact support.',
      };
    }

    // Check if MFA is required
    if (auth.mfaEnabled) {
      return {
        success: true,
        investorId: auth.investorId,
        requiresMFA: true,
        message: 'MFA verification required.',
      };
    }

    // Create session
    const sessionToken = generateToken();
    const sessionTokenHash = hashToken(sessionToken);
    const sessionExpiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.investorSession.create({
      data: {
        investorId: auth.investorId,
        sessionTokenHash,
        expiresAt: sessionExpiresAt,
        ipAddress,
        userAgent,
        deviceFingerprint,
      },
    });

    // Update authentication record
    await prisma.investorAuthentication.update({
      where: { id: auth.id },
      data: {
        lastLoginDate: new Date(),
        lastLoginIp: ipAddress,
        failedAttempts: 0,
        magicLinkTokenHash: null, // Invalidate used token
        magicLinkExpiresAt: null,
      },
    });

    // Log successful login
    await prisma.investorAuditLog.create({
      data: {
        investorId: auth.investorId,
        action: 'LOGIN_SUCCESS',
        ipAddress,
        userAgent,
      },
    });

    // Log access
    await prisma.investorAccessAuditLog.create({
      data: {
        investorId: auth.investorId,
        action: 'LOGIN',
        ipAddress,
        userAgent,
        deviceFingerprint,
        status: 'SUCCESS',
      },
    });

    return {
      success: true,
      investorId: auth.investorId,
      sessionToken,
      message: 'Successfully authenticated.',
    };
  } catch (error) {
    console.error('Error verifying magic link:', error);
    return {
      success: false,
      message: 'An error occurred. Please try again.',
    };
  }
}

/**
 * Validate an active session
 */
export async function validateSession(
  sessionToken: string
): Promise<SessionValidationResult> {
  try {
    const sessionTokenHash = hashToken(sessionToken);

    const session = await prisma.investorSession.findUnique({
      where: { sessionTokenHash },
      include: {
        investor: {
          include: {
            fundParticipations: true,
            communicationPreferences: true,
          },
        },
      },
    });

    if (!session) {
      return { valid: false };
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await prisma.investorSession.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      return { valid: false };
    }

    // Check if session is active
    if (!session.isActive) {
      return { valid: false };
    }

    // Check if investor account is active
    if (session.investor.status !== 'ACTIVE') {
      return { valid: false };
    }

    // Update last activity
    await prisma.investorSession.update({
      where: { id: session.id },
      data: { lastActivity: new Date() },
    });

    return {
      valid: true,
      investorId: session.investorId,
      investor: session.investor,
    };
  } catch (error) {
    console.error('Error validating session:', error);
    return { valid: false };
  }
}

/**
 * End a session (logout)
 */
export async function endSession(sessionToken: string): Promise<boolean> {
  try {
    const sessionTokenHash = hashToken(sessionToken);

    await prisma.investorSession.updateMany({
      where: { sessionTokenHash },
      data: { isActive: false },
    });

    return true;
  } catch (error) {
    console.error('Error ending session:', error);
    return false;
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.investorSession.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        isActive: true,
      },
      data: { isActive: false },
    });

    return result.count;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return 0;
  }
}
