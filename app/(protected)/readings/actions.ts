'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function fail(message: string): never {
  redirect(`/readings?error=${encodeURIComponent(message)}`);
}

export async function approveReading(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const readingId = String(formData.get('reading_id') ?? '');

  const { error } = await supabase.from('meter_readings').update({
    status: 'approved',
    approved_by: user.id,
    approved_at: new Date().toISOString(),
    rejection_reason: null,
  }).eq('id', readingId);

  if (error) fail(error.message);
  revalidatePath('/readings');
  revalidatePath('/dashboard');
  revalidatePath('/reconciliation');
  redirect('/readings?success=Reading approved');
}

export async function rejectReading(formData: FormData) {
  const supabase = await createClient();
  const readingId = String(formData.get('reading_id') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (!reason) fail('A rejection reason is required.');

  const { error } = await supabase.from('meter_readings').update({
    status: 'rejected',
    rejection_reason: reason,
  }).eq('id', readingId);

  if (error) fail(error.message);
  revalidatePath('/readings');
  revalidatePath('/dashboard');
  redirect('/readings?success=Reading rejected');
}
