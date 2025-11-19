# Investor Portal - Quick Start Guide

## Developer Quick Reference

### URLs

**Base Paths:**
- Frontend: `https://yourapp.com/investor/*`
- API: `https://yourapp.com/api/investor/*`

**Public Routes:**
- Login: `/investor/login`
- Verify Magic Link: `/investor/auth/verify?token={token}`

**Protected Routes (require authentication):**
- Dashboard: `/investor/dashboard`
- Capital Calls: `/investor/capital-calls`
- Distributions: `/investor/distributions`
- Tax Documents: `/investor/tax-documents`
- Account: `/investor/account`
- Performance: `/investor/performance`
- Communications: `/investor/communications`

---

## Authentication Flow

### Magic Link Login

```typescript
// 1. Request magic link
POST /api/investor/auth/request-magic-link
Body: { email: "investor@example.com" }

// 2. User clicks link in email with token
GET /investor/auth/verify?token={token}

// 3. Verify token and create session
POST /api/investor/auth/verify-magic-link
Body: { token: "..." }
Response: Sets investor_session cookie

// 4. Access protected routes with cookie
GET /api/investor/dashboard
Cookie: investor_session={token}
```

### Session Validation

```typescript
// Check if user is authenticated
const auth = await authenticateInvestor();
if (!auth.authenticated) {
  return unauthorizedResponse(auth.error);
}

// Access investor data
const investorId = auth.investor.id;
```

---

## API Endpoints Reference

### Authentication
```typescript
POST   /api/investor/auth/request-magic-link
POST   /api/investor/auth/verify-magic-link
POST   /api/investor/auth/logout
GET    /api/investor/auth/session
```

### Profile
```typescript
GET    /api/investor/profile
PUT    /api/investor/profile
```

### Capital Calls
```typescript
GET    /api/investor/capital-calls?status=PENDING&fundId=fund-123
```

### Distributions
```typescript
GET    /api/investor/distributions?fundId=fund-123&year=2024
```

### Tax Documents
```typescript
GET    /api/investor/tax-documents?taxYear=2023&documentType=K1
GET    /api/investor/tax-documents/{id}/download
```

### Bank Accounts
```typescript
GET    /api/investor/bank-accounts
POST   /api/investor/bank-accounts
```

### Performance
```typescript
GET    /api/investor/performance?fundId=fund-123
```

### Announcements
```typescript
GET    /api/investor/announcements?category=CAPITAL_CALL
```

### Support
```typescript
GET    /api/investor/support?status=OPEN
POST   /api/investor/support
```

---

## Database Queries

### Find Investor
```typescript
const investor = await prisma.investor.findUnique({
  where: { email: 'investor@example.com' },
  include: {
    fundParticipations: true,
    communicationPreferences: true,
  },
});
```

### Get Capital Calls
```typescript
const capitalCalls = await prisma.investorCapitalCallStatus.findMany({
  where: {
    investorId: investor.id,
    status: 'PENDING',
  },
  include: {
    capitalCall: true,
  },
  orderBy: {
    capitalCall: {
      dueDate: 'desc',
    },
  },
});
```

### Create Support Ticket
```typescript
const ticket = await prisma.investorSupportTicket.create({
  data: {
    investorId: investor.id,
    ticketNumber: `INV-${Date.now()}`,
    subject: 'Question about capital call',
    description: 'I have a question...',
    category: 'PAYMENT',
    priority: 'MEDIUM',
    status: 'OPEN',
  },
});
```

---

## Frontend Components

### Using the Layout
```tsx
// app/investor/your-page/page.tsx
export default function YourPage() {
  // Layout is automatically applied
  // Session is automatically checked
  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <h1 className="text-2xl font-bold">Your Page</h1>
      {/* Content */}
    </div>
  );
}
```

### Fetching Data
```tsx
'use client';

import { useEffect, useState } from 'react';

export default function YourPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch('/api/investor/your-endpoint');
      const json = await response.json();
      setData(json.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return <div>{/* Your content */}</div>;
}
```

---

## Security Best Practices

### API Route Protection
```typescript
import { authenticateInvestor, unauthorizedResponse, errorResponse } from '@/lib/investor/middleware';

export async function GET(request: NextRequest) {
  try {
    // Always authenticate first
    const auth = await authenticateInvestor();
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error);
    }

    // Access investor data
    const investorId = auth.investor!.id;

    // Your logic here...

    return NextResponse.json({ data: '...' });
  } catch (error) {
    console.error('Error:', error);
    return errorResponse();
  }
}
```

