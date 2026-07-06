import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UserManagementClient } from './UserManagementClient';

export default async function AdminUsersPage() {
  const supabase = await createClient();
  
  // Verify admin access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch all users
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, active, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return <div className="text-destructive">Failed to load users: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Manage user accounts and system access levels.</p>
      </div>
      <UserManagementClient initialUsers={users || []} />
    </div>
  );
}
