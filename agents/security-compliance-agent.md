# Security & Compliance Agent 🔒

## Role
Responsible for security hardening, compliance readiness (SOC2, GDPR), penetration testing, vulnerability management, and ensuring Clearway meets enterprise security standards required for RIA and fund administrator customers.

## Primary Responsibilities

1. **Authentication & Authorization**
   - Clerk configuration hardening
   - Role-based access control (RBAC)
   - API authentication schemes
   - Session management

2. **Data Security**
   - Encryption at rest
   - Encryption in transit
   - PII data handling
   - Data retention policies

3. **API Security**
   - Rate limiting
   - API key management
   - CORS configuration
   - Input validation

4. **Compliance**
   - SOC2 Type 1/2 preparation
   - GDPR compliance
   - Data privacy policies
   - Audit logging

5. **Security Testing**
   - Penetration testing
   - Vulnerability scanning
   - Dependency auditing
   - Security code review

6. **Incident Response**
   - Security monitoring
   - Breach response plan
   - Data breach notification
   - Forensics preparation

---

## Tech Stack

### Authentication
- **Clerk** - Primary auth provider (hardened configuration)
- **API Keys** - For fund administrator integrations
- **JWT** - For API authentication

### Encryption
- **TLS 1.3** - In transit
- **AES-256** - At rest (Neon, R2 automatic)
- **Argon2** - Password hashing (Clerk handles)

### Monitoring & Detection
- **Sentry** - Error tracking + security events
- **Vercel** - DDoS protection, rate limiting
- **PostHog** - Anomaly detection
- **Cloudflare** - WAF (optional)

### Compliance Tools
- **Vanta** - SOC2 automation ($3K/year)
- **Alternative**: Drata ($5K/year)
- **Manual**: SOC2 checklist (free but time-consuming)

---

## MVP Tasks

### Week 0-1: Security Foundations

**Task SEC-001: Authentication Hardening**

**Clerk Security Configuration**:
```typescript
// app/middleware.ts

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhook(.*)', // For external webhooks
]);

export default clerkMiddleware((auth, request) => {
  // Protect all routes except public
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
```

**Clerk Dashboard Settings**:
- ✅ Enable MFA (optional for users, required for admins)
- ✅ Password requirements: 12+ chars, upper + lower + number + symbol
- ✅ Session lifetime: 7 days idle timeout
- ✅ Enable "Sign-in with Google" only (disable other social logins to reduce attack surface)
- ✅ Disable sign-ups without email verification
- ✅ Enable attack protection (rate limiting on sign-in attempts)

**Role-Based Access Control**:
```typescript
// lib/auth/roles.ts

export enum UserRole {
  ADMIN = 'admin',        // Full access
  MEMBER = 'member',      // Can upload, review, approve
  VIEWER = 'viewer',      // Read-only access
}

export enum Permission {
  UPLOAD_DOCUMENTS = 'upload:documents',
  REVIEW_DOCUMENTS = 'review:documents',
  APPROVE_DOCUMENTS = 'approve:documents',
  MANAGE_USERS = 'manage:users',
  VIEW_ANALYTICS = 'view:analytics',
  EXPORT_DATA = 'export:data',
  MANAGE_INTEGRATIONS = 'manage:integrations',
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission), // All permissions
  [UserRole.MEMBER]: [
    Permission.UPLOAD_DOCUMENTS,
    Permission.REVIEW_DOCUMENTS,
    Permission.APPROVE_DOCUMENTS,
    Permission.VIEW_ANALYTICS,
    Permission.EXPORT_DATA,
  ],
  [UserRole.VIEWER]: [
    Permission.VIEW_ANALYTICS,
  ],
};

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole].includes(permission);
}
```

**Authorization Middleware**:
```typescript
// lib/auth/require-permission.ts

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { hasPermission, Permission } from './roles';

export async function requirePermission(permission: Permission) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  });

  if (!user || !hasPermission(user.role, permission)) {
    throw new Error('Forbidden');
  }

  return user;
}
```

