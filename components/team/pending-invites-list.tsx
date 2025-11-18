'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Clock, X } from 'lucide-react';

interface Invite {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

interface PendingInvitesListProps {
  invites: Invite[];
  organizationId: string;
}

export function PendingInvitesList({ invites, organizationId }: PendingInvitesListProps) {
  const [cancellingInvite, setCancellingInvite] = useState<string | null>(null);

  const handleCancelInvite = async (inviteId: string) => {
    setCancellingInvite(inviteId);

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/invites/${inviteId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to cancel invitation');
      }

      window.location.reload();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      alert('Failed to cancel invitation. Please try again.');
    } finally {
      setCancellingInvite(null);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/invites/${inviteId}/resend`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to resend invitation');
      }

      alert('Invitation resent successfully!');
    } catch (error) {
      console.error('Error resending invitation:', error);
      alert('Failed to resend invitation. Please try again.');
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getDaysUntilExpiry = (expiresAt: Date) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-4">
      {invites.map((invite) => {
        const daysUntilExpiry = getDaysUntilExpiry(invite.expiresAt);
        const isExpiringSoon = daysUntilExpiry <= 2;

        return (
          <div
            key={invite.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
          >
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-blue-500/10 rounded-full">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{invite.email}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline">{invite.role}</Badge>
                  <span className="text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Sent {formatDate(invite.createdAt)}
                  </span>
                </div>
                <p
                  className={`text-xs mt-1 ${
                    isExpiringSoon ? 'text-orange-600' : 'text-muted-foreground'
                  }`}
                >
                  {isExpiringSoon ? '⚠️ ' : ''}
                  Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleResendInvite(invite.id)}
                disabled={cancellingInvite === invite.id}
              >
                Resend
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCancelInvite(invite.id)}
                disabled={cancellingInvite === invite.id}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
