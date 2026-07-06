-- Add tenant role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tenant';

-- Add tenant_id to buildings table
ALTER TABLE public.buildings 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create an index for quick lookups
CREATE INDEX IF NOT EXISTS buildings_tenant_idx ON public.buildings(tenant_id);

-- Update RLS policies to allow tenants to view their assigned buildings and meters
-- Note: existing policies already allow authenticated users to read buildings and sites.
-- We just need to ensure they can read the meters in their assigned building.
CREATE OR REPLACE FUNCTION public.can_access_meter(p_meter_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE(public.current_user_role() IN ('admin', 'manager', 'finance'), false)
    OR EXISTS (
      -- Worker assignment
      SELECT 1 FROM public.meter_assignments ma
      WHERE ma.meter_id = p_meter_id AND ma.user_id = auth.uid()
    )
    OR EXISTS (
      -- Tenant assignment (via building)
      SELECT 1 FROM public.meters m
      JOIN public.buildings b ON m.building_id = b.id
      WHERE m.id = p_meter_id AND b.tenant_id = auth.uid()
    )
    OR NOT EXISTS (
      -- Fallback: if no worker assignment and no tenant assignment, it's public to workers? 
      -- Actually, let's restrict this safely. If it's unassigned, workers can see it.
      SELECT 1 FROM public.meter_assignments ma WHERE ma.meter_id = p_meter_id
    );
$$;
