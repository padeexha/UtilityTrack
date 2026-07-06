import { createClient } from '@/lib/supabase/server';
import { assignMeter, createBuilding, createMeter, createSite } from './actions';

interface SearchParams { success?: string; error?: string; }

export default async function MetersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [sitesResult, buildingsResult, metersResult, profileResult, usersResult] = await Promise.all([
    supabase.from('sites').select('id, name, address').order('name'),
    supabase.from('buildings').select('id, site_id, name, code').order('name'),
    supabase.from('meters').select('id, site_id, building_id, parent_meter_id, name, meter_number, utility_type, unit, multiplication_factor, active, buildings(name), sites(name)').order('name'),
    supabase.from('profiles').select('role').eq('id', user?.id ?? '').maybeSingle(),
    supabase.from('profiles').select('id, full_name, role').eq('active', true).order('full_name'),
  ]);

  const sites = sitesResult.data ?? [];
  const buildings = buildingsResult.data ?? [];
  const meters = metersResult.data ?? [];
  const users = usersResult.data ?? [];
  const canManage = ['admin', 'manager'].includes(profileResult.data?.role ?? 'worker');

  return (
    <>
      <div className="page-header">
        <div><h1>Premises and meters</h1><p className="muted">Create the hierarchy: premises → main meter → building sub-meters.</p></div>
      </div>

      {params.success && <div className="success" style={{ marginBottom: 16 }}>{params.success}</div>}
      {params.error && <div className="error" style={{ marginBottom: 16 }}>{params.error}</div>}

      {canManage && (
        <section className="grid two-col">
          <form action={createSite} className="card">
            <h2>1. Add premises/site</h2>
            <div className="form-grid">
              <div className="form-group"><label htmlFor="site-name">Site name</label><input id="site-name" name="name" required /></div>
              <div className="form-group"><label htmlFor="site-address">Address</label><input id="site-address" name="address" /></div>
              <div className="form-group full"><button className="button" type="submit">Create site</button></div>
            </div>
          </form>

          <form action={createBuilding} className="card">
            <h2>2. Add building</h2>
            <div className="form-grid">
              <div className="form-group"><label>Site</label><select name="site_id" required><option value="">Select</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></div>
              <div className="form-group"><label>Building name</label><input name="name" required /></div>
              <div className="form-group"><label>Building code</label><input name="code" placeholder="BLD-A" /></div>
              <div className="form-group"><button className="button" type="submit">Create building</button></div>
            </div>
          </form>
        </section>
      )}

      {canManage && (
        <section className="card" style={{ marginTop: 16 }}>
          <h2>3. Add main or sub-meter</h2>
          <form action={createMeter} className="form-grid">
            <div className="form-group"><label>Site</label><select name="site_id" required><option value="">Select</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></div>
            <div className="form-group"><label>Building</label><select name="building_id"><option value="">Premises/common area</option>{buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></div>
            <div className="form-group"><label>Meter name</label><input name="name" placeholder="Building A Electricity Meter" required /></div>
            <div className="form-group"><label>Meter number</label><input name="meter_number" required /></div>
            <div className="form-group"><label>Utility</label><select name="utility_type" required><option value="electricity">Electricity</option><option value="water">Water</option></select></div>
            <div className="form-group"><label>Parent/main meter</label><select name="parent_meter_id"><option value="">None — this is a main meter</option>{meters.map((meter) => <option key={meter.id} value={meter.id}>{meter.name} ({meter.meter_number})</option>)}</select></div>
            <div className="form-group"><label>Multiplication factor</label><input name="multiplication_factor" type="number" step="0.0001" min="0.0001" defaultValue="1" required /></div>
            <div className="form-group"><label>Initial reading</label><input name="initial_reading" type="number" step="0.0001" min="0" defaultValue="0" required /></div>
            <div className="form-group full"><button className="button" type="submit">Create meter</button></div>
          </form>
        </section>
      )}

      {canManage && users.length > 0 && meters.length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Assign a meter to a worker</h2>
          <p className="muted">Unassigned meters are visible to all workers. Once assigned, only assigned workers and management can submit readings.</p>
          <form action={assignMeter} className="form-grid">
            <div className="form-group"><label>Meter</label><select name="meter_id" required><option value="">Select</option>{meters.map((meter) => <option key={meter.id} value={meter.id}>{meter.name}</option>)}</select></div>
            <div className="form-group"><label>Worker</label><select name="user_id" required><option value="">Select</option>{users.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name} — {profile.role}</option>)}</select></div>
            <div className="form-group full"><button className="button" type="submit">Assign meter</button></div>
          </form>
        </section>
      )}

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Meter register</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Meter</th><th>Number</th><th>Type</th><th>Site/building</th><th>Parent meter</th><th>Factor</th></tr></thead>
            <tbody>
              {meters.map((meter) => {
                const parent = meters.find((candidate) => candidate.id === meter.parent_meter_id);
                const building = meter.buildings as unknown as { name: string } | null;
                const site = meter.sites as unknown as { name: string } | null;
                return (
                  <tr key={meter.id}>
                    <td><strong>{meter.name}</strong><br /><span className="muted small">{meter.parent_meter_id ? 'Sub-meter' : 'Main meter'}</span></td>
                    <td>{meter.meter_number}</td>
                    <td><span className={`badge ${meter.utility_type}`}>{meter.utility_type}</span> {meter.unit}</td>
                    <td>{site?.name}<br /><span className="muted small">{building?.name ?? 'Premises/common area'}</span></td>
                    <td>{parent?.name ?? '—'}</td>
                    <td>{Number(meter.multiplication_factor)}</td>
                  </tr>
                );
              })}
              {meters.length === 0 && <tr><td colSpan={6} className="muted">No meters yet. An administrator can create the site, buildings and meters above.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
