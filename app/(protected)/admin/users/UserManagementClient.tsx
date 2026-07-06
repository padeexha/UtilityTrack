'use client';

import { useState } from 'react';
import { updateUserProfile, adminCreateUser } from './actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus } from 'lucide-react';

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
  const [isCreating, setIsCreating] = useState(false);
  const [creatingLoading, setCreatingLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

  async function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreatingLoading(true);
    setErrorMsg('');
    const formData = new FormData(e.currentTarget);
    const result = await adminCreateUser(formData);
    
    if (result.error) {
      setErrorMsg(result.error);
    } else {
      setIsCreating(false);
      window.location.reload();
    }
    setCreatingLoading(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>User & Tenant Management</CardTitle>
          <CardDescription>Manage application access, assign roles, and create tenant accounts.</CardDescription>
        </div>
        <Button onClick={() => setIsCreating(true)} className="gap-2">
          <UserPlus className="w-4 h-4" /> Add User
        </Button>
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
                    <option value="supervisor">Supervisor</option>
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

      <Modal isOpen={isCreating} onClose={() => setIsCreating(false)} title="Create New Account">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input name="fullName" required placeholder="John Doe" />
          </div>
          <div className="space-y-2">
            <Label>Username (or Email)</Label>
            <Input name="username" required placeholder="johndoe123" />
            <p className="text-xs text-muted-foreground">If an email is not provided, one will be auto-generated for internal login purposes.</p>
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" name="password" required minLength={8} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <select name="role" required className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
              <option value="worker">Worker</option>
              <option value="supervisor">Supervisor</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
              <option value="tenant">Tenant / Company</option>
            </select>
          </div>
          
          {errorMsg && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border">{errorMsg}</div>}
          
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button type="submit" disabled={creatingLoading}>
              {creatingLoading ? 'Creating...' : 'Create Account'}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
