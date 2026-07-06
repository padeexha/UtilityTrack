'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function updateUserProfile(id: string, role: string, active: boolean) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('profiles')
    .update({ role, active })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/users');
  return { success: true };
}

export async function adminCreateUser(formData: FormData) {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return { error: 'Unauthorized' };
  
  const { data: profile } = await supabaseAuth.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'manager') return { error: 'Forbidden' };
  
  const fullName = String(formData.get('fullName') || '');
  const username = String(formData.get('username') || '');
  const password = String(formData.get('password') || '');
  const role = String(formData.get('role') || 'worker');

  if (!username || !password) return { error: 'Username and password are required' };

  const email = username.includes('@') ? username : `${username.toLowerCase()}@worker.local`;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Server misconfiguration: Service Role Key is missing.' };
  }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  if (authError) return { error: authError.message };

  if (authData.user && role !== 'worker') {
    // Wait briefly for the DB trigger to fire and create the profile
    await new Promise(r => setTimeout(r, 1000));
    await supabaseAdmin.from('profiles').update({ role }).eq('id', authData.user.id);
  }

  revalidatePath('/admin/users');
  return { success: true };
}
