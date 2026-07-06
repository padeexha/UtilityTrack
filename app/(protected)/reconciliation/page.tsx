import { createClient } from '@/lib/supabase/server';

interface SearchParams { from?: string; to?: string; }
interface ReconciliationRow {
  parent_meter_id: string;
  parent_name: string;
  utility_type: string;
  parent_consumption: number;
  child_consumption: number;
  variance: number;
  variance_percent: number;
}

function dateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function ReconciliationPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = params.from ?? dateInput(first);
  const to = params.to ?? dateInput(now);
  const endExclusive = new Date(`${to}T00:00:00`);
  endExclusive.setDate(endExclusive.getDate() + 1);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('meter_reconciliation', {
    p_period_start: new Date(`${from}T00:00:00`).toISOString(),
    p_period_end: endExclusive.toISOString(),
  });

  const rows = (data ?? []) as ReconciliationRow[];

  return (
    <>
      <div className="page-header">
        <div><h1>Main and sub-meter reconciliation</h1><p className="muted">Compare premises consumption against the total of its building sub-meters.</p></div>
      </div>

      <form method="get" className="card form-grid" style={{ marginBottom: 16 }}>
        <div className="form-group"><label htmlFor="from">From</label><input id="from" name="from" type="date" defaultValue={from} /></div>
        <div className="form-group"><label htmlFor="to">To</label><input id="to" name="to" type="date" defaultValue={to} /></div>
        <div className="form-group full"><button className="button" type="submit">Calculate reconciliation</button></div>
      </form>

      {error && <div className="error" style={{ marginBottom: 16 }}>{error.message}</div>}

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Main meter</th><th>Utility</th><th>Main consumption</th><th>Sub-meter total</th><th>Unallocated/loss</th><th>Variance</th></tr></thead>
            <tbody>
              {rows.map((row) => {
                const variance = Number(row.variance);
                const percent = Number(row.variance_percent);
                return (
                  <tr key={row.parent_meter_id}>
                    <td><strong>{row.parent_name}</strong></td>
                    <td><span className={`badge ${row.utility_type}`}>{row.utility_type}</span></td>
                    <td>{Number(row.parent_consumption).toLocaleString()}</td>
                    <td>{Number(row.child_consumption).toLocaleString()}</td>
                    <td className={Math.abs(percent) > 10 ? 'metric-positive' : 'metric-good'}>{variance.toLocaleString()}</td>
                    <td className={Math.abs(percent) > 10 ? 'metric-positive' : 'metric-good'}>{percent.toLocaleString()}%</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={6} className="muted">No approved parent and sub-meter readings are available for this period.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="muted small" style={{ marginBottom: 0 }}>A positive variance is consumption on the main meter not represented by sub-meters. It may be common-area usage, losses, leakage, missing readings, or timing differences.</p>
      </section>
    </>
  );
}