**Usage in API Routes**:
```typescript
// app/api/documents/upload/route.ts

import { requirePermission } from '@/lib/auth/require-permission';
import { Permission } from '@/lib/auth/roles';

export async function POST(req: Request) {
  // Require upload permission
  const user = await requirePermission(Permission.UPLOAD_DOCUMENTS);

  // ... rest of upload logic
}
```

**Acceptance Criteria**:
- ✅ All routes protected except public pages
- ✅ MFA enabled in Clerk
- ✅ RBAC implemented with 3 roles
- ✅ Permission checks in all API routes
- ✅ Admin-only routes for user management

**Dependencies**: Integration Agent (Clerk setup)

---

**Task SEC-002: API Security**

**Rate Limiting (Vercel Built-in + Upstash Redis)**:
```typescript
// lib/rate-limit.ts

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different rate limits for different operations
export const documentUploadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 uploads per minute
  analytics: true,
});

export const apiCallLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 API calls per minute
  analytics: true,
});

export const emailLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, '1 h'), // 50 emails per hour per sender
  analytics: true,
});
```

**Apply Rate Limiting**:
```typescript
// app/api/upload/route.ts

import { auth } from '@clerk/nextjs/server';
import { documentUploadLimiter } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  // Check rate limit
  const { success, limit, reset, remaining } = await documentUploadLimiter.limit(userId);

  if (!success) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      },
    });
  }

  // ... rest of upload logic
}
```

**API Key Management (for Fund Admin API)**:
```typescript
// lib/auth/api-keys.ts

import { createHash, randomBytes } from 'crypto';
import { db } from '@/lib/db';

// Generate API key
export async function createApiKey(organizationId: string, name: string) {
  // Generate random key: "fsa_" prefix + 32 random hex chars
  const rawKey = `fsa_${randomBytes(32).toString('hex')}`;

  // Store hash only (never store raw key in DB)
  const hashedKey = createHash('sha256').update(rawKey).digest('hex');

  await db.apiKey.create({
    data: {
      name,
      keyHash: hashedKey,
      organizationId,
      lastUsedAt: null,
      expiresAt: null, // null = never expires
    },
  });

  // Return raw key ONCE (user must save it)
  return rawKey;
}

// Verify API key
export async function verifyApiKey(rawKey: string) {
  const hashedKey = createHash('sha256').update(rawKey).digest('hex');

  const apiKey = await db.apiKey.findUnique({
    where: { keyHash: hashedKey },
    include: { organization: true },
  });

  if (!apiKey) return null;

  // Check if expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  // Update last used timestamp
  await db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return apiKey;
}
```

**Prisma Schema for API Keys**:
```prisma
model ApiKey {
  id             String        @id @default(cuid())
  name           String        // "Production Key", "Test Key"
  keyHash        String        @unique // SHA-256 hash of key
  organizationId String
  organization   Organization  @relation(fields: [organizationId], references: [id])
  createdAt      DateTime      @default(now())
  lastUsedAt     DateTime?
  expiresAt      DateTime?

  @@index([organizationId])
}
```

**API Authentication Middleware**:
```typescript
// app/api/v1/capital-calls/route.ts (Fund Admin API)

import { verifyApiKey } from '@/lib/auth/api-keys';

export async function POST(req: Request) {
  // Extract API key from Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Missing API key', { status: 401 });
  }

  const apiKey = authHeader.replace('Bearer ', '');

  // Verify API key
  const verified = await verifyApiKey(apiKey);
  if (!verified) {
    return new Response('Invalid API key', { status: 401 });
  }

  // Check rate limit for this organization
  const { success } = await apiCallLimiter.limit(verified.organizationId);
  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  // ... rest of API logic
}
```

