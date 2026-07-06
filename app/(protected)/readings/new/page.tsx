import { createClient } from '@/lib/supabase/server';
import { ReadingCaptureForm, type ReadingMeterOption } from '@/components/ReadingCaptureForm';

export default async function NewReadingPage() {
  const supabase = await createClient();
  const [metersResult, readingsResult] = await Promise.all([
    supabase
      .from('meters')
      .select('id, name, meter_number, utility_type, unit, initial_reading, sites(name), buildings(name)')
      .eq('active', true)
      .order('name'),
    supabase
      .from('meter_readings')
      .select('meter_id, current_reading, captured_at, status')
      .neq('status', 'rejected')
      .order('captured_at', { ascending: false }),
  ]);

  const latest = new Map<string, number>();
  for (const reading of readingsResult.data ?? []) {
    if (!latest.has(reading.meter_id)) latest.set(reading.meter_id, Number(reading.current_reading));
  }

  const meters: ReadingMeterOption[] = (metersResult.data ?? []).map((meter) => {
    const site = meter.sites as unknown as { name: string } | null;
    const building = meter.buildings as unknown as { name: string } | null;
    return {
      id: meter.id,
      name: meter.name,
      meter_number: meter.meter_number,
      utility_type: meter.utility_type,
      unit: meter.unit,
      previous: latest.get(meter.id) ?? Number(meter.initial_reading),
      building: building?.name ?? 'Premises/common area',
      site: site?.name ?? 'Unknown site',
    };
  });

  return (
    <>
      <div className="page-header">
        <div><h1>Take meter reading</h1><p className="muted">Select the meter, enter the display value, and take a live photograph from the phone.</p></div>
      </div>
      <ReadingCaptureForm meters={meters} />
    </>
  );
}
