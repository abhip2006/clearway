# Multi-Tenant & Enterprise Agent 🏢

## Role
Specialized agent responsible for enterprise features: multi-tenant architecture, organization management, team collaboration, role-based access control, white-labeling, and enterprise SSO. Enables Clearway to serve RIA firms and family offices with multiple users.

## Primary Responsibilities

1. **Organization Management**
   - Multi-organization support
   - Organization hierarchy
   - Subdomain routing
   - Organization settings
   - Billing per organization

2. **Team Collaboration**
   - Multi-user workspaces
   - Shared capital calls
   - Team notifications
   - Activity feeds
   - Comment threads

3. **Advanced RBAC**
   - Custom roles and permissions
   - Resource-level access control
   - Admin/Manager/Viewer roles
   - Permission inheritance
   - Audit trail

4. **Enterprise SSO**
   - SAML 2.0 integration
   - Okta/Azure AD connectors
   - Just-in-Time provisioning
   - SCIM user sync
   - Session management

5. **White-Label & Customization**
   - Custom domains
   - Brand customization (logo, colors)
   - Custom email templates
   - API white-labeling
   - Embedded dashboards

## Tech Stack

### Identity & SSO
- **Clerk** with Enterprise SSO
- **SAML.js** for SAML integration
- **Auth0** (alternative)

### Multi-Tenancy
- **Row-level security** in PostgreSQL
- **Tenant isolation** strategy
- **Subdomain routing**

## Phase 2 Features

### Week 17-18: Multi-Tenant Architecture

**Task ENT-001: Organization Model & Isolation**
```typescript
// lib/multi-tenant/organization.ts

import { db } from '@/lib/db';

export class OrganizationService {
  /**
   * Create organization with initial setup
   */
  async createOrganization(params: {
    name: string;
    slug: string;
    domain?: string;
    ownerId: string;
    plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  }) {
    // Create organization
    const organization = await db.organization.create({
      data: {
        name: params.name,
        slug: params.slug,
        customDomain: params.domain,
        plan: params.plan,
        settings: {
          branding: {
            primaryColor: '#0066FF',
            logo: null,
          },
          features: {
            multiUser: params.plan !== 'STARTER',
            customBranding: params.plan === 'ENTERPRISE',
            sso: params.plan === 'ENTERPRISE',
          },
        },
      },
    });

    // Create owner role
    await db.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: params.ownerId,
        role: 'OWNER',
        permissions: ['*'], // All permissions
      },
    });

    // Create default roles
    await this.createDefaultRoles(organization.id);

    return organization;
  }

  private async createDefaultRoles(organizationId: string) {
    const roles = [
      {
        name: 'Admin',
        permissions: [
          'capital_calls:*',
          'users:*',
          'settings:write',
          'reports:*',
        ],
      },
      {
        name: 'Manager',
        permissions: [
          'capital_calls:read',
          'capital_calls:approve',
          'capital_calls:reject',
          'reports:read',
        ],
      },
      {
        name: 'Viewer',
        permissions: [
          'capital_calls:read',
          'reports:read',
        ],
      },
    ];

    for (const role of roles) {
      await db.organizationRole.create({
        data: {
          organizationId,
          name: role.name,
          permissions: role.permissions,
        },
      });
    }
  }

  /**
   * Add user to organization
   */
  async addMember(params: {
    organizationId: string;
    email: string;
    role: string;
    invitedBy: string;
  }) {
    // Check if user exists
    let user = await db.user.findUnique({
      where: { email: params.email },
    });

    if (!user) {
      // Send invitation email
      await this.sendInvitation({
        email: params.email,
        organizationId: params.organizationId,
        role: params.role,
        invitedBy: params.invitedBy,
      });
      return { invited: true };
    }

    // Add to organization
    const role = await db.organizationRole.findFirst({
      where: {
        organizationId: params.organizationId,
        name: params.role,
      },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    await db.organizationMember.create({
      data: {
        organizationId: params.organizationId,
        userId: user.id,
        role: params.role,
        permissions: role.permissions,
      },
    });

    return { invited: false, user };
  }

  /**
   * Check permission for user action
   */
  async hasPermission(params: {
    userId: string;
    organizationId: string;
    permission: string;
  }): Promise<boolean> {
    const member = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: params.organizationId,
          userId: params.userId,
        },
      },
    });

    if (!member) return false;

    // Check for wildcard permission
    if (member.permissions.includes('*')) return true;

    // Check for specific permission
    if (member.permissions.includes(params.permission)) return true;

    // Check for namespace wildcard (e.g., "capital_calls:*")
    const namespace = params.permission.split(':')[0];
    if (member.permissions.includes(`${namespace}:*`)) return true;

    return false;
  }

  private async sendInvitation(params: {
    email: string;
    organizationId: string;
    role: string;
    invitedBy: string;
  }) {
    const organization = await db.organization.findUnique({
      where: { id: params.organizationId },
    });

    const inviter = await db.user.findUnique({
      where: { id: params.invitedBy },
    });

    const inviteToken = crypto.randomUUID();

    await db.organizationInvite.create({
      data: {
        organizationId: params.organizationId,
        email: params.email,
        role: params.role,
        invitedBy: params.invitedBy,
        token: inviteToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Send email
    await resend.emails.send({
      from: 'Clearway <invites@clearway.com>',
      to: params.email,
      subject: `You've been invited to join ${organization!.name} on Clearway`,
      react: OrganizationInviteEmail({
        organizationName: organization!.name,
        inviterName: inviter!.name || inviter!.email,
        role: params.role,
        inviteLink: `https://clearway.com/invite/${inviteToken}`,
      }),
    });
  }
}
```

**Task ENT-002: Tenant Isolation Middleware**
```typescript
// lib/multi-tenant/isolation.ts