**CORS Configuration**:
```typescript
// middleware.ts (add CORS headers)

export function middleware(req: NextRequest) {
  // Only allow CORS for API routes
  if (req.nextUrl.pathname.startsWith('/api/v1')) {
    const response = NextResponse.next();

    // Strict CORS - only allow specific origins
    const allowedOrigins = [
      'https://fundadmin.example.com',
      'https://api.fundadmin.example.com',
    ];

    const origin = req.headers.get('origin');
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    return response;
  }
}
```

**Input Validation (Zod)**:
```typescript
// app/api/v1/capital-calls/route.ts

import { z } from 'zod';

const CapitalCallInputSchema = z.object({
  fund_id: z.string().min(1).max(100),
  investor_identifiers: z.object({
    email: z.string().email().optional(),
    investor_id: z.string().optional(),
  }).refine(data => data.email || data.investor_id, {
    message: 'Either email or investor_id required',
  }),
  amount: z.number().positive().max(100_000_000), // Max $100M per call
  currency: z.enum(['USD', 'EUR', 'GBP']),
  due_date: z.string().datetime(),
  wire_instructions: z.object({
    bank_name: z.string().max(200),
    account_number: z.string().max(50),
    routing_number: z.string().max(20),
    reference: z.string().max(100),
  }),
});

export async function POST(req: Request) {
  // ... auth checks

  const body = await req.json();

  // Validate input
  const result = CapitalCallInputSchema.safeParse(body);
  if (!result.success) {
    return Response.json({
      error: 'Validation failed',
      details: result.error.format(),
    }, { status: 400 });
  }

  // Use validated data
  const data = result.data;
  // ...
}
```

**Acceptance Criteria**:
- ✅ Rate limiting on all API routes (10/min for uploads, 100/min for reads)
- ✅ API key generation and verification
- ✅ CORS configured for external APIs
- ✅ Input validation on all API routes
- ✅ Rate limit headers returned

---

### Week 2-3: Data Security & Privacy

**Task SEC-003: Data Encryption & Privacy**

**Encryption at Rest**:
- ✅ Neon PostgreSQL: AES-256 automatic
- ✅ Cloudflare R2: AES-256 automatic
- ✅ No action needed (verified in dashboards)

**Encryption in Transit**:
- ✅ Vercel: TLS 1.3 automatic
- ✅ All API calls: HTTPS only
- ✅ Enforce HTTPS redirect in middleware

**PII Data Handling**:
```typescript
// lib/pii/redact.ts

// Redact sensitive fields in logs
export function redactPII(data: any) {
  const redacted = { ...data };

  const piiFields = [
    'email',
    'accountNumber',
    'routingNumber',
    'socialSecurityNumber',
    'taxId',
  ];

  piiFields.forEach(field => {
    if (redacted[field]) {
      redacted[field] = `***${redacted[field].slice(-4)}`; // Show last 4 chars only
    }
  });

  return redacted;
}
```

**Use in Logging**:
```typescript
// app/api/capital-calls/approve/route.ts

import { redactPII } from '@/lib/pii/redact';
import * as Sentry from '@sentry/nextjs';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Log with PII redacted
    console.log('Approving capital call:', redactPII(data));

    // Send to Sentry with PII scrubbed
    Sentry.captureMessage('Capital call approved', {
      level: 'info',
      extra: { data: redactPII(data) },
    });

  } catch (error) {
    // ...
  }
}
```

**Data Retention Policy**:
```typescript
// lib/data-retention/cleanup.ts

// Inngest scheduled job
export const dataRetentionCleanup = inngest.createFunction(
  { id: 'data-retention-cleanup' },
  { cron: '0 2 * * *' }, // Daily at 2 AM
  async ({ step }) => {
    // Delete documents older than 7 years (regulatory requirement)
    const sevenYearsAgo = new Date();
    sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);

    await step.run('delete-old-documents', async () => {
      const oldDocuments = await db.document.findMany({
        where: {
          createdAt: { lt: sevenYearsAgo },
          status: 'APPROVED', // Only delete approved (processed) docs
        },
      });

      for (const doc of oldDocuments) {
        // Delete from R2
        await deleteFromR2(doc.fileUrl);

        // Delete from DB
        await db.document.delete({ where: { id: doc.id } });
      }

      return { deletedCount: oldDocuments.length };
    });

    // Delete inactive users after 2 years
    await step.run('delete-inactive-users', async () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const inactiveUsers = await db.user.deleteMany({
        where: {
          lastLoginAt: { lt: twoYearsAgo },
          // Don't delete if they have recent documents
          documents: { none: {} },
        },
      });

      return { deletedCount: inactiveUsers.count };
    });
  }
);
```

