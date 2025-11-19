import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/investor/auth-service';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = cookies().get('investor_session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    const result = await validateSession(sessionToken);

    if (!result.valid) {
      cookies().delete('investor_session');
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      investor: {
        id: result.investor.id,
        email: result.investor.email,
        legalName: result.investor.legalName,
        status: result.investor.status,
        fundParticipations: result.investor.fundParticipations,
      },
    });
  } catch (error) {
    console.error('Error validating session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
