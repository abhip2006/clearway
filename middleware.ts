// Clerk Authentication Middleware
// Protects routes and handles authentication state

import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: ['/'],

  // Webhook routes that should be ignored by auth middleware
  ignoredRoutes: ['/api/webhooks/(.*)'],
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