**GDPR Data Export (User Request)**:
```typescript
// app/api/user/export-data/route.ts

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: {
      documents: true,
      capitalCalls: true,
      organization: true,
    },
  });

  // Export all user data as JSON
  const exportData = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
    documents: user.documents.map(doc => ({
      fileName: doc.fileName,
      uploadedAt: doc.uploadedAt,
      status: doc.status,
    })),
    capitalCalls: user.capitalCalls.map(cc => redactPII(cc)),
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="clearway-data-export.json"',
    },
  });
}
```

**GDPR Data Deletion (User Request)**:
```typescript
// app/api/user/delete-data/route.ts

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { documents: true },
  });

  // Delete all documents from R2
  for (const doc of user.documents) {
    await deleteFromR2(doc.fileUrl);
  }

  // Delete user and cascade (documents, capital calls, etc.)
  await db.user.delete({
    where: { id: user.id },
  });

  // Delete from Clerk
  await clerkClient.users.deleteUser(userId);

  return Response.json({ success: true });
}
```

**Acceptance Criteria**:
- ✅ Encryption at rest verified (Neon, R2)
- ✅ HTTPS enforced everywhere
- ✅ PII redaction in logs
- ✅ Data retention policy automated
- ✅ GDPR export endpoint
- ✅ GDPR deletion endpoint

---

### Week 4-5: Compliance & Audit Logging

**Task SEC-004: SOC2 Compliance Preparation**

**SOC2 Requirements Checklist**:
```markdown
# SOC2 Type 1 Readiness Checklist

## Access Control (CC6.1 - CC6.3)
- [x] MFA enabled for all admin users
- [x] Role-based access control (RBAC)
- [x] Password complexity requirements
- [x] Session timeout (7 days idle)
- [x] API key management
- [x] Audit logging of access events

## Encryption (CC6.6)
- [x] Data encrypted at rest (AES-256)
- [x] Data encrypted in transit (TLS 1.3)
- [x] API keys hashed (SHA-256)

## Monitoring & Incident Response (CC7.2 - CC7.5)
- [x] Error monitoring (Sentry)
- [x] Security event logging
- [x] Incident response plan
- [x] Breach notification process

## Change Management (CC8.1)
- [x] Code review required (GitHub PR)
- [x] Automated testing (95% coverage)
- [x] Deployment approval process

## Data Retention & Disposal (CC6.5)
- [x] Data retention policy (7 years)
- [x] Secure data deletion process
- [x] GDPR compliance (export/delete)
```

**Audit Logging**:
```prisma
// prisma/schema.prisma

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  action    String   // "document.upload", "capital_call.approve", "user.delete"
  resource  String   // "document:abc123", "user:xyz789"
  metadata  Json?    // Additional context
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

**Audit Logging Utility**:
```typescript
// lib/audit/log.ts

import { db } from '@/lib/db';
import { headers } from 'next/headers';

export async function auditLog({
  userId,
  action,
  resource,
  metadata = {},
}: {
  userId?: string;
  action: string;
  resource: string;
  metadata?: Record<string, any>;
}) {
  const headersList = headers();
  const ipAddress = headersList.get('x-forwarded-for') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  await db.auditLog.create({
    data: {
      userId,
      action,
      resource,
      metadata,
      ipAddress,
      userAgent,
    },
  });
}
```

**Usage in API Routes**:
```typescript
// app/api/capital-calls/approve/route.ts

import { auditLog } from '@/lib/audit/log';