import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';

/**
 * Tenant context from subdomain or header
 */
export async function getTenantContext(): Promise<{
  organizationId: string;
  userId: string;
  permissions: string[];
}> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Get organization from subdomain or header
  const headersList = headers();
  const host = headersList.get('host') || '';
  const subdomain = host.split('.')[0];

  let organizationId: string;

  if (subdomain && subdomain !== 'app' && subdomain !== 'www') {
    // Subdomain-based tenant
    const org = await db.organization.findUnique({
      where: { slug: subdomain },
    });
    if (!org) throw new Error('Organization not found');
    organizationId = org.id;
  } else {
    // Header-based or user's default organization
    const orgHeader = headersList.get('x-organization-id');
    if (orgHeader) {
      organizationId = orgHeader;
    } else {
      // Get user's primary organization
      const user = await db.user.findUnique({
        where: { clerkId: userId },
        include: { organizationMemberships: true },
      });
      organizationId = user?.organizationId || user?.organizationMemberships[0]?.organizationId;
      if (!organizationId) throw new Error('No organization found');
    }
  }

  // Get user's permissions in this organization
  const member = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: userId,
      },
    },
  });

  if (!member) {
    throw new Error('User not member of organization');
  }

  return {
    organizationId,
    userId,
    permissions: member.permissions,
  };
}

/**
 * Middleware to enforce tenant isolation
 */
export function requirePermission(permission: string) {
  return async (req: Request) => {
    const context = await getTenantContext();

    if (!context.permissions.includes('*') && !context.permissions.includes(permission)) {
      const namespace = permission.split(':')[0];
      if (!context.permissions.includes(`${namespace}:*`)) {
        throw new Error('Insufficient permissions');
      }
    }

    return context;
  };
}

/**
 * Database query wrapper with automatic tenant filtering
 */
export function createTenantPrisma(organizationId: string) {
  return db.$extends({
    query: {
      capitalCall: {
        async findMany({ args, query }) {
          args.where = {
            ...args.where,
            organizationId,
          };
          return query(args);
        },
        async create({ args, query }) {
          args.data = {
            ...args.data,
            organizationId,
          };
          return query(args);
        },
      },
      document: {
        async findMany({ args, query }) {
          args.where = {
            ...args.where,
            organizationId,
          };
          return query(args);
        },
      },
      // Add for all models...
    },
  });
}
```

**Task ENT-003: Enterprise SSO (SAML)**
```typescript
// lib/auth/saml.ts

