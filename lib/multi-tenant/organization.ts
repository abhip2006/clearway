// Organization Service - Multi-Tenant & Enterprise Agent
// Task ENT-001: Organization Model & Isolation

import { db } from '@/lib/db';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Create owner membership
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

  /**
   * Create default roles for organization
   */
  private async createDefaultRoles(organizationId: string) {
    const roles = [
      {
        name: 'Admin',
        description: 'Full access to all features except billing',
        permissions: [
          'capital_calls:*',
          'users:*',
          'settings:write',
          'reports:*',
          'documents:*',
        ],
      },
      {
        name: 'Manager',
        description: 'Can manage capital calls and view reports',
        permissions: [
          'capital_calls:read',
          'capital_calls:write',
          'capital_calls:approve',
          'capital_calls:reject',
          'reports:read',
          'documents:read',
        ],
      },
      {
        name: 'Viewer',
        description: 'Read-only access to capital calls and reports',
        permissions: [
          'capital_calls:read',
          'reports:read',
          'documents:read',
        ],
      },
    ];

    for (const role of roles) {
      await db.organizationRole.create({
        data: {
          organizationId,
          name: role.name,
          description: role.description,
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

    // Check if user is already a member
    const existingMember = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: params.organizationId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      throw new Error('User is already a member of this organization');
    }

    // Get role permissions
    const role = await db.organizationRole.findFirst({
      where: {
        organizationId: params.organizationId,
        name: params.role,
      },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // Add to organization
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
   * Remove user from organization
   */
  async removeMember(params: {
    organizationId: string;
    userId: string;
  }) {
    const member = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: params.organizationId,
          userId: params.userId,
        },
      },
    });

    if (!member) {
      throw new Error('User is not a member of this organization');
    }

    if (member.role === 'OWNER') {
      throw new Error('Cannot remove the organization owner');
    }

    await db.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId: params.organizationId,
          userId: params.userId,
        },
      },
    });
  }

  /**
   * Update member role
   */
  async updateMemberRole(params: {
    organizationId: string;
    userId: string;
    role: string;
  }) {
    const member = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: params.organizationId,
          userId: params.userId,
        },
      },
    });

    if (!member) {
      throw new Error('User is not a member of this organization');
    }

    if (member.role === 'OWNER') {
      throw new Error('Cannot change the role of the organization owner');
    }

    // Get role permissions
    const role = await db.organizationRole.findFirst({
      where: {
        organizationId: params.organizationId,
        name: params.role,
      },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    await db.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId: params.organizationId,
          userId: params.userId,
        },
      },
      data: {
        role: params.role,
        permissions: role.permissions,
      },
    });
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

  /**
   * Get user's organizations
   */
  async getUserOrganizations(userId: string) {
    const memberships = await db.organizationMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
    });

    return memberships.map(m => ({
      ...m.organization,
      role: m.role,
      permissions: m.permissions,
    }));
  }

  /**
   * Get organization members
   */
  async getOrganizationMembers(organizationId: string) {
    const members = await db.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return members;
  }

  /**
   * Get pending invitations
   */
  async getPendingInvites(organizationId: string) {
    const invites = await db.organizationInvite.findMany({
      where: {
        organizationId,
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return invites;
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(token: string, userId: string) {
    const invite = await db.organizationInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new Error('Invalid invitation token');
    }

    if (invite.acceptedAt) {
      throw new Error('Invitation already accepted');
    }

    if (invite.expiresAt < new Date()) {
      throw new Error('Invitation expired');
    }

    // Get role permissions
    const role = await db.organizationRole.findFirst({
      where: {
        organizationId: invite.organizationId,
        name: invite.role,
      },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // Add user to organization
    await db.organizationMember.create({
      data: {
        organizationId: invite.organizationId,
        userId,
        role: invite.role,
        permissions: role.permissions,
      },
    });

    // Mark invitation as accepted
    await db.organizationInvite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    });

    return invite.organizationId;
  }

  /**
   * Send invitation email
   */
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

    if (!organization || !inviter) {
      throw new Error('Organization or inviter not found');
    }

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
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${inviteToken}`;

    await resend.emails.send({
      from: 'Clearway <invites@clearway.com>',
      to: params.email,
      subject: `You've been invited to join ${organization.name} on Clearway`,
      html: `
        <h1>You've been invited to join ${organization.name}</h1>
        <p>${inviter.name || inviter.email} has invited you to join ${organization.name} as a ${params.role}.</p>
        <p><a href="${inviteLink}">Accept Invitation</a></p>
        <p>This invitation will expire in 7 days.</p>
      `,
    });
  }

  /**
   * Create custom role
   */
  async createRole(params: {
    organizationId: string;
    name: string;
    description?: string;
    permissions: string[];
  }) {
    const existingRole = await db.organizationRole.findUnique({
      where: {
        organizationId_name: {
          organizationId: params.organizationId,
          name: params.name,
        },
      },
    });

    if (existingRole) {
      throw new Error('Role with this name already exists');
    }

    const role = await db.organizationRole.create({
      data: {
        organizationId: params.organizationId,
        name: params.name,
        description: params.description,
        permissions: params.permissions,
      },
    });

    return role;
  }

  /**
   * Update role permissions
   */
  async updateRole(params: {
    organizationId: string;
    roleId: string;
    permissions: string[];
  }) {
    const role = await db.organizationRole.findFirst({
      where: {
        id: params.roleId,
        organizationId: params.organizationId,
      },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // Update role
    await db.organizationRole.update({
      where: { id: params.roleId },
      data: { permissions: params.permissions },
    });

    // Update all members with this role
    await db.organizationMember.updateMany({
      where: {
        organizationId: params.organizationId,
        role: role.name,
      },
      data: {
        permissions: params.permissions,
      },
    });
  }

  /**
   * Delete custom role
   */
  async deleteRole(params: {
    organizationId: string;
    roleId: string;
  }) {
    const role = await db.organizationRole.findFirst({
      where: {
        id: params.roleId,
        organizationId: params.organizationId,
      },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // Check if role is in use
    const membersCount = await db.organizationMember.count({
      where: {
        organizationId: params.organizationId,
        role: role.name,
      },
    });

    if (membersCount > 0) {
      throw new Error('Cannot delete role that is currently assigned to members');
    }

    await db.organizationRole.delete({
      where: { id: params.roleId },
    });
  }

  /**
   * Get organization roles
   */
  async getOrganizationRoles(organizationId: string) {
    const roles = await db.organizationRole.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });

    return roles;
  }
}

// Export singleton instance
export const organizationService = new OrganizationService();
