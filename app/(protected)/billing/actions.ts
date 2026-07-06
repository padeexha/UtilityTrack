'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function fail(message: string): never {
  redirect(`/billing?error=${encodeURIComponent(message)}`);
}

export async function createFlatTariff(formData: FormData) {
  const supabase = await createClient();
  const rate = Number(formData.get('rate_per_unit'));
  const fixedCharge = Number(formData.get('fixed_charge') || 0);
  const taxPercent = Number(formData.get('tax_percent') || 0);
  const utilityType = text(formData, 'utility_type');

  if (!text(formData, 'name') || !['electricity', 'water'].includes(utilityType)) fail('Tariff name and utility are required.');
  if (![rate, fixedCharge, taxPercent].every(Number.isFinite) || rate < 0 || fixedCharge < 0 || taxPercent < 0) fail('Tariff values must be valid positive numbers.');

  const { data: plan, error: planError } = await supabase.from('tariff_plans').insert({
    name: text(formData, 'name'),
    utility_type: utilityType,
    effective_from: text(formData, 'effective_from'),
    fixed_charge: fixedCharge,
    tax_percent: taxPercent,
    currency: text(formData, 'currency') || 'LKR',
  }).select('id').single();

  if (planError || !plan) fail(planError?.message ?? 'Unable to create tariff.');

  const { error: slabError } = await supabase.from('tariff_slabs').insert({
    tariff_plan_id: plan.id,
    lower_bound: 0,
    upper_bound: null,
    rate_per_unit: rate,
  });

  if (slabError) {
    await supabase.from('tariff_plans').delete().eq('id', plan.id);
    fail(slabError.message);
  }

  revalidatePath('/billing');
  redirect('/billing?success=Tariff created');
}

export async function createBill(formData: FormData) {
  const supabase = await createClient();
  const readingId = text(formData, 'reading_id');
  const tariffId = text(formData, 'tariff_id');
  if (!readingId || !tariffId) fail('Choose an approved reading and tariff.');

  const { error } = await supabase.rpc('create_bill_for_reading', {
    p_reading_id: readingId,
    p_tariff_id: tariffId,
  });
  if (error) fail(error.message);

  revalidatePath('/billing');
  redirect('/billing?success=Utility bill calculated');
}
