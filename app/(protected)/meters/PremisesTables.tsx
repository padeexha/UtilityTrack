'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateSite, deleteSite, updateBuilding, deleteBuilding, updateMeter, deleteMeter } from './actions';
import { Edit2, Trash2 } from 'lucide-react';

export function PremisesTables({ sites, buildings, meters, tenantUsers }: any) {
  const [editingSite, setEditingSite] = useState<any>(null);
  const [editingBuilding, setEditingBuilding] = useState<any>(null);
  const [editingMeter, setEditingMeter] = useState<any>(null);

  const selectClass = "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-8 mt-8">
      {/* Sites & Buildings Table */}
      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Premises & Buildings Register</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage sites and their associated buildings or rented units.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Location / Details</TableHead>
              <TableHead>Assigned Tenant</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.map((site: any) => (
              <TableRow key={`site-${site.id}`} className="bg-muted/10">
                <TableCell><span className="font-semibold text-primary">Site</span></TableCell>
                <TableCell className="font-medium">{site.name}</TableCell>
                <TableCell className="text-muted-foreground">{site.address || '—'}</TableCell>
                <TableCell>—</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setEditingSite(site)}><Edit2 className="w-4 h-4" /></Button>
                  <form action={deleteSite} className="inline" onSubmit={(e) => !confirm('Delete this site and all its buildings?') && e.preventDefault()}>
                    <input type="hidden" name="id" value={site.id} />
                    <Button variant="ghost" size="icon" type="submit" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
            {buildings.map((building: any) => {
              const site = sites.find((s: any) => s.id === building.site_id);
              const tenant = tenantUsers.find((t: any) => t.id === building.tenant_id);
              return (
                <TableRow key={`bld-${building.id}`}>
                  <TableCell className="pl-8"><span className="text-muted-foreground">↳ Building</span></TableCell>
                  <TableCell>{building.name} {building.code && <span className="text-xs text-muted-foreground ml-2">({building.code})</span>}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">Site: {site?.name}</TableCell>
                  <TableCell>
                    {tenant ? <span className="px-2 py-1 bg-amber-500/10 text-amber-600 rounded-md text-xs font-medium">{tenant.full_name}</span> : <span className="text-muted-foreground text-sm">Internal</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditingBuilding(building)}><Edit2 className="w-4 h-4" /></Button>
                    <form action={deleteBuilding} className="inline" onSubmit={(e) => !confirm('Delete this building?') && e.preventDefault()}>
                      <input type="hidden" name="id" value={building.id} />
                      <Button variant="ghost" size="icon" type="submit" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </form>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Meters Table */}
      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Meter Register</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage utility meters and sub-meters.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Meter</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Factor</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meters.map((meter: any) => {
              const parent = meters.find((m: any) => m.id === meter.parent_meter_id);
              const building = meter.buildings;
              const site = meter.sites;
              return (
                <TableRow key={meter.id}>
                  <TableCell>
                    <div className="font-semibold">{meter.name}</div>
                    <div className="text-xs text-muted-foreground">{meter.parent_meter_id ? 'Sub-meter' : 'Main meter'}</div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{meter.meter_number}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary capitalize">{meter.utility_type}</span> 
                  </TableCell>
                  <TableCell>
                    <div>{site?.name}</div>
                    <div className="text-xs text-muted-foreground">{building?.name ?? 'Premises/common area'}</div>
                  </TableCell>
                  <TableCell>{parent?.name ?? '—'}</TableCell>
                  <TableCell>{Number(meter.multiplication_factor)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditingMeter(meter)}><Edit2 className="w-4 h-4" /></Button>
                    <form action={deleteMeter} className="inline" onSubmit={(e) => !confirm('Delete this meter and all its readings? This is irreversible.') && e.preventDefault()}>
                      <input type="hidden" name="id" value={meter.id} />
                      <Button variant="ghost" size="icon" type="submit" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </form>
                  </TableCell>
                </TableRow>
              );
            })}
            {meters.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No meters found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Site Modal */}
      <Modal isOpen={!!editingSite} onClose={() => setEditingSite(null)} title="Edit Site">
        {editingSite && (
          <form action={updateSite} onSubmit={() => setEditingSite(null)} className="space-y-4">
            <input type="hidden" name="id" value={editingSite.id} />
            <div className="space-y-2">
              <Label>Site name</Label>
              <Input name="name" defaultValue={editingSite.name} required />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input name="address" defaultValue={editingSite.address || ''} />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingSite(null)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Building Modal */}
      <Modal isOpen={!!editingBuilding} onClose={() => setEditingBuilding(null)} title="Edit Building">
        {editingBuilding && (
          <form action={updateBuilding} onSubmit={() => setEditingBuilding(null)} className="space-y-4">
            <input type="hidden" name="id" value={editingBuilding.id} />
            <div className="space-y-2">
              <Label>Site</Label>
              <select name="site_id" defaultValue={editingBuilding.site_id} required className={selectClass}>
                {sites.map((site: any) => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Building name</Label>
              <Input name="name" defaultValue={editingBuilding.name} required />
            </div>
            <div className="space-y-2">
              <Label>Building code</Label>
              <Input name="code" defaultValue={editingBuilding.code || ''} />
            </div>
            <div className="space-y-2">
              <Label>Assign Tenant</Label>
              <select name="tenant_id" defaultValue={editingBuilding.tenant_id || ''} className={selectClass}>
                <option value="">No tenant (Internal Use)</option>
                {tenantUsers.map((tenant: any) => <option key={tenant.id} value={tenant.id}>{tenant.full_name}</option>)}
              </select>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingBuilding(null)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Meter Modal */}
      <Modal isOpen={!!editingMeter} onClose={() => setEditingMeter(null)} title="Edit Meter">
        {editingMeter && (
          <form action={updateMeter} onSubmit={() => setEditingMeter(null)} className="space-y-4">
            <input type="hidden" name="id" value={editingMeter.id} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Site</Label>
                <select name="site_id" defaultValue={editingMeter.site_id} required className={selectClass}>
                  {sites.map((site: any) => <option key={site.id} value={site.id}>{site.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Building</Label>
                <select name="building_id" defaultValue={editingMeter.building_id || ''} className={selectClass}>
                  <option value="">Premises/common area</option>
                  {buildings.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Meter name</Label>
                <Input name="name" defaultValue={editingMeter.name} required />
              </div>
              <div className="space-y-2">
                <Label>Meter number</Label>
                <Input name="meter_number" defaultValue={editingMeter.meter_number} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Utility type</Label>
                <select name="utility_type" defaultValue={editingMeter.utility_type} required className={selectClass}>
                  <option value="electricity">Electricity</option>
                  <option value="water">Water</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Parent/main meter</Label>
                <select name="parent_meter_id" defaultValue={editingMeter.parent_meter_id || ''} className={selectClass}>
                  <option value="">None — this is a main meter</option>
                  {meters.map((m: any) => <option key={m.id} value={m.id}>{m.name} ({m.meter_number})</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Multiplication factor</Label>
                <Input name="multiplication_factor" type="number" step="0.0001" min="0.0001" defaultValue={editingMeter.multiplication_factor} required />
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingMeter(null)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
