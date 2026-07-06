import { createClient } from '@/lib/supabase/server';
import { approveReading, rejectReading } from './actions';

interface SearchParams { success?: string; error?: string; }

interface ReadingRow {
  id: string;
  previous_reading: number;
  current_reading: number;
  consumption: number;
  status: string;
  photo_path: string;
  notes: string | null;
  captured_at: string;
  rejection_reason: string | null;
  meters: { name: string; meter_number: string; utility_type: string; unit: string; sites: { name: string } | null; buildings: { name: string } | null } | null;
  reader: { full_name: string } | null;
  approver: { full_name: string } | null;
}

export default async function ReadingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [readingsResult, profileResult] = await Promise.all([
    supabase
      .from('meter_readings')
      .select(`
        id, previous_reading, current_reading, consumption, status, photo_path, notes,
        captured_at, rejection_reason,
        meters(name, meter_number, utility_type, unit, sites(name), buildings(name)),
        reader:profiles!meter_readings_read_by_fkey(full_name),
        approver:profiles!meter_readings_approved_by_fkey(full_name)
      `)
      .order('captured_at', { ascending: false })
      .limit(100),
    supabase.from('profiles').select('role').eq('id', user?.id ?? '').maybeSingle(),
  ]);

  const readings = (readingsResult.data ?? []) as unknown as ReadingRow[];
  const canApprove = ['admin', 'manager'].includes(profileResult.data?.role ?? 'worker');

  const photoUrls = new Map<string, string>();
  await Promise.all(readings.map(async (reading) => {
    const { data } = await supabase.storage.from('meter-photos').createSignedUrl(reading.photo_path, 900);
    if (data?.signedUrl) photoUrls.set(reading.id, data.signedUrl);
  }));

  return (
    <>
      <div className="page-header">
        <div><h1>Reading history</h1><p className="muted">Photo evidence, worker identity, location, consumption and approval status.</p></div>
      </div>
      {params.success && <div className="success" style={{ marginBottom: 16 }}>{params.success}</div>}
      {params.error && <div className="error" style={{ marginBottom: 16 }}>{params.error}</div>}

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Photo</th><th>Meter/location</th><th>Reading</th><th>Consumption</th><th>Worker/time</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {readings.map((reading) => {
                const site = reading.meters?.sites;
                const building = reading.meters?.buildings;
                const photoUrl = photoUrls.get(reading.id);
                return (
                  <tr key={reading.id}>
                    <td>{photoUrl ? <a href={photoUrl} target="_blank" rel="noreferrer"><img className="reading-photo" src={photoUrl} alt="Meter evidence" /></a> : <span className="muted">Restricted</span>}</td>
                    <td><strong>{reading.meters?.name}</strong><br /><span className="muted small">{site?.name} / {building?.name ?? 'Common area'}<br />{reading.meters?.meter_number}</span></td>
                    <td>{Number(reading.previous_reading).toLocaleString()} → <strong>{Number(reading.current_reading).toLocaleString()}</strong></td>
                    <td><strong>{Number(reading.consumption).toLocaleString()}</strong> {reading.meters?.unit}</td>
                    <td>{reading.reader?.full_name ?? 'Unknown'}<br /><span className="muted small">{new Date(reading.captured_at).toLocaleString()}</span></td>
                    <td><span className={`badge ${reading.status}`}>{reading.status}</span>{reading.rejection_reason && <div className="small" style={{ marginTop: 5 }}>{reading.rejection_reason}</div>}</td>
                    <td>
                      {canApprove && reading.status === 'submitted' ? (
                        <div className="actions">
                          <form action={approveReading}><input type="hidden" name="reading_id" value={reading.id} /><button className="button small-button" type="submit">Approve</button></form>
                          <form action={rejectReading} className="actions"><input type="hidden" name="reading_id" value={reading.id} /><input name="reason" aria-label="Rejection reason" placeholder="Reason" required style={{ width: 130, padding: 7 }} /><button className="button danger small-button" type="submit">Reject</button></form>
                        </div>
                      ) : <span className="muted small">{reading.approver?.full_name ? `Approved by ${reading.approver.full_name}` : '—'}</span>}
                    </td>
                  </tr>
                );
              })}
              {readings.length === 0 && <tr><td colSpan={7} className="muted">No readings have been submitted.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