### Audit Logging
```typescript
// Log important actions
await prisma.investorAuditLog.create({
  data: {
    investorId: investor.id,
    action: 'PROFILE_UPDATED',
    oldValues: { ... },
    newValues: { ... },
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || undefined,
  },
});
```

### Access Logging
```typescript
// Log sensitive resource access
await prisma.investorAccessAuditLog.create({
  data: {
    investorId: investor.id,
    action: 'DOWNLOAD_TAX_DOCUMENT',
    resourceType: 'TAX_DOCUMENT',
    resourceId: documentId,
    status: 'SUCCESS',
  },
});
```

---

## Mobile Responsive Guidelines

### Breakpoints
```css
/* Mobile */
@media (max-width: 768px) { }

/* Tablet */
@media (min-width: 768px) and (max-width: 1024px) { }

/* Desktop */
@media (min-width: 1024px) { }
```

### Responsive Classes
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1 column on mobile, 2 on tablet, 3 on desktop */}
</div>

<div className="text-sm md:text-base lg:text-lg">
  {/* Responsive text sizes */}
</div>

<div className="pb-20 lg:pb-6">
  {/* Extra padding on mobile for bottom nav */}
</div>
```

---

## Testing

### Test Login Flow
```bash
# 1. Request magic link
curl -X POST http://localhost:3000/api/investor/auth/request-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 2. Extract token from database and verify
curl -X POST http://localhost:3000/api/investor/auth/verify-magic-link \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN_HERE"}'

# 3. Use session cookie for protected routes
```

### Create Test Data
```typescript
// prisma/seed.ts
const investor = await prisma.investor.create({
  data: {
    email: 'test@example.com',
    legalName: 'Test Investor LLC',
    entityType: 'LLC',
    accreditedStatus: 'ACCREDITED',
    status: 'ACTIVE',
  },
});

// Create fund participation
await prisma.investorFundParticipation.create({
  data: {
    investorId: investor.id,
    fundId: 'fund-1',
    commitmentAmount: 1000000,
    fundedAmount: 750000,
    entryDate: new Date('2024-01-01'),
  },
});
```

---

## Environment Variables

```bash
# Required
DATABASE_URL="postgresql://user:pass@localhost:5432/clearway"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email (required for production)
SENDGRID_API_KEY="your-key"
EMAIL_FROM="noreply@clearway.com"

# SSO (optional)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-secret"
MICROSOFT_CLIENT_ID="your-client-id"
MICROSOFT_CLIENT_SECRET="your-secret"

# File Storage (optional)
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
AWS_S3_BUCKET="investor-documents"

# Encryption (required for production)
ENCRYPTION_KEY="your-32-byte-key"
```

---

## Common Tasks

### Add a New API Endpoint
```typescript
// 1. Create route file
// app/api/investor/your-endpoint/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authenticateInvestor, unauthorizedResponse, errorResponse } from '@/lib/investor/middleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateInvestor();
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error);
    }

    // Your logic here
    const data = await prisma.yourModel.findMany({
      where: { investorId: auth.investor!.id },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error:', error);
    return errorResponse();
  }
}
```

### Add a New Frontend Page
```typescript
// 1. Create page directory and file
// app/investor/your-page/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function YourPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch('/api/investor/your-endpoint');
      const json = await response.json();
      setData(json.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <h1 className="text-2xl font-bold">Your Page</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your Data</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Your content */}
        </CardContent>
      </Card>
    </div>
  );
}

// 2. Add to navigation in layout.tsx
```

---

## Troubleshooting

### "No active session" error
- Check that investor_session cookie is being set
- Verify cookie settings (httpOnly, secure, sameSite)
- Check session expiration

### Magic link not working
- Verify token hasn't expired (15 minute limit)
- Check token hash matches in database
- Ensure investor account is active

### API returns 401
- Session may have expired
- Cookie may not be sent with request
- Investor account may be inactive/suspended

### Data not showing
- Check database has seed data
- Verify API route is returning data
- Check frontend is fetching from correct endpoint
- Look for console errors

---

## Resources

- **Specification:** `/home/user/clearway/agents/phase-3/investor-portal-agent.md`
- **Implementation Summary:** `/home/user/clearway/INVESTOR_PORTAL_IMPLEMENTATION_SUMMARY.md`
- **Database Schema:** `/home/user/clearway/prisma/schema.prisma`
- **Prisma Docs:** https://www.prisma.io/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs

---

**Last Updated:** November 19, 2024