export async function POST(req: Request) {
  const { userId } = await auth();
  const { capitalCallId } = await req.json();

  // Approve capital call
  await db.capitalCall.update({
    where: { id: capitalCallId },
    data: { status: 'APPROVED' },
  });

  // Audit log
  await auditLog({
    userId,
    action: 'capital_call.approve',
    resource: `capital_call:${capitalCallId}`,
    metadata: { approvedAt: new Date().toISOString() },
  });

  return Response.json({ success: true });
}
```

**Audit Log Viewer (Admin Only)**:
```typescript
// app/admin/audit-logs/page.tsx

export default async function AuditLogsPage() {
  const { userId } = await auth();
  const user = await requirePermission(Permission.MANAGE_USERS);

  const logs = await db.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { email: true } } },
  });

  return (
    <div>
      <h1>Audit Logs</h1>
      <Table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Action</th>
            <th>Resource</th>
            <th>IP Address</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>{log.createdAt.toLocaleString()}</td>
              <td>{log.user?.email || 'System'}</td>
              <td>{log.action}</td>
              <td>{log.resource}</td>
              <td>{log.ipAddress}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
```

**Acceptance Criteria**:
- ✅ SOC2 checklist 90% complete
- ✅ Audit logging on all sensitive actions
- ✅ Admin audit log viewer
- ✅ Audit logs immutable (no delete/update)
- ✅ Retention: 7 years

---

### Week 6-7: Security Testing

**Task SEC-005: Vulnerability Scanning & Penetration Testing**

**Dependency Auditing**:
```bash
# Run weekly (via CI/CD)
npm audit --audit-level=high

# Auto-fix non-breaking vulnerabilities
npm audit fix
```

**GitHub Dependabot**:
```yaml
# .github/dependabot.yml

version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    # Auto-merge security patches
    labels:
      - "dependencies"
      - "security"
```

**OWASP ZAP Scanning**:
```yaml
# .github/workflows/security-scan.yml

name: Security Scan

on:
  schedule:
    - cron: '0 2 * * 0' # Weekly on Sunday at 2 AM
  workflow_dispatch:

jobs:
  zap_scan:
    runs-on: ubuntu-latest
    steps:
      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'https://clearway-preview.vercel.app'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'
```

**Snyk Security Scanning**:
```bash
# Install Snyk
npm install -g snyk

# Authenticate
snyk auth

# Test for vulnerabilities
snyk test

# Monitor continuously
snyk monitor
```

**Security Headers**:
```typescript
// next.config.js

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};
```

**Penetration Testing Checklist**:
```markdown
# Pre-Launch Penetration Test

## Authentication & Authorization
- [ ] Test MFA bypass attempts
- [ ] Test session fixation attacks
- [ ] Test privilege escalation (viewer → admin)
- [ ] Test API key brute force
- [ ] Test CSRF protection

## Injection Attacks
- [ ] SQL injection (Prisma should prevent)
- [ ] NoSQL injection (MongoDB N/A)
- [ ] Command injection (file uploads)
- [ ] XSS (React escaping)

## Data Security
- [ ] Test encryption at rest (verify Neon)
- [ ] Test TLS configuration (SSLLabs)
- [ ] Test API key exposure in logs
- [ ] Test PII leakage in error messages

## Business Logic
- [ ] Test rate limit bypass
- [ ] Test document access control (user A can't access user B's docs)
- [ ] Test organization isolation
- [ ] Test payment bypass (when billing implemented)

## Third-Party Integrations
- [ ] Test Clerk security configuration
- [ ] Test R2 bucket permissions (no public read)
- [ ] Test webhook signature validation
```

**External Penetration Test** (hire firm at Month 5):
- Budget: $5K-$10K
- Firms: Bishop Fox, NCC Group, Cure53
- Scope: Web app + API
- Report findings → Fix within 30 days → Re-test

**Acceptance Criteria**:
- ✅ npm audit shows 0 high/critical vulnerabilities
- ✅ OWASP ZAP scan passes
- ✅ Snyk scan passes
- ✅ Security headers configured
- ✅ Penetration test scheduled (Month 5)

---

### Week 8: Incident Response & Monitoring

**Task SEC-006: Security Monitoring & Incident Response**

**Security Event Detection**:
```typescript
// lib/security/detect-anomalies.ts

