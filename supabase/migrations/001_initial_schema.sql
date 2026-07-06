-- Utility Meter Reading, Billing and Maintenance Management System
-- Run this migration in the Supabase SQL editor or with the Supabase CLI.

create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'manager', 'worker', 'finance');
create type public.utility_type as enum ('electricity', 'water');
create type public.reading_status as enum ('draft', 'submitted', 'approved', 'rejected');
create type public.reading_type as enum ('normal', 'estimated', 'reset', 'replacement');
create type public.issue_status as enum ('reported', 'assigned', 'in_progress', 'waiting_parts', 'completed', 'verified', 'closed');
create type public.issue_priority as enum ('low', 'medium', 'high', 'critical');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'worker',
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  code text,
  floor_area_sqm numeric(12,2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_id, name)
);

create table public.meters (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete set null,
  parent_meter_id uuid references public.meters(id) on delete set null,
  utility_type public.utility_type not null,
  name text not null,
  meter_number text not null unique,
  unit text not null default 'kWh',
  multiplication_factor numeric(14,4) not null default 1 check (multiplication_factor > 0),
  initial_reading numeric(18,4) not null default 0 check (initial_reading >= 0),
  latitude numeric(10,7),
  longitude numeric(10,7),
  active boolean not null default true,
  installed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meter_not_own_parent check (parent_meter_id is null or parent_meter_id <> id)
);

create index meters_site_idx on public.meters(site_id);
create index meters_building_idx on public.meters(building_id);
create index meters_parent_idx on public.meters(parent_meter_id);

create table public.meter_assignments (
  id uuid primary key default gen_random_uuid(),
  meter_id uuid not null references public.meters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique(meter_id, user_id)
);

create table public.meter_readings (
  id uuid primary key default gen_random_uuid(),
  meter_id uuid not null references public.meters(id) on delete restrict,
  previous_reading numeric(18,4),
  current_reading numeric(18,4) not null check (current_reading >= 0),
  consumption numeric(18,4) not null default 0,
  reading_type public.reading_type not null default 'normal',
  status public.reading_status not null default 'submitted',
  photo_path text not null,
  notes text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  captured_at timestamptz not null default now(),
  read_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete restrict,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meter_readings_meter_date_idx on public.meter_readings(meter_id, captured_at desc);
create index meter_readings_status_idx on public.meter_readings(status);
create unique index meter_readings_one_per_meter_day_idx
  on public.meter_readings(meter_id, ((captured_at at time zone 'Asia/Colombo')::date))
  where status <> 'rejected';

create table public.tariff_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  utility_type public.utility_type not null,
  effective_from date not null,
  effective_to date,
  fixed_charge numeric(14,2) not null default 0 check (fixed_charge >= 0),
  tax_percent numeric(8,4) not null default 0 check (tax_percent >= 0),
  currency text not null default 'LKR',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);

create table public.tariff_slabs (
  id uuid primary key default gen_random_uuid(),
  tariff_plan_id uuid not null references public.tariff_plans(id) on delete cascade,
  lower_bound numeric(18,4) not null default 0 check (lower_bound >= 0),
  upper_bound numeric(18,4),
  rate_per_unit numeric(14,4) not null check (rate_per_unit >= 0),
  created_at timestamptz not null default now(),
  check (upper_bound is null or upper_bound > lower_bound),
  unique(tariff_plan_id, lower_bound)
);

