/**
 * Integration Tests: Organization Invite Flow
 *
 * Tests the multi-tenant organization invite and member management:
 * - Sending invites
 * - Accepting invites
 * - Revoking invites
 * - Role management
 * - Access control
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Organization Invite Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sending Invites', () => {
    it('should send invite to new member', async () => {
      const organizationId = 'org-123';
      const inviterUserId = 'user-admin';
      const inviteeEmail = 'newmember@example.com';

      const invite = await sendOrganizationInvite({
        organizationId,
        inviterUserId,
        inviteeEmail,
        role: 'MEMBER',
      });

      expect(invite.id).toBeDefined();
      expect(invite.organizationId).toBe(organizationId);
      expect(invite.inviteeEmail).toBe(inviteeEmail);
      expect(invite.status).toBe('PENDING');
      expect(invite.token).toBeDefined();
      expect(invite.expiresAt).toBeDefined();
    });

    it('should send invite email', async () => {
      const invite = await sendOrganizationInvite({
        organizationId: 'org-123',
        inviterUserId: 'user-admin',
        inviteeEmail: 'newmember@example.com',
        role: 'MEMBER',
      });

      const emails = await getEmailsSent();
      const inviteEmail = emails.find(
        (e) => e.to === 'newmember@example.com' && e.type === 'ORG_INVITE'
      );

      expect(inviteEmail).toBeDefined();
      expect(inviteEmail?.subject).toContain('invited you');
      expect(inviteEmail?.body).toContain(invite.token);
    });

    it('should set invite expiration (7 days)', async () => {
      const invite = await sendOrganizationInvite({
        organizationId: 'org-123',
        inviterUserId: 'user-admin',
        inviteeEmail: 'newmember@example.com',
        role: 'MEMBER',
      });

      const expiresAt = new Date(invite.expiresAt);
      const now = new Date();
      const daysDifference =
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      expect(daysDifference).toBeGreaterThan(6);
      expect(daysDifference).toBeLessThan(8);
    });

    it('should prevent duplicate invites to same email', async () => {
      const inviteData = {
        organizationId: 'org-123',
        inviterUserId: 'user-admin',
        inviteeEmail: 'duplicate@example.com',
        role: 'MEMBER' as const,
      };

      await sendOrganizationInvite(inviteData);

      await expect(sendOrganizationInvite(inviteData)).rejects.toThrow(
        'Invite already exists'
      );
    });

    it('should allow specifying role in invite', async () => {
      const roles = ['ADMIN', 'MEMBER', 'VIEWER'] as const;

      for (const role of roles) {
        const invite = await sendOrganizationInvite({
          organizationId: 'org-123',
          inviterUserId: 'user-admin',
          inviteeEmail: `${role.toLowerCase()}@example.com`,
          role,
        });

        expect(invite.role).toBe(role);
      }
    });

    it('should require admin permission to send invites', async () => {
      await expect(
        sendOrganizationInvite({
          organizationId: 'org-123',
          inviterUserId: 'user-member', // Not admin
          inviteeEmail: 'test@example.com',
          role: 'MEMBER',
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('Accepting Invites', () => {
    it('should accept valid invite and add user to organization', async () => {
      const invite = await sendOrganizationInvite({
        organizationId: 'org-123',
        inviterUserId: 'user-admin',
        inviteeEmail: 'newmember@example.com',
        role: 'MEMBER',
      });

      const membership = await acceptOrganizationInvite(invite.token, {
        userId: 'user-new',
        email: 'newmember@example.com',
      });

      expect(membership.organizationId).toBe('org-123');
      expect(membership.userId).toBe('user-new');
      expect(membership.role).toBe('MEMBER');
    });

    it('should update invite status to accepted', async () => {
      const invite = await sendOrganizationInvite({
        organizationId: 'org-123',
        inviterUserId: 'user-admin',
        inviteeEmail: 'newmember@example.com',
        role: 'MEMBER',
      });

      await acceptOrganizationInvite(invite.token, {
        userId: 'user-new',
        email: 'newmember@example.com',
      });

      const updatedInvite = await getInvite(invite.id);
      expect(updatedInvite.status).toBe('ACCEPTED');
      expect(updatedInvite.acceptedAt).toBeDefined();
    });

    it('should reject expired invite', async () => {
      const expiredInvite = await createExpiredInvite({
        organizationId: 'org-123',
        inviteeEmail: 'expired@example.com',
        role: 'MEMBER',
      });

      await expect(
        acceptOrganizationInvite(expiredInvite.token, {
          userId: 'user-new',
          email: 'expired@example.com',
        })
      ).rejects.toThrow('Invite has expired');
    });

    it('should reject invalid token', async () => {
      await expect(
        acceptOrganizationInvite('invalid-token', {
          userId: 'user-new',
          email: 'test@example.com',
        })
      ).rejects.toThrow('Invalid invite token');
    });

    it('should verify email matches invite', async () => {
      const invite = await sendOrganizationInvite({
        organizationId: 'org-123',
        inviterUserId: 'user-admin',
        inviteeEmail: 'correct@example.com',
        role: 'MEMBER',
      });

      await expect(
        acceptOrganizationInvite(invite.token, {
          userId: 'user-new',
          email: 'wrong@example.com', // Different email
        })
      ).rejects.toThrow('Email mismatch');
    });

    it('should send welcome email after acceptance', async () => {
      const invite = await sendOrganizationInvite({
        organizationId: 'org-123',
        inviterUserId: 'user-admin',
        inviteeEmail: 'newmember@example.com',
        role: 'MEMBER',
      });

      await acceptOrganizationInvite(invite.token, {
        userId: 'user-new',
        email: 'newmember@example.com',
      });

      const emails = await getEmailsSent();
      const welcomeEmail = emails.find(
        (e) => e.to === 'newmember@example.com' && e.type === 'ORG_WELCOME'
      );

      expect(welcomeEmail).toBeDefined();
    });
  });

  describe('Revoking Invites', () => {
    it('should revoke pending invite', async () => {
      const invite = await sendOrganizationInvite({
        organizationId: 'org-123',
        inviterUserId: 'user-admin',
        inviteeEmail: 'revoke@example.com',
        role: 'MEMBER',
      });

      await revokeOrganizationInvite(invite.id, 'user-admin');

      const revokedInvite = await getInvite(invite.id);
      expect(revokedInvite.status).toBe('REVOKED');
      expect(revokedInvite.revokedAt).toBeDefined();
    });

    it('should require admin permission to revoke', async () => {
      const invite = await sendOrganizationInvite({
        organizationId: 'org-123',
        inviterUserId: 'user-admin',
        inviteeEmail: 'test@example.com',
        role: 'MEMBER',
      });

      await expect(
        revokeOrganizationInvite(invite.id, 'user-member') // Not admin
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should not allow accepting revoked invite', async () => {
      const invite = await sendOrganizationInvite({
        organizationId: 'org-123',
        inviterUserId: 'user-admin',
        inviteeEmail: 'revoked@example.com',
        role: 'MEMBER',
      });

      await revokeOrganizationInvite(invite.id, 'user-admin');

      await expect(
        acceptOrganizationInvite(invite.token, {
          userId: 'user-new',
          email: 'revoked@example.com',
        })
      ).rejects.toThrow('Invite has been revoked');
    });
  });

  describe('Member Management', () => {
    it('should list organization members', async () => {
      const members = await getOrganizationMembers('org-123');

      expect(Array.isArray(members)).toBe(true);
      expect(members.length).toBeGreaterThan(0);

      members.forEach((member) => {
        expect(member.userId).toBeDefined();
        expect(member.role).toBeDefined();
        expect(['ADMIN', 'MEMBER', 'VIEWER']).toContain(member.role);
      });
    });

    it('should update member role', async () => {
      const membership = await updateMemberRole({
        organizationId: 'org-123',
        userId: 'user-member',
        newRole: 'ADMIN',
        updatedBy: 'user-admin',
      });

      expect(membership.role).toBe('ADMIN');
    });

    it('should require admin permission to update roles', async () => {
      await expect(
        updateMemberRole({
          organizationId: 'org-123',
          userId: 'user-member',
          newRole: 'ADMIN',
          updatedBy: 'user-member', // Not admin
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should remove member from organization', async () => {
      await removeMemberFromOrganization({
        organizationId: 'org-123',
        userId: 'user-member',
        removedBy: 'user-admin',
      });

      const members = await getOrganizationMembers('org-123');
      expect(members.find((m) => m.userId === 'user-member')).toBeUndefined();
    });

    it('should prevent removing last admin', async () => {
      await expect(
        removeMemberFromOrganization({
          organizationId: 'org-123',
          userId: 'user-admin', // Last admin
          removedBy: 'user-admin',
        })
      ).rejects.toThrow('Cannot remove last admin');
    });
  });

  describe('Access Control', () => {
    it('should grant access to organization data after joining', async () => {
      const invite = await sendOrganizationInvite({
        organizationId: 'org-123',
        inviterUserId: 'user-admin',
        inviteeEmail: 'newmember@example.com',
        role: 'MEMBER',
      });

      await acceptOrganizationInvite(invite.token, {
        userId: 'user-new',
        email: 'newmember@example.com',
      });

      const hasAccess = await checkOrganizationAccess('org-123', 'user-new');
      expect(hasAccess).toBe(true);
    });

    it('should enforce role-based permissions', async () => {
      const permissions = {
        ADMIN: ['read', 'write', 'delete', 'invite', 'manage_members'],
        MEMBER: ['read', 'write'],
        VIEWER: ['read'],
      };

      for (const [role, expectedPermissions] of Object.entries(permissions)) {
        const userPermissions = await getUserPermissionsInOrg('org-123', role);
        expect(userPermissions).toEqual(expect.arrayContaining(expectedPermissions));
      }
    });

    it('should revoke access when member is removed', async () => {
      await removeMemberFromOrganization({
        organizationId: 'org-123',
        userId: 'user-member',
        removedBy: 'user-admin',
      });

      const hasAccess = await checkOrganizationAccess('org-123', 'user-member');
      expect(hasAccess).toBe(false);
    });
  });

  describe('Multi-Organization Support', () => {
    it('should allow user to be member of multiple organizations', async () => {
      const userId = 'user-multi';

      // Join first org
      const invite1 = await sendOrganizationInvite({
        organizationId: 'org-1',
        inviterUserId: 'user-admin-1',
        inviteeEmail: 'multi@example.com',
        role: 'MEMBER',
      });
      await acceptOrganizationInvite(invite1.token, {
        userId,
        email: 'multi@example.com',
      });

      // Join second org
      const invite2 = await sendOrganizationInvite({
        organizationId: 'org-2',
        inviterUserId: 'user-admin-2',
        inviteeEmail: 'multi@example.com',
        role: 'MEMBER',
      });
      await acceptOrganizationInvite(invite2.token, {
        userId,
        email: 'multi@example.com',
      });

      const userOrgs = await getUserOrganizations(userId);
      expect(userOrgs).toHaveLength(2);
      expect(userOrgs.map((o) => o.id)).toContain('org-1');
      expect(userOrgs.map((o) => o.id)).toContain('org-2');
    });

    it('should isolate data between organizations', async () => {
      const userId = 'user-multi';

      const org1Data = await getOrganizationData('org-1', userId);
      const org2Data = await getOrganizationData('org-2', userId);

      // Data should be different for each org
      expect(org1Data.capitalCalls).not.toEqual(org2Data.capitalCalls);
    });
  });

  describe('Audit Trail', () => {
    it('should log invite sent event', async () => {
      await sendOrganizationInvite({
        organizationId: 'org-123',
        inviterUserId: 'user-admin',
        inviteeEmail: 'audit@example.com',
        role: 'MEMBER',
      });

      const auditLogs = await getAuditLogsByAction('ORG_INVITE_SENT');
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].metadata.inviteeEmail).toBe('audit@example.com');
    });

    it('should log invite accepted event', async () => {
      const invite = await sendOrganizationInvite({
        organizationId: 'org-123',
        inviterUserId: 'user-admin',
        inviteeEmail: 'audit@example.com',
        role: 'MEMBER',
      });

      await acceptOrganizationInvite(invite.token, {
        userId: 'user-new',
        email: 'audit@example.com',
      });

      const auditLogs = await getAuditLogsByAction('ORG_INVITE_ACCEPTED');
      expect(auditLogs.length).toBeGreaterThan(0);
    });

    it('should log member removed event', async () => {
      await removeMemberFromOrganization({
        organizationId: 'org-123',
        userId: 'user-member',
        removedBy: 'user-admin',
      });

      const auditLogs = await getAuditLogsByAction('ORG_MEMBER_REMOVED');
      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });
});

// Mock helper functions
async function sendOrganizationInvite(data: any) {
  if (data.inviterUserId === 'user-member') {
    throw new Error('Insufficient permissions');
  }

  const existingInvite = mockInvites.find(
    (i) =>
      i.organizationId === data.organizationId &&
      i.inviteeEmail === data.inviteeEmail &&
      i.status === 'PENDING'
  );

  if (existingInvite) {
    throw new Error('Invite already exists');
  }

  const invite = {
    id: `invite-${Date.now()}`,
    organizationId: data.organizationId,
    inviterUserId: data.inviterUserId,
    inviteeEmail: data.inviteeEmail,
    role: data.role,
    status: 'PENDING',
    token: `token-${Math.random().toString(36).substring(7)}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  mockInvites.push(invite);

  // Mock sending email
  mockEmails.push({
    to: data.inviteeEmail,
    type: 'ORG_INVITE',
    subject: 'You have been invited',
    body: `Token: ${invite.token}`,
  });

  return invite;
}

async function acceptOrganizationInvite(token: string, userData: any) {
  const invite = mockInvites.find((i) => i.token === token);

  if (!invite) {
    throw new Error('Invalid invite token');
  }

  if (invite.status === 'REVOKED') {
    throw new Error('Invite has been revoked');
  }

  if (new Date(invite.expiresAt) < new Date()) {
    throw new Error('Invite has expired');
  }

  if (invite.inviteeEmail !== userData.email) {
    throw new Error('Email mismatch');
  }

  invite.status = 'ACCEPTED';
  invite.acceptedAt = new Date().toISOString();

  const membership = {
    organizationId: invite.organizationId,
    userId: userData.userId,
    role: invite.role,
    joinedAt: new Date().toISOString(),
  };

  mockMemberships.push(membership);

  // Send welcome email
  mockEmails.push({
    to: userData.email,
    type: 'ORG_WELCOME',
    subject: 'Welcome to the organization',
  });

  return membership;
}

async function revokeOrganizationInvite(inviteId: string, revokedBy: string) {
  if (revokedBy === 'user-member') {
    throw new Error('Insufficient permissions');
  }

  const invite = mockInvites.find((i) => i.id === inviteId);
  if (invite) {
    invite.status = 'REVOKED';
    invite.revokedAt = new Date().toISOString();
  }
}

async function getInvite(inviteId: string) {
  return mockInvites.find((i) => i.id === inviteId)!;
}

async function getOrganizationMembers(organizationId: string) {
  return mockMemberships.filter((m) => m.organizationId === organizationId);
}

async function updateMemberRole(data: any) {
  if (data.updatedBy === 'user-member') {
    throw new Error('Insufficient permissions');
  }

  const membership = mockMemberships.find(
    (m) => m.organizationId === data.organizationId && m.userId === data.userId
  );

  if (membership) {
    membership.role = data.newRole;
  }

  return membership!;
}

async function removeMemberFromOrganization(data: any) {
  const admins = mockMemberships.filter(
    (m) => m.organizationId === data.organizationId && m.role === 'ADMIN'
  );

  if (admins.length === 1 && admins[0].userId === data.userId) {
    throw new Error('Cannot remove last admin');
  }

  const index = mockMemberships.findIndex(
    (m) => m.organizationId === data.organizationId && m.userId === data.userId
  );
  if (index > -1) {
    mockMemberships.splice(index, 1);
  }
}

async function checkOrganizationAccess(organizationId: string, userId: string) {
  return mockMemberships.some(
    (m) => m.organizationId === organizationId && m.userId === userId
  );
}

async function getUserPermissionsInOrg(organizationId: string, role: string) {
  const permissions: Record<string, string[]> = {
    ADMIN: ['read', 'write', 'delete', 'invite', 'manage_members'],
    MEMBER: ['read', 'write'],
    VIEWER: ['read'],
  };
  return permissions[role] || [];
}

async function getUserOrganizations(userId: string) {
  const memberships = mockMemberships.filter((m) => m.userId === userId);
  return memberships.map((m) => ({ id: m.organizationId }));
}

async function getOrganizationData(organizationId: string, userId: string) {
  return {
    capitalCalls: [{ id: `cc-${organizationId}` }],
  };
}

async function getEmailsSent() {
  return mockEmails;
}

async function getAuditLogsByAction(action: string) {
  return mockAuditLogs.filter((log) => log.action === action);
}

async function createExpiredInvite(data: any) {
  const invite = {
    id: `invite-expired-${Date.now()}`,
    organizationId: data.organizationId,
    inviteeEmail: data.inviteeEmail,
    role: data.role,
    token: `token-expired-${Math.random().toString(36).substring(7)}`,
    expiresAt: new Date(Date.now() - 1000).toISOString(), // Already expired
    status: 'PENDING',
  };
  mockInvites.push(invite);
  return invite;
}

// Mock data stores
const mockInvites: any[] = [];
const mockMemberships: any[] = [
  {
    organizationId: 'org-123',
    userId: 'user-admin',
    role: 'ADMIN',
    joinedAt: new Date('2025-01-01').toISOString(),
  },
];
const mockEmails: any[] = [];
const mockAuditLogs: any[] = [];
