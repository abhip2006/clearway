import { NextRequest, NextResponse } from 'next/server';
import { endSession } from '@/lib/investor/auth-service';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = cookies().get('investor_session')?.value;

    if (sessionToken) {
      await endSession(sessionToken);
    }

    // Clear session cookie
    cookies().delete('investor_session');

    return NextResponse.json({
      success: true,
      message: 'Successfully logged out',
    });
  } catch (error) {
    console.error('Error in logout:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
