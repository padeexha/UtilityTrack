import { createClient } from '@/lib/supabase/server';
import { assignMeter, createBuilding, createMeter, createSite } from './actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremisesTables } from './PremisesTables';

interface SearchParams { success?: string; error?: string; }

export default async function MetersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [sitesResult, buildingsResult, metersResult, profileResult, usersResult] = await Promise.all([
    supabase.from('sites').select('id, name, address').order('name'),
    supabase.from('buildings').select('id, site_id, name, code, tenant_id').order('name'),
    supabase.from('meters').select('id, site_id, building_id, parent_meter_id, name, meter_number, utility_type, unit, multiplication_factor, active, buildings(name), sites(name)').order('name'),
    supabase.from('profiles').select('role').eq('id', user?.id ?? '').maybeSingle(),
    supabase.from('profiles').select('id, full_name, role').eq('active', true).order('full_name'),
  ]);

  const sites = sitesResult.data ?? [];
  const buildings = buildingsResult.data ?? [];
  const meters = metersResult.data ?? [];
  const users = usersResult.data ?? [];
  
  // Also get tenant users
  const tenantUsers = users.filter(u => u.role === 'tenant');
  
  const canManage = ['admin', 'manager'].includes(profileResult.data?.role ?? 'worker');

  const selectClass = "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Premises and meters</h1>
        <p className="text-muted-foreground">Create the hierarchy: premises → main meter → building sub-meters.</p>
      </div>

      {params.success && (
        <div className="p-4 rounded-md bg-green-500/15 border border-green-500/30 text-green-700 dark:text-green-400 font-medium">
          {params.success}
        </div>
      )}
      
      {params.error && (
        <div className="p-4 rounded-md bg-destructive/15 border border-destructive/30 text-destructive font-medium">
          {params.error}
        </div>
      )}

      {canManage && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Add premises/site</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createSite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="site-name">Site name</Label>
                  <Input id="site-name" name="name" required placeholder="e.g. Main Campus" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site-address">Address</Label>
                  <Input id="site-address" name="address" placeholder="123 Main St" />
                </div>
                <Button type="submit" className="w-full">Create site</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Add building</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createBuilding} className="space-y-4">
                <div className="space-y-2">
                  <Label>Site</Label>
                  <select name="site_id" required className={selectClass}>
                    <option value="">Select</option>
                    {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Building name</Label>
                    <Input name="name" required placeholder="e.g. Tower A" />
                  </div>
                  <div className="space-y-2">
                    <Label>Building code</Label>
                    <Input name="code" placeholder="BLD-A" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Assign Tenant (Optional)</Label>
                  <select name="tenant_id" className={selectClass}>
                    <option value="">No tenant (Internal Use)</option>
                    {tenantUsers.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>{tenant.full_name || 'Unnamed Company'}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">This assigns the entire building to a renting company.</p>
                </div>
                <Button type="submit" className="w-full">Create building</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>3. Add main or sub-meter</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createMeter} className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Site</Label>
                <select name="site_id" required className={selectClass}>
                  <option value="">Select</option>
                  {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Building</Label>
                <select name="building_id" className={selectClass}>
                  <option value="">Premises/common area</option>
                  {buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Meter name</Label>
                <Input name="name" placeholder="Building A Electricity" required />
              </div>
              <div className="space-y-2">
                <Label>Meter number</Label>
                <Input name="meter_number" placeholder="SER-12345" required />
              </div>
              <div className="space-y-2">
                <Label>Utility type</Label>
                <select name="utility_type" required className={selectClass}>
                  <option value="electricity">Electricity</option>
                  <option value="water">Water</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Parent/main meter</Label>
                <select name="parent_meter_id" className={selectClass}>
                  <option value="">None — this is a main meter</option>
                  {meters.map((meter) => <option key={meter.id} value={meter.id}>{meter.name} ({meter.meter_number})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Multiplication factor</Label>
                <Input name="multiplication_factor" type="number" step="0.0001" min="0.0001" defaultValue="1" required />
              </div>
              <div className="space-y-2">
                <Label>Initial reading</Label>
                <Input name="initial_reading" type="number" step="0.0001" min="0" defaultValue="0" required />
              </div>
              <div className="md:col-span-2 lg:col-span-4 pt-2">
                <Button type="submit" className="w-full">Create meter</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {canManage && users.length > 0 && meters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assign meter to worker</CardTitle>
            <CardDescription>Unassigned meters are visible to all workers. Once assigned, only assigned workers can submit readings.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={assignMeter} className="grid md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2 md:col-span-1">
                <Label>Meter</Label>
                <select name="meter_id" required className={selectClass}>
                  <option value="">Select meter</option>
                  {meters.map((meter) => <option key={meter.id} value={meter.id}>{meter.name}</option>)}
                </select>
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label>Worker</Label>
                <select name="user_id" required className={selectClass}>
                  <option value="">Select worker</option>
                  {users.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name} — {profile.role}</option>)}
                </select>
              </div>
              <div className="md:col-span-1">
                <Button type="submit" className="w-full">Assign meter</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Render the unified Sites, Buildings, and Meters tables with interactive Edit Modals */}
      <PremisesTables sites={sites} buildings={buildings} meters={meters} tenantUsers={tenantUsers} />

    </div>
  );
}
