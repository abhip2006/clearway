import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLink } from '@/lib/investor/auth-service';
import { z } from 'zod';
import { cookies } from 'next/headers';

const verifySchema = z.object({
  token: z.string().min(1, 'Token is required'),
  deviceFingerprint: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, deviceFingerprint } = verifySchema.parse(body);

    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    const result = await verifyMagicLink(token, ipAddress, userAgent, deviceFingerprint);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 401 }
      );
    }

    if (result.requiresMFA) {
      return NextResponse.json({
        requiresMFA: true,
        investorId: result.investorId,
        message: result.message,
      });
    }

    // Set session cookie
    if (result.sessionToken) {
      cookies().set('investor_session', result.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/investor',
      });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      investorId: result.investorId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Error in verify-magic-link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
