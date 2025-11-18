'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RoleSelector } from './role-selector';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreVertical, Trash2, Shield } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Member {
  id: string;
  role: string;
  permissions: string[];
  joinedAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
    createdAt: Date;
  };
}

interface TeamMemberListProps {
  members: Member[];
  organizationId: string;
  currentUserId: string;
  currentUserRole: string;
}

export function TeamMemberList({
  members,
  organizationId,
  currentUserId,
  currentUserRole,
}: TeamMemberListProps) {
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState<string>('');

  const handleRoleChange = async (memberId: string, userId: string, role: string) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      setEditingMember(null);
      window.location.reload();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role. Please try again.');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove member');
      }

      setRemovingMember(null);
      window.location.reload();
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member. Please try again.');
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'default';
      case 'Admin':
        return 'secondary';
      case 'Manager':
        return 'outline';
      case 'Viewer':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <>
      <div className="space-y-4">
        {members.map((member) => {
          const isCurrentUser = member.user.id === currentUserId;
          const isOwner = member.role === 'OWNER';
          const canEdit = currentUserRole === 'OWNER' && !isOwner && !isCurrentUser;
          const canRemove = currentUserRole === 'OWNER' && !isOwner && !isCurrentUser;
          const isEditing = editingMember === member.id;

          return (
            <div
              key={member.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">
                      {member.user.name || member.user.email}
                    </p>
                    {isCurrentUser && (
                      <Badge variant="outline" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {member.user.email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Joined {formatDate(member.joinedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <RoleSelector
                      value={newRole}
                      onValueChange={setNewRole}
                      excludeOwner={true}
                      label=""
                    />
                    <Button
                      size="sm"
                      onClick={() => handleRoleChange(member.id, member.user.id, newRole)}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingMember(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <Badge variant={getRoleBadgeColor(member.role)}>
                      {member.role}
                    </Badge>

                    {(canEdit || canRemove) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingMember(member.id);
                                setNewRole(member.role);
                              }}
                            >
                              Change Role
                            </DropdownMenuItem>
                          )}
                          {canRemove && (
                            <DropdownMenuItem
                              onClick={() => setRemovingMember(member)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removingMember?.user.name || removingMember?.user.email} from
              your organization? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removingMember && handleRemoveMember(removingMember.user.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