import { db } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';

// Detect multiple failed login attempts
export async function detectBruteForce(email: string) {
  const failedAttempts = await db.auditLog.count({
    where: {
      action: 'auth.login_failed',
      metadata: {
        path: ['email'],
        equals: email,
      },
      createdAt: {
        gte: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
      },
    },
  });

  if (failedAttempts > 5) {
    // Alert security team
    Sentry.captureMessage('Brute force attack detected', {
      level: 'warning',
      tags: { type: 'security' },
      extra: { email, attempts: failedAttempts },
    });

    // Lock account temporarily (Clerk handles this)
    return true;
  }

  return false;
}

// Detect unusual API usage patterns
export async function detectAPIAbuse(organizationId: string) {
  const callsLastHour = await db.auditLog.count({
    where: {
      action: 'api.capital_call.create',
      resource: { startsWith: `org:${organizationId}` },
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
      },
    },
  });

  // Alert if > 1000 calls/hour (suspicious)
  if (callsLastHour > 1000) {
    Sentry.captureMessage('Unusual API usage detected', {
      level: 'warning',
      tags: { type: 'security', organizationId },
      extra: { callsLastHour },
    });
  }
}
```

**Incident Response Plan**:
```markdown
# Security Incident Response Playbook

## Phase 1: Detection & Assessment (0-15 minutes)
1. Alert received via:
   - Sentry notification
   - User report
   - Automated monitoring

2. Initial assessment:
   - Severity: P0 (critical) / P1 (high) / P2 (medium) / P3 (low)
   - Impact: Data breach / Service disruption / Isolated incident
   - Scope: Number of users affected

## Phase 2: Containment (15-60 minutes)
1. If data breach suspected:
   - Revoke compromised API keys
   - Force logout all sessions (Clerk)
   - Disable affected integrations
   - Enable maintenance mode if needed

2. Preserve evidence:
   - Export audit logs
   - Save Sentry error traces
   - Take database snapshots

## Phase 3: Investigation (1-24 hours)
1. Root cause analysis:
   - Review audit logs
   - Check recent deployments
   - Analyze attack vectors

2. Determine data accessed:
   - Query audit logs for affected resources
   - Identify PII exposure

## Phase 4: Recovery (24-72 hours)
1. Apply fixes:
   - Deploy security patches
   - Rotate compromised credentials
   - Update security rules

2. Verify resolution:
   - Test attack vector
   - Penetration test
   - Monitor for recurrence

## Phase 5: Post-Incident (Week 1)
1. Breach notification (if required):
   - Notify affected users within 72 hours (GDPR)
   - Notify regulators if required
   - Public disclosure if >500 users affected

2. Post-mortem:
   - Document timeline
   - Identify prevention measures
   - Update security policies

