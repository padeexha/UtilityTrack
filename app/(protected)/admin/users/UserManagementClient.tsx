'use client';

import { useState } from 'react';
import { updateUserProfile } from './actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

type Profile = {
  id: string;
  full_name: string;
  role: string;
  active: boolean;
  created_at: string;
};

export function UserManagementClient({ initialUsers }: { initialUsers: Profile[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleRoleChange(id: string, newRole: string, currentActive: boolean) {
    setLoadingId(id);
    const { success, error } = await updateUserProfile(id, newRole, currentActive);
    if (success) {
      setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
    } else {
      alert('Failed to update role: ' + error);
    }
    setLoadingId(null);
  }

  async function handleToggleStatus(id: string, currentRole: string, currentActive: boolean) {
    setLoadingId(id);
    const newActive = !currentActive;
    const { success, error } = await updateUserProfile(id, currentRole, newActive);
    if (success) {
      setUsers(users.map(u => u.id === id ? { ...u, active: newActive } : u));
    } else {
      alert('Failed to update status: ' + error);
    }
    setLoadingId(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User & Tenant Management</CardTitle>
        <CardDescription>Manage application access, assign roles, and create tenant accounts.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name / Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name || 'Unnamed User'}</TableCell>
                <TableCell>
                  <select 
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value, user.active)}
                    disabled={loadingId === user.id}
                    className="h-8 rounded border border-input bg-background px-2 text-sm"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="worker">Worker</option>
                    <option value="finance">Finance</option>
                    <option value="tenant">Tenant / Company</option>
                  </select>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.active ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                    {user.active ? 'Active' : 'Disabled'}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant={user.active ? "destructive" : "secondary"} 
                    size="sm"
                    disabled={loadingId === user.id}
                    onClick={() => handleToggleStatus(user.id, user.role, user.active)}
                  >
                    {loadingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (user.active ? 'Disable' : 'Enable')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
