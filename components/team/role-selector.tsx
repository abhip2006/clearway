'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export type Role = 'OWNER' | 'Admin' | 'Manager' | 'Viewer';

interface RoleSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  excludeOwner?: boolean;
  label?: string;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  OWNER: 'Full access including billing and organization settings',
  Admin: 'Full access to all features except billing',
  Manager: 'Can manage capital calls and view reports',
  Viewer: 'Read-only access to capital calls and reports',
};

export function RoleSelector({
  value,
  onValueChange,
  disabled = false,
  excludeOwner = true,
  label = 'Role',
}: RoleSelectorProps) {
  const roles = excludeOwner
    ? ['Admin', 'Manager', 'Viewer']
    : ['OWNER', 'Admin', 'Manager', 'Viewer'];

  return (
    <div className="space-y-2">
      <Label htmlFor="role">{label}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id="role">
          <SelectValue placeholder="Select a role" />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role} value={role}>
              <div className="flex flex-col">
                <span className="font-medium">{role}</span>
                <span className="text-xs text-muted-foreground">
                  {ROLE_DESCRIPTIONS[role]}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
