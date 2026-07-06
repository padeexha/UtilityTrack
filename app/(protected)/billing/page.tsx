import { createClient } from '@/lib/supabase/server';
import { createBill, createFlatTariff } from './actions';

interface SearchParams { success?: string; error?: string; }

export default async function BillingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [profileResult, tariffsResult, readingsResult, billsResult] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user?.id ?? '').maybeSingle(),
    supabase.from('tariff_plans').select('id, name, utility_type, effective_from, fixed_charge, tax_percent, currency, tariff_slabs(lower_bound, upper_bound, rate_per_unit)').eq('active', true).order('name'),
    supabase.from('meter_readings').select('id, consumption, captured_at, meters(name, utility_type, unit)').eq('status', 'approved').order('captured_at', { ascending: false }),
    supabase.from('utility_bills').select('id, bill_number, consumption, usage_charge, fixed_charge, tax_amount, total_amount, currency, status, billing_date, due_date, meter_readings(captured_at, meters(name, utility_type, unit)), tariff_plans(name)').order('created_at', { ascending: false }),
  ]);

  const role = profileResult.data?.role ?? 'worker';
  const canBill = ['admin', 'manager', 'finance'].includes(role);
  const canManageTariffs = ['admin', 'manager'].includes(role);
  const tariffs = tariffsResult.data ?? [];
  const bills = billsResult.data ?? [];
  const billedReadingIds = new Set(bills.map((bill) => {
    const nested = bill.meter_readings as unknown as { id?: string } | null;
    return nested?.id;
  }).filter(Boolean));
  // The nested bill query does not expose reading id in all PostgREST versions; utility_bills.reading_id is fetched below when needed.
  const { data: billReadingRows } = await supabase.from('utility_bills').select('reading_id');
  const exactBilledIds = new Set((billReadingRows ?? []).map((row) => row.reading_id));
  const approvedReadings = (readingsResult.data ?? []).filter((reading) => !exactBilledIds.has(reading.id) && !billedReadingIds.has(reading.id));

  return (
    <>
      <div className="page-header">
        <div><h1>Utility billing</h1><p className="muted">Configure rates and calculate bills from approved meter consumption.</p></div>
      </div>
      {params.success && <div className="success" style={{ marginBottom: 16 }}>{params.success}</div>}
      {params.error && <div className="error" style={{ marginBottom: 16 }}>{params.error}</div>}

      {canManageTariffs && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h2>Create flat-rate tariff</h2>
          <p className="muted">This screen creates one unlimited slab. The database also supports multiple slab rates.</p>
          <form action={createFlatTariff} className="form-grid">
            <div className="form-group"><label>Tariff name</label><input name="name" placeholder="Commercial Electricity 2026" required /></div>
            <div className="form-group"><label>Utility</label><select name="utility_type"><option value="electricity">Electricity</option><option value="water">Water</option></select></div>
            <div className="form-group"><label>Effective from</label><input name="effective_from" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
            <div className="form-group"><label>Rate per unit</label><input name="rate_per_unit" type="number" min="0" step="0.0001" required /></div>
            <div className="form-group"><label>Fixed charge</label><input name="fixed_charge" type="number" min="0" step="0.01" defaultValue="0" /></div>
            <div className="form-group"><label>Tax %</label><input name="tax_percent" type="number" min="0" step="0.0001" defaultValue="0" /></div>
            <div className="form-group"><label>Currency</label><input name="currency" defaultValue="LKR" /></div>
            <div className="form-group"><button className="button" type="submit">Create tariff</button></div>
          </form>
        </section>
      )}

      {canBill && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h2>Calculate bill from approved reading</h2>
          <form action={createBill} className="form-grid">
            <div className="form-group">
              <label>Approved reading</label>
              <select name="reading_id" required>
                <option value="">Select</option>
                {approvedReadings.map((reading) => {
                  const meter = reading.meters as unknown as { name: string; utility_type: string; unit: string } | null;
                  return <option key={reading.id} value={reading.id}>{meter?.name} — {Number(reading.consumption).toLocaleString()} {meter?.unit} — {new Date(reading.captured_at).toLocaleDateString()}</option>;
                })}
              </select>
            </div>
            <div className="form-group">
              <label>Tariff</label>
              <select name="tariff_id" required><option value="">Select</option>{tariffs.map((tariff) => <option key={tariff.id} value={tariff.id}>{tariff.name} — {tariff.utility_type}</option>)}</select>
            </div>
            <div className="form-group full"><button className="button" type="submit">Calculate and create bill</button></div>
          </form>
        </section>
      )}

      <section className="grid two-col" style={{ marginBottom: 16 }}>
        {tariffs.map((tariff) => {
          const slabs = tariff.tariff_slabs as unknown as Array<{ lower_bound: number; upper_bound: number | null; rate_per_unit: number }>;
          return (
            <div className="card" key={tariff.id}>
              <h3>{tariff.name}</h3>
              <p><span className={`badge ${tariff.utility_type}`}>{tariff.utility_type}</span></p>
              {slabs.map((slab, index) => <div key={index}><strong>{tariff.currency} {Number(slab.rate_per_unit).toLocaleString()}</strong> per unit {slab.upper_bound ? `up to ${slab.upper_bound}` : ''}</div>)}
              <p className="muted small">Fixed: {tariff.currency} {Number(tariff.fixed_charge).toLocaleString()} · Tax: {Number(tariff.tax_percent)}% · From {tariff.effective_from}</p>
            </div>
          );
        })}
        {tariffs.length === 0 && <div className="notice">No tariffs have been created.</div>}
      </section>

      <section className="card">
        <h2>Generated bills</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Bill</th><th>Meter</th><th>Tariff</th><th>Consumption</th><th>Charges</th><th>Total</th><th>Status/due</th></tr></thead>
            <tbody>
              {bills.map((bill) => {
                const reading = bill.meter_readings as unknown as { captured_at: string; meters: { name: string; utility_type: string; unit: string } | null } | null;
                const tariff = bill.tariff_plans as unknown as { name: string } | null;
                return (
                  <tr key={bill.id}>
                    <td><strong>{bill.bill_number}</strong><br /><span className="muted small">{bill.billing_date}</span></td>
                    <td>{reading?.meters?.name}</td>
                    <td>{tariff?.name}</td>
                    <td>{Number(bill.consumption).toLocaleString()} {reading?.meters?.unit}</td>
                    <td>Usage {bill.currency} {Number(bill.usage_charge).toLocaleString()}<br /><span className="muted small">Fixed {Number(bill.fixed_charge).toLocaleString()} · Tax {Number(bill.tax_amount).toLocaleString()}</span></td>
                    <td><strong>{bill.currency} {Number(bill.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
                    <td><span className="badge">{bill.status}</span><br /><span className="muted small">Due {bill.due_date}</span></td>
                  </tr>
                );
              })}
              {bills.length === 0 && <tr><td colSpan={7} className="muted">No bills generated yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
