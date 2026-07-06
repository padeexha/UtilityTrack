-- Optional example premises and meters. Run after 001_initial_schema.sql.
with new_site as (
  insert into public.sites (name, address)
  values ('Demo Premises', 'Colombo, Sri Lanka')
  returning id
),
main_building as (
  insert into public.buildings (site_id, name, code)
  select id, 'Main Premises', 'MAIN' from new_site
  returning id, site_id
),
sub_a as (
  insert into public.buildings (site_id, name, code)
  select site_id, 'Building A', 'BLD-A' from main_building
  returning id, site_id
),
sub_b as (
  insert into public.buildings (site_id, name, code)
  select site_id, 'Building B', 'BLD-B' from main_building
  returning id, site_id
),
main_electric as (
  insert into public.meters (site_id, building_id, utility_type, name, meter_number, unit)
  select site_id, id, 'electricity'::utility_type, 'Main Electricity Meter', 'ELEC-MAIN-001', 'kWh'
  from main_building
  returning id, site_id
)
insert into public.meters (site_id, building_id, parent_meter_id, utility_type, name, meter_number, unit)
select a.site_id, a.id, m.id, 'electricity'::utility_type, 'Building A Electricity', 'ELEC-A-001', 'kWh'
from sub_a a cross join main_electric m
union all
select b.site_id, b.id, m.id, 'electricity'::utility_type, 'Building B Electricity', 'ELEC-B-001', 'kWh'
from sub_b b cross join main_electric m;

insert into public.tariff_plans(name, utility_type, effective_from, fixed_charge, tax_percent)
values ('Demo Electricity Flat Rate', 'electricity', current_date, 500, 0);

insert into public.tariff_slabs(tariff_plan_id, lower_bound, upper_bound, rate_per_unit)
select id, 0, null, 45
from public.tariff_plans
where name = 'Demo Electricity Flat Rate';
