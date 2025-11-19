import { NextRequest, NextResponse } from 'next/server';
import { requestMagicLink } from '@/lib/investor/auth-service';
import { z } from 'zod';

const requestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = requestSchema.parse(body);

    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    const result = await requestMagicLink(email, ipAddress, userAgent);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: result.rateLimited ? 429 : 400 }
      );
    }

    return NextResponse.json({
      message: result.message,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Error in request-magic-link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
