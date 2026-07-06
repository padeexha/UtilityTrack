'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function fail(message: string): never {
  redirect(`/meters?error=${encodeURIComponent(message)}`);
}

export async function createSite(formData: FormData) {
  const supabase = await createClient();
  const name = text(formData, 'name');
  if (!name) fail('Site name is required.');

  const { error } = await supabase.from('sites').insert({ name, address: text(formData, 'address') || null });
  if (error) fail(error.message);
  revalidatePath('/meters');
  redirect('/meters?success=Site created');
}

export async function createBuilding(formData: FormData) {
  const supabase = await createClient();
  const siteId = text(formData, 'site_id');
  const name = text(formData, 'name');
  if (!siteId || !name) fail('Site and building name are required.');

  const { error } = await supabase.from('buildings').insert({
    site_id: siteId,
    name,
    code: text(formData, 'code') || null,
  });
  if (error) fail(error.message);
  revalidatePath('/meters');
  redirect('/meters?success=Building created');
}

export async function createMeter(formData: FormData) {
  const supabase = await createClient();
  const utilityType = text(formData, 'utility_type');
  const unit = utilityType === 'water' ? 'm³' : 'kWh';
  const multiplier = Number(formData.get('multiplication_factor') || 1);
  const initialReading = Number(formData.get('initial_reading') || 0);

  const payload = {
    site_id: text(formData, 'site_id'),
    building_id: text(formData, 'building_id') || null,
    parent_meter_id: text(formData, 'parent_meter_id') || null,
    utility_type: utilityType,
    name: text(formData, 'name'),
    meter_number: text(formData, 'meter_number'),
    unit,
    multiplication_factor: multiplier,
    initial_reading: initialReading,
  };

  if (!payload.site_id || !payload.name || !payload.meter_number || !['electricity', 'water'].includes(utilityType)) {
    fail('Complete all required meter fields.');
  }
  if (!Number.isFinite(multiplier) || multiplier <= 0 || !Number.isFinite(initialReading) || initialReading < 0) {
    fail('Invalid multiplication factor or initial reading.');
  }

  const { error } = await supabase.from('meters').insert(payload);
  if (error) fail(error.message);
  revalidatePath('/meters');
  redirect('/meters?success=Meter created');
}

export async function assignMeter(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const meterId = text(formData, 'meter_id');
  const userId = text(formData, 'user_id');
  if (!meterId || !userId) fail('Choose a meter and worker.');

  const { error } = await supabase.from('meter_assignments').upsert({
    meter_id: meterId,
    user_id: userId,
    assigned_by: user.id,
  }, { onConflict: 'meter_id,user_id' });
  if (error) fail(error.message);
  revalidatePath('/meters');
  redirect('/meters?success=Meter assigned');
}
