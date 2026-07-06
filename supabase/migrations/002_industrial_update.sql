-- Add supervisor to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor' AFTER 'worker';

-- Drop the restrictive logic from can_access_meter so any worker or supervisor can access any meter
CREATE OR REPLACE FUNCTION public.can_access_meter(p_meter_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT true; -- Unlocked: Any authenticated user can access any meter in an industrial environment
$$;
