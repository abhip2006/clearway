// SAML Assertion Consumer Service (ACS) - Multi-Tenant & Enterprise Agent
// Handles SAML SSO callbacks

import { NextResponse } from 'next/server';
import { samlService } from '@/lib/auth/saml';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/saml/acs
 * SAML Assertion Consumer Service
 * Handles SAML responses from identity providers
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const samlResponse = formData.get('SAMLResponse') as string;
    const relayState = formData.get('RelayState') as string;

    if (!samlResponse) {
      return NextResponse.json(
        { error: 'Missing SAMLResponse' },
        { status: 400 }
      );
    }

    // Parse relay state to get organization slug
    // RelayState format: "org_slug:redirect_url"
    const [organizationSlug, redirectUrl] = relayState?.split(':') || ['', '/dashboard'];

    if (!organizationSlug) {
      return NextResponse.json(
        { error: 'Missing organization slug' },
        { status: 400 }
      );
    }

    // Note: In production, you would use @boxyhq/saml-jackson to validate
    // and parse the SAML response. This is a placeholder implementation.

    // For now, we'll simulate a successful SAML response
    // In production, replace this with actual SAML validation
    const mockProfile = {
      id: 'saml-user-id',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    // Handle SAML callback and provision user
    const { user, organization } = await samlService.handleSAMLCallback({
      profile: mockProfile,
      organizationSlug,
    });

    // Set session cookie (in production, use proper session management)
    // This is a simplified example
    const cookieStore = cookies();
    cookieStore.set('clearway-session', JSON.stringify({
      userId: user.id,
      organizationId: organization.id,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Redirect to the application
    const redirectTo = redirectUrl || '/dashboard';
    return NextResponse.redirect(new URL(redirectTo, process.env.NEXT_PUBLIC_APP_URL));
  } catch (error) {
    console.error('SAML ACS error:', error);
    return NextResponse.json(
      { error: 'SAML authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/saml/acs
 * For debugging - show SAML configuration
 */
export async function GET() {
  return NextResponse.json({
    message: 'SAML ACS endpoint',
    acsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/saml/acs`,
    note: 'Configure this URL as the ACS URL in your identity provider',
  });
}