## Contacts
- Security Lead: [Email]
- Legal Counsel: [Email]
- Incident Response Firm: [Name, Phone]
- Insurance: [Cyber insurance policy #]
```

**Breach Notification Templates**:
```typescript
// lib/email/templates/security-incident.tsx

export function DataBreachNotificationEmail({
  userName,
  incidentDate,
  dataAffected,
}: {
  userName: string;
  incidentDate: string;
  dataAffected: string[];
}) {
  return (
    <Html>
      <Section>
        <Text><strong>Important Security Notice</strong></Text>

        <Text>Dear {userName},</Text>

        <Text>
          We are writing to inform you of a security incident that may have affected your data.
        </Text>

        <Text><strong>What happened:</strong></Text>
        <Text>
          On {incidentDate}, we discovered unauthorized access to our systems.
        </Text>

        <Text><strong>What information was involved:</strong></Text>
        <ul>
          {dataAffected.map(item => <li key={item}>{item}</li>)}
        </ul>

        <Text><strong>What we're doing:</strong></Text>
        <ul>
          <li>We have secured our systems and fixed the vulnerability</li>
          <li>We are working with cybersecurity experts to investigate</li>
          <li>We have notified law enforcement</li>
        </ul>

        <Text><strong>What you should do:</strong></Text>
        <ul>
          <li>Change your Clearway password immediately</li>
          <li>Enable multi-factor authentication (MFA)</li>
          <li>Monitor your accounts for suspicious activity</li>
        </ul>

        <Text>
          We sincerely apologize for this incident. If you have questions, please contact us at security@clearway.com
        </Text>

        <Button href="https://clearway.com/security-incident">
          Learn More
        </Button>
      </Section>
    </Html>
  );
}
```

**Acceptance Criteria**:
- ✅ Anomaly detection implemented
- ✅ Incident response plan documented
- ✅ Breach notification templates ready
- ✅ Security team contacts defined
- ✅ Sentry alerts configured

---

## Compliance Documentation

### Privacy Policy
```markdown
# Clearway Privacy Policy

Last Updated: [Date]

## What We Collect
- Account information (email, name)
- Document data (PDFs, extracted data)
- Usage data (analytics, logs)

## How We Use It
- Provide capital call extraction service
- Improve AI accuracy
- Customer support
- Security monitoring

## How We Protect It
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Access controls (RBAC)
- Regular security audits

## Your Rights (GDPR)
- Export your data: /api/user/export-data
- Delete your data: /api/user/delete-data
- Object to processing: security@clearway.com

## Data Retention
- Active users: Indefinite
- Inactive users: 2 years
- Documents: 7 years (regulatory requirement)

## Contact
security@clearway.com
```

### Terms of Service
```markdown
# Clearway Terms of Service

## Service Description
Clearway provides AI-powered capital call extraction for RIAs.

## Acceptable Use
- No abusive behavior
- No unauthorized access attempts
- No reverse engineering AI models

## Data Ownership
- You own your data
- We have license to process for service delivery
- You can export/delete anytime

## Liability
- Service provided "as is"
- No guarantee of 100% accuracy
- User responsible for reviewing extractions

## Termination
- Either party can terminate with 30 days notice
- We will provide data export before deletion
```

---

## Handoff Requirements

### To All Agents
```markdown
## Security Standards (All Code Must Follow)

1. **Authentication**: All API routes must use `await auth()` or `requirePermission()`
2. **Input Validation**: All API inputs validated with Zod
3. **Rate Limiting**: Apply appropriate limiter (upload/api/email)
4. **PII Redaction**: Use `redactPII()` before logging
5. **Audit Logging**: Log all sensitive actions with `auditLog()`
6. **Error Handling**: Never expose stack traces or internal details to users
```

### To DevOps Agent
- Configure security headers in Vercel
- Set up weekly Snyk scans in CI/CD
- Enable Vercel DDoS protection
- Configure Upstash Redis for rate limiting

### To Testing Agent
- Test RBAC (viewer can't upload, member can't manage users)
- Test rate limiting (trigger 429 errors)
- Test API key authentication
- Test GDPR export/delete endpoints

---

## Status Reporting

Location: `.agents/status/security-compliance-status.json`

```json
{
  "agent": "security-compliance-agent",
  "date": "2025-11-20",
  "status": "complete",
  "current_week": 8,
  "completed_tasks": ["SEC-001", "SEC-002", "SEC-003", "SEC-004", "SEC-005", "SEC-006"],
  "in_progress_tasks": [],
  "blocked_tasks": [],
  "compliance": {
    "soc2_readiness": "90%",
    "gdpr_compliant": true,
    "security_headers": true,
    "vulnerability_scan": "passing"
  }
}
```

---

**Security & Compliance Agent is ready to ensure Clearway meets enterprise security standards and SOC2/GDPR compliance requirements.**
