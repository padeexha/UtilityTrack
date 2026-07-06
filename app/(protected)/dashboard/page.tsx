import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RecentReading {
  id: string;
  current_reading: number;
  consumption: number;
  status: string;
  captured_at: string;
  meters: { name: string; utility_type: string; unit: string } | null;
  profiles: { full_name: string } | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [metersResult, readingsResult, pendingResult] = await Promise.all([
    supabase.from('meters').select('id, utility_type').eq('active', true),
    supabase
      .from('meter_readings')
      .select('id, meter_id, current_reading, consumption, status, captured_at, meters(name, utility_type, unit), profiles!meter_readings_read_by_fkey(full_name)')
      .gte('captured_at', monthStart.toISOString())
      .order('captured_at', { ascending: false }),
    supabase.from('meter_readings').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
  ]);

  const meters = metersResult.data ?? [];
  const readings = (readingsResult.data ?? []) as unknown as RecentReading[];
  const readMeterIds = new Set((readingsResult.data ?? []).map((reading) => reading.meter_id));
  const missingThisMonth = meters.filter((meter) => !readMeterIds.has(meter.id)).length;

  const electricity = readings
    .filter((reading) => reading.meters?.utility_type === 'electricity' && reading.status !== 'rejected')
    .reduce((sum, reading) => sum + Number(reading.consumption), 0);
  const water = readings
    .filter((reading) => reading.meters?.utility_type === 'water' && reading.status !== 'rejected')
    .reduce((sum, reading) => sum + Number(reading.consumption), 0);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Central Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Overview of meter readings, consumption, and system status.
          </p>
        </div>
        <Link href="/readings/new">
          <Button className="font-semibold shadow-sm">
            Take a meter reading
          </Button>
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-border/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Meters</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meters.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered across premises</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-border/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingResult.count ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting manager/supervisor review</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing This Month</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{missingThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">Unread meters remaining</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Readings</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><polyline points="20 6 9 17 4 12"/></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readings.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Submitted this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2">
        <Card className="shadow-sm border-border/50 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition-all duration-500"></div>
          <CardHeader>
            <CardTitle>Electricity This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{electricity.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-lg text-muted-foreground font-normal">kWh</span></div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border/50 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
          <CardHeader>
            <CardTitle>Water This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{water.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-lg text-muted-foreground font-normal">m³</span></div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border/50 hover:shadow-md transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Latest Readings</CardTitle>
            <CardDescription>Newest submissions across all premises.</CardDescription>
          </div>
          <Link href="/readings">
            <Button variant="outline" size="sm">View all</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meter</TableHead>
                <TableHead>Utility</TableHead>
                <TableHead>Reading</TableHead>
                <TableHead>Consumption</TableHead>
                <TableHead>Recorded by</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readings.slice(0, 10).map((reading) => (
                <TableRow key={reading.id} className="hover:bg-muted/40 transition-colors cursor-pointer group">
                  <TableCell className="font-medium group-hover:text-primary transition-colors">{reading.meters?.name ?? 'Unknown meter'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${reading.meters?.utility_type === 'electricity' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                      {reading.meters?.utility_type}
                    </span>
                  </TableCell>
                  <TableCell>{Number(reading.current_reading).toLocaleString()}</TableCell>
                  <TableCell>{Number(reading.consumption).toLocaleString()} {reading.meters?.unit}</TableCell>
                  <TableCell>{reading.profiles?.full_name ?? 'Unknown'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(reading.captured_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      reading.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500' : 
                      reading.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500' : 
                      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-500'
                    }`}>
                      {reading.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {readings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                    No readings have been submitted this month.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