import { SAML } from '@boxyhq/saml-jackson';

const samlConfig = {
  externalUrl: process.env.NEXT_PUBLIC_APP_URL!,
  samlPath: '/api/auth/saml/acs',
  db: {
    engine: 'sql',
    type: 'postgres',
    url: process.env.DATABASE_URL!,
  },
};

const jackson = await SAML(samlConfig);

export class SAMLService {
  /**
   * Create SAML connection for organization
   */
  async createSAMLConnection(params: {
    organizationId: string;
    metadataUrl?: string;
    metadataXml?: string;
    defaultRedirectUrl: string;
  }) {
    const organization = await db.organization.findUnique({
      where: { id: params.organizationId },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const { apiController } = jackson;

    await apiController.config({
      tenant: organization.slug,
      product: 'clearway',
      name: organization.name,
      description: `SAML SSO for ${organization.name}`,
      redirectUrl: [params.defaultRedirectUrl],
      defaultRedirectUrl: params.defaultRedirectUrl,
      metadataUrl: params.metadataUrl,
      rawMetadata: params.metadataXml,
    });

    // Store SSO configuration
    await db.ssoConnection.create({
      data: {
        organizationId: params.organizationId,
        provider: 'SAML',
        enabled: true,
        config: {
          metadataUrl: params.metadataUrl,
        },
      },
    });
  }

  /**
   * Handle SAML login
   */
  async handleSAMLLogin(organizationSlug: string) {
    const { apiController } = jackson;

    const { redirect_url } = await apiController.authorize({
      tenant: organizationSlug,
      product: 'clearway',
    });

    return redirect_url;
  }

  /**
   * Handle SAML callback
   */
  async handleSAMLCallback(samlResponse: string) {
    const { oauthController } = jackson;

    const { profile } = await oauthController.samlResponse({
      SAMLResponse: samlResponse,
    });

    // Get or create user
    let user = await db.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      // Just-in-Time provisioning
      user = await db.user.create({
        data: {
          email: profile.email,
          name: `${profile.firstName} ${profile.lastName}`,
          clerkId: `saml-${crypto.randomUUID()}`,
        },
      });

      // Add to organization
      const organization = await db.organization.findUnique({
        where: { slug: profile.tenant },
      });

      if (organization) {
        await db.organizationMember.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            role: 'VIEWER', // Default role
            permissions: ['capital_calls:read', 'reports:read'],
          },
        });
      }
    }

    return user;
  }
}
```

## Database Schema Additions

```prisma
model Organization {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  customDomain  String?  @unique

  plan          String   @default("STARTER") // STARTER, PROFESSIONAL, ENTERPRISE
  settings      Json     // Branding, features, etc.

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  members       OrganizationMember[]
  invites       OrganizationInvite[]
  roles         OrganizationRole[]
  ssoConnections SSOConnection[]
}

model OrganizationMember {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  userId         String
  user           User @relation(fields: [userId], references: [id])

  role           String
  permissions    String[] // ["capital_calls:*", "users:read"]

  joinedAt       DateTime @default(now())

  @@unique([organizationId, userId])
  @@index([organizationId])
  @@index([userId])
}

model OrganizationRole {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  name           String
  permissions    String[]

  createdAt      DateTime @default(now())

  @@unique([organizationId, name])
  @@index([organizationId])
}

model OrganizationInvite {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  email          String
  role           String
  invitedBy      String
  token          String   @unique

  expiresAt      DateTime
  acceptedAt     DateTime?

  @@index([organizationId])
  @@index([email])
}

model SSOConnection {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  provider       String   // SAML, OIDC
  enabled        Boolean  @default(true)
  config         Json

  createdAt      DateTime @default(now())

  @@index([organizationId])
}
```

---

**Multi-Tenant & Enterprise Agent ready to serve RIA firms and family offices with team collaboration and enterprise SSO.**
