-- This script safely deletes all application data without touching your table structure, roles, or policies.

-- 1. Clear all application records (Sites, Buildings, Meters, Readings, etc.)
TRUNCATE TABLE 
  public.audit_events, 
  public.maintenance_issues, 
  public.utility_bills, 
  public.meter_readings, 
  public.meter_assignments, 
  public.tariff_slabs, 
  public.tariff_plans, 
  public.meters, 
  public.buildings, 
  public.sites
CASCADE;

-- 2. Optional: If you also want to delete all registered users (logins)
-- DELETE FROM auth.users;
