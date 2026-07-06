'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

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