create table public.utility_bills (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null unique references public.meter_readings(id) on delete restrict,
  tariff_plan_id uuid not null references public.tariff_plans(id) on delete restrict,
  bill_number text not null unique,
  consumption numeric(18,4) not null,
  usage_charge numeric(14,2) not null,
  fixed_charge numeric(14,2) not null,
  tax_amount numeric(14,2) not null,
  total_amount numeric(14,2) not null,
  currency text not null default 'LKR',
  calculation_breakdown jsonb not null default '{}'::jsonb,
  billing_date date not null default current_date,
  due_date date,
  status text not null default 'draft' check (status in ('draft', 'issued', 'paid', 'cancelled')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.maintenance_issues (
  id uuid primary key default gen_random_uuid(),
  meter_id uuid references public.meters(id) on delete set null,
  title text not null,
  description text,
  priority public.issue_priority not null default 'medium',
  status public.issue_status not null default 'reported',
  photo_path text,
  reported_by uuid not null references public.profiles(id) on delete restrict,
  assigned_to uuid references public.profiles(id) on delete set null,
  reported_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- User and authorization helpers
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin_or_manager()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin', 'manager'), false);
$$;

create or replace function public.can_access_meter(p_meter_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select
    coalesce(public.current_user_role() in ('admin', 'manager', 'finance'), false)
    or exists (
      select 1 from public.meter_assignments ma
      where ma.meter_id = p_meter_id and ma.user_id = auth.uid()
    )
    or not exists (
      select 1 from public.meter_assignments ma where ma.meter_id = p_meter_id
    );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();
create trigger sites_updated_at before update on public.sites
for each row execute procedure public.set_updated_at();
create trigger buildings_updated_at before update on public.buildings
for each row execute procedure public.set_updated_at();
create trigger meters_updated_at before update on public.meters
for each row execute procedure public.set_updated_at();
create trigger readings_updated_at before update on public.meter_readings
for each row execute procedure public.set_updated_at();
create trigger tariff_plans_updated_at before update on public.tariff_plans
for each row execute procedure public.set_updated_at();
create trigger utility_bills_updated_at before update on public.utility_bills
for each row execute procedure public.set_updated_at();
create trigger maintenance_issues_updated_at before update on public.maintenance_issues
for each row execute procedure public.set_updated_at();

-- Server-side reading calculation and validation
create or replace function public.prepare_meter_reading()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_multiplier numeric(14,4);
  v_initial numeric(18,4);
  v_previous numeric(18,4);
begin
  select multiplication_factor, initial_reading
  into v_multiplier, v_initial
  from public.meters
  where id = new.meter_id and active = true;

  if not found then
    raise exception 'Meter does not exist or is inactive';
  end if;

  if new.read_by is null then
    new.read_by := auth.uid();
  end if;

  if tg_op = 'INSERT' or new.meter_id is distinct from old.meter_id then
    select mr.current_reading
      into v_previous
    from public.meter_readings mr
    where mr.meter_id = new.meter_id
      and mr.status <> 'rejected'
      and (tg_op = 'INSERT' or mr.id <> new.id)
    order by mr.captured_at desc, mr.created_at desc
    limit 1;

    new.previous_reading := coalesce(v_previous, v_initial);
  elsif new.previous_reading is null then
    new.previous_reading := old.previous_reading;
  end if;

  if new.current_reading < new.previous_reading
     and new.reading_type not in ('reset', 'replacement') then
    raise exception 'Current reading cannot be lower than previous reading';
  end if;

  if new.reading_type in ('reset', 'replacement') then
    new.consumption := round(new.current_reading * v_multiplier, 4);
  else
    new.consumption := round((new.current_reading - new.previous_reading) * v_multiplier, 4);
  end if;

  if new.status = 'approved' and new.approved_at is null then
    new.approved_at := now();
    new.approved_by := coalesce(new.approved_by, auth.uid());
  end if;

  return new;
end;
$$;

create trigger prepare_meter_reading_trigger
before insert or update of meter_id, current_reading, reading_type, status
on public.meter_readings
for each row execute procedure public.prepare_meter_reading();

-- Tariff calculation
create or replace function public.calculate_tariff_charge(p_tariff_id uuid, p_consumption numeric)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_plan public.tariff_plans%rowtype;
  v_slab record;
  v_units numeric(18,4);
  v_usage numeric(14,2) := 0;
  v_tax numeric(14,2);
  v_total numeric(14,2);
  v_lines jsonb := '[]'::jsonb;
begin
  if p_consumption < 0 then
    raise exception 'Consumption cannot be negative';
  end if;

  select * into v_plan from public.tariff_plans where id = p_tariff_id and active = true;
  if not found then
    raise exception 'Tariff plan not found';
  end if;

  for v_slab in
    select * from public.tariff_slabs
    where tariff_plan_id = p_tariff_id
    order by lower_bound
  loop
    if p_consumption <= v_slab.lower_bound then
      v_units := 0;
    elsif v_slab.upper_bound is null then
      v_units := p_consumption - v_slab.lower_bound;
    else
      v_units := greatest(least(p_consumption, v_slab.upper_bound) - v_slab.lower_bound, 0);
    end if;

    if v_units > 0 then
      v_usage := v_usage + round(v_units * v_slab.rate_per_unit, 2);
      v_lines := v_lines || jsonb_build_array(jsonb_build_object(
        'from', v_slab.lower_bound,
        'to', v_slab.upper_bound,
        'units', v_units,
        'rate', v_slab.rate_per_unit,
        'amount', round(v_units * v_slab.rate_per_unit, 2)
      ));
    end if;
  end loop;

  if jsonb_array_length(v_lines) = 0 and p_consumption > 0 then
    raise exception 'Tariff plan has no applicable slabs';
  end if;

  v_tax := round((v_usage + v_plan.fixed_charge) * v_plan.tax_percent / 100, 2);
  v_total := round(v_usage + v_plan.fixed_charge + v_tax, 2);

  return jsonb_build_object(
    'consumption', p_consumption,
    'usage_charge', v_usage,
    'fixed_charge', v_plan.fixed_charge,
    'tax_percent', v_plan.tax_percent,
    'tax_amount', v_tax,
    'total_amount', v_total,
    'currency', v_plan.currency,
    'slabs', v_lines
  );
end;
$$;

create or replace function public.create_bill_for_reading(p_reading_id uuid, p_tariff_id uuid)
returns public.utility_bills
language plpgsql
security definer set search_path = public
as $$
declare
  v_reading public.meter_readings%rowtype;
  v_calc jsonb;
  v_bill public.utility_bills%rowtype;
  v_number text;
begin
  if coalesce(public.current_user_role() in ('admin', 'manager', 'finance'), false) is false then
    raise exception 'Not authorized to create bills';
  end if;

  select * into v_reading from public.meter_readings where id = p_reading_id;
  if not found then raise exception 'Reading not found'; end if;
  if v_reading.status <> 'approved' then raise exception 'Only approved readings can be billed'; end if;

  v_calc := public.calculate_tariff_charge(p_tariff_id, v_reading.consumption);
  v_number := 'UB-' || to_char(current_date, 'YYYYMM') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.utility_bills (
    reading_id, tariff_plan_id, bill_number, consumption,
    usage_charge, fixed_charge, tax_amount, total_amount,
    currency, calculation_breakdown, created_by, due_date
  ) values (
    p_reading_id, p_tariff_id, v_number, v_reading.consumption,
    (v_calc->>'usage_charge')::numeric,
    (v_calc->>'fixed_charge')::numeric,
    (v_calc->>'tax_amount')::numeric,
    (v_calc->>'total_amount')::numeric,
    v_calc->>'currency', v_calc, auth.uid(), current_date + 14
  )
  returning * into v_bill;

  return v_bill;
end;
$$;

-- Main meter versus sub-meter reconciliation
create or replace function public.meter_reconciliation(
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns table (
  parent_meter_id uuid,
  parent_name text,
  utility_type public.utility_type,
  parent_consumption numeric,
  child_consumption numeric,
  variance numeric,
  variance_percent numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with parent_usage as (
    select m.id, m.name, m.utility_type,
      coalesce(sum(r.consumption), 0)::numeric as consumption
    from public.meters m
    left join public.meter_readings r
      on r.meter_id = m.id
      and r.captured_at >= p_period_start
      and r.captured_at < p_period_end
      and r.status = 'approved'
    where exists (select 1 from public.meters c where c.parent_meter_id = m.id)
    group by m.id, m.name, m.utility_type
  ),
  child_usage as (
    select c.parent_meter_id,
      coalesce(sum(r.consumption), 0)::numeric as consumption
    from public.meters c
    left join public.meter_readings r
      on r.meter_id = c.id
      and r.captured_at >= p_period_start
      and r.captured_at < p_period_end
      and r.status = 'approved'
    where c.parent_meter_id is not null
    group by c.parent_meter_id
  )
  select p.id, p.name, p.utility_type,
    p.consumption,
    coalesce(c.consumption, 0),
    p.consumption - coalesce(c.consumption, 0),
    case when p.consumption = 0 then 0
      else round(((p.consumption - coalesce(c.consumption, 0)) / p.consumption) * 100, 2)
    end
  from parent_usage p
  left join child_usage c on c.parent_meter_id = p.id
  order by p.name;
$$;

-- Audit readings and bills
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.audit_events(entity_type, entity_id, action, actor_id, old_data, new_data)
  values (
    tg_table_name,
    coalesce(new.id, old.id),
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_meter_readings
after insert or update or delete on public.meter_readings
for each row execute procedure public.audit_row_change();
create trigger audit_utility_bills
after insert or update or delete on public.utility_bills
for each row execute procedure public.audit_row_change();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.buildings enable row level security;
alter table public.meters enable row level security;
alter table public.meter_assignments enable row level security;
alter table public.meter_readings enable row level security;
alter table public.tariff_plans enable row level security;
alter table public.tariff_slabs enable row level security;
alter table public.utility_bills enable row level security;
alter table public.maintenance_issues enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles read own or management" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_admin_or_manager());
create policy "profiles update own name" on public.profiles
for update to authenticated using (id = auth.uid() or public.is_admin_or_manager())
with check (id = auth.uid() or public.is_admin_or_manager());

create policy "authenticated read sites" on public.sites
for select to authenticated using (true);
create policy "management manage sites" on public.sites
for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

create policy "authenticated read buildings" on public.buildings
for select to authenticated using (true);
create policy "management manage buildings" on public.buildings
for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

create policy "authenticated read meters" on public.meters
for select to authenticated using (public.can_access_meter(id));
create policy "management manage meters" on public.meters
for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

create policy "assignments visible to owner or management" on public.meter_assignments
for select to authenticated using (user_id = auth.uid() or public.is_admin_or_manager());
create policy "management manage assignments" on public.meter_assignments
for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

create policy "readings visible to authorized users" on public.meter_readings
for select to authenticated using (
  public.can_access_meter(meter_id)
  or read_by = auth.uid()
);
create policy "authorized users submit readings" on public.meter_readings
for insert to authenticated with check (
  public.can_access_meter(meter_id)
  and read_by = auth.uid()
  and status in ('draft', 'submitted')
);
create policy "worker edits own unapproved reading" on public.meter_readings
for update to authenticated using (
  (read_by = auth.uid() and status in ('draft', 'submitted'))
  or public.is_admin_or_manager()
) with check (
  (read_by = auth.uid() and status in ('draft', 'submitted'))
  or public.is_admin_or_manager()
);

create policy "authenticated read tariffs" on public.tariff_plans
for select to authenticated using (true);
create policy "management manage tariffs" on public.tariff_plans
for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
create policy "authenticated read tariff slabs" on public.tariff_slabs
for select to authenticated using (true);
create policy "management manage tariff slabs" on public.tariff_slabs
for all to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

create policy "finance and management read bills" on public.utility_bills
for select to authenticated using (public.current_user_role() in ('admin', 'manager', 'finance'));
create policy "finance and management update bills" on public.utility_bills
for update to authenticated using (public.current_user_role() in ('admin', 'manager', 'finance'))
with check (public.current_user_role() in ('admin', 'manager', 'finance'));

create policy "issues visible to reporter assignee management" on public.maintenance_issues
for select to authenticated using (
  reported_by = auth.uid() or assigned_to = auth.uid() or public.is_admin_or_manager()
);
create policy "authenticated report issues" on public.maintenance_issues
for insert to authenticated with check (reported_by = auth.uid());
create policy "assigned or management update issues" on public.maintenance_issues
for update to authenticated using (assigned_to = auth.uid() or public.is_admin_or_manager())
with check (assigned_to = auth.uid() or public.is_admin_or_manager());

create policy "management read audit events" on public.audit_events
for select to authenticated using (public.is_admin_or_manager());

-- Private meter photo storage bucket and policies
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meter-photos', 'meter-photos', false, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "users upload own meter photos" on storage.objects
for insert to authenticated with check (
  bucket_id = 'meter-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "photo owner and authorized staff can read" on storage.objects
for select to authenticated using (
  bucket_id = 'meter-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.current_user_role() in ('admin', 'manager', 'finance')
  )
);

create policy "photo owner can update own uploads" on storage.objects
for update to authenticated using (
  bucket_id = 'meter-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'meter-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "photo owner or management can delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'meter-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin_or_manager()
  )
);

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin_or_manager() to authenticated;
grant execute on function public.can_access_meter(uuid) to authenticated;
grant execute on function public.calculate_tariff_charge(uuid, numeric) to authenticated;
grant execute on function public.create_bill_for_reading(uuid, uuid) to authenticated;
grant execute on function public.meter_reconciliation(timestamptz, timestamptz) to authenticated;

-- Additional integrity safeguards
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.active is distinct from old.active)
     and auth.uid() is not null
     and coalesce(public.current_user_role() = 'admin', false) is false then
    raise exception 'Only an administrator can change roles or account status';
  end if;
  return new;
end;
$$;

create trigger protect_profile_privileges_trigger
before update on public.profiles
for each row execute procedure public.protect_profile_privileges();

create or replace function public.validate_meter_hierarchy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent_site uuid;
  v_parent_utility public.utility_type;
  v_building_site uuid;
begin
  if new.parent_meter_id is not null then
    select site_id, utility_type into v_parent_site, v_parent_utility
    from public.meters where id = new.parent_meter_id;
    if not found then raise exception 'Parent meter does not exist'; end if;
    if v_parent_site <> new.site_id then raise exception 'Parent and sub-meter must belong to the same site'; end if;
    if v_parent_utility <> new.utility_type then raise exception 'Parent and sub-meter must use the same utility type'; end if;
  end if;

  if new.building_id is not null then
    select site_id into v_building_site from public.buildings where id = new.building_id;
    if v_building_site <> new.site_id then raise exception 'Building and meter must belong to the same site'; end if;
  end if;
  return new;
end;
$$;

create trigger validate_meter_hierarchy_trigger
before insert or update of site_id, building_id, parent_meter_id, utility_type on public.meters
for each row execute procedure public.validate_meter_hierarchy();

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if tg_op = 'DELETE' then
    v_id := old.id;
  else
    v_id := new.id;
  end if;

  insert into public.audit_events(entity_type, entity_id, action, actor_id, old_data, new_data)
  values (
    tg_table_name,
    v_id,
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
