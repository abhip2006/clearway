import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { InviteMemberDialog } from '@/components/team/invite-member-dialog';
import { TeamMemberList } from '@/components/team/team-member-list';
import { PendingInvitesList } from '@/components/team/pending-invites-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, Shield } from 'lucide-react';

async function getTeamData(userId: string) {
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: {
      members: {
        include: {
          organization: true,
        },
      },
    },
  });

  if (!user || !user.organizationId) {
    return null;
  }

  // Get user's role in the organization
  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: user.organizationId,
        userId: user.id,
      },
    },
  });

  // Only OWNER and Admin can view team management
  if (!membership || !['OWNER', 'Admin'].includes(membership.role)) {
    return null;
  }

  // Get all organization members
  const members = await db.organizationMember.findMany({
    where: { organizationId: user.organizationId },
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

  // Get pending invites
  const invites = await db.organizationInvite.findMany({
    where: {
      organizationId: user.organizationId,
      acceptedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const organization = await db.organization.findUnique({
    where: { id: user.organizationId },
  });

  return {
    organization,
    members,
    invites,
    currentUserId: user.id,
    currentUserRole: membership.role,
  };
}

export default async function TeamManagementPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const teamData = await getTeamData(userId);

  if (!teamData) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to view team management. Only organization owners
              and administrators can access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { organization, members, invites, currentUserId, currentUserRole } = teamData;

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
              Team Management
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your organization's team members and permissions
            </p>
          </div>
          <InviteMemberDialog organizationId={organization!.id} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invites.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organization Plan</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organization!.plan}</div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage roles and permissions for your team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamMemberList
              members={members}
              organizationId={organization!.id}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
            />
          </CardContent>
        </Card>

        {/* Pending Invites */}
        {invites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Invitations that haven't been accepted yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PendingInvitesList
                invites={invites}
                organizationId={organization!.id}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
