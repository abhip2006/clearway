'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X } from 'lucide-react';

interface Permission {
  name: string;
  description: string;
}

interface RolePermissions {
  [key: string]: Permission[];
}

const ROLE_PERMISSIONS: RolePermissions = {
  OWNER: [
    { name: 'All Permissions', description: 'Full access to everything' },
    { name: 'Billing Management', description: 'Manage subscription and billing' },
    { name: 'Organization Settings', description: 'Configure organization settings' },
  ],
  Admin: [
    { name: 'Capital Calls', description: 'Full access to capital calls' },
    { name: 'User Management', description: 'Add, remove, and manage users' },
    { name: 'Settings', description: 'Modify organization settings' },
    { name: 'Reports', description: 'View and export all reports' },
    { name: 'Documents', description: 'Upload, review, and manage documents' },
  ],
  Manager: [
    { name: 'Capital Calls', description: 'Read, create, approve, and reject' },
    { name: 'Reports', description: 'View reports' },
    { name: 'Documents', description: 'Upload and review documents' },
  ],
  Viewer: [
    { name: 'Capital Calls', description: 'Read-only access' },
    { name: 'Reports', description: 'View reports' },
    { name: 'Documents', description: 'View documents' },
  ],
};

interface PermissionDisplayProps {
  role: string;
  compact?: boolean;
}

export function PermissionDisplay({ role, compact = false }: PermissionDisplayProps) {
  const permissions = ROLE_PERMISSIONS[role] || [];

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {permissions.map((permission, index) => (
          <Badge key={index} variant="secondary" className="text-xs">
            {permission.name}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {role} Permissions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {permissions.map((permission, index) => (
            <div key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">{permission.name}</p>
                <p className="text-xs text-muted-foreground">
                  {permission.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface PermissionComparisonProps {
  currentRole: string;
  newRole: string;
}

export function PermissionComparison({ currentRole, newRole }: PermissionComparisonProps) {
  const currentPermissions = ROLE_PERMISSIONS[currentRole] || [];
  const newPermissions = ROLE_PERMISSIONS[newRole] || [];

  const currentPermNames = new Set(currentPermissions.map(p => p.name));
  const newPermNames = new Set(newPermissions.map(p => p.name));

  const gained = newPermissions.filter(p => !currentPermNames.has(p.name));
  const lost = currentPermissions.filter(p => !newPermNames.has(p.name));

  return (
    <div className="space-y-4">
      {gained.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 text-green-600">
            Permissions Gained
          </h4>
          <div className="space-y-2">
            {gained.map((permission, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                <span>{permission.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {lost.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 text-red-600">
            Permissions Lost
          </h4>
          <div className="space-y-2">
            {lost.map((permission, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <X className="h-4 w-4 text-red-600 mt-0.5" />
                <span>{permission.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {gained.length === 0 && lost.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No permission changes
        </p>
      )}
    </div>
  );
}
