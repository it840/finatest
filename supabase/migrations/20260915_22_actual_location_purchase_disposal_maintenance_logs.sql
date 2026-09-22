-- Actual Location: where the asset physically is, separate from its registered Location
alter table public.assets add column if not exists actual_location text;

-- Lookup: PMS Statuses
create table if not exists public.pms_statuses (
  id bigint generated always as identity primary key,
  name text not null unique
);
alter table public.pms_statuses enable row level security;
create policy "pms_statuses: read all authenticated" on public.pms_statuses for select using (auth.role() = 'authenticated');
create policy "pms_statuses: admin write" on public.pms_statuses for insert with check (public.is_admin());
create policy "pms_statuses: admin update" on public.pms_statuses for update using (public.is_admin());
create policy "pms_statuses: admin delete" on public.pms_statuses for delete using (public.is_admin());
insert into public.pms_statuses (name) values
('SCHEDULED'),('DUE'),('OVERDUE'),('IN PROGRESS'),('COMPLETED'),('CANCELLED')
on conflict (name) do nothing;

-- Lookup: Maintenance Types
create table if not exists public.maintenance_types (
  id bigint generated always as identity primary key,
  name text not null unique
);
alter table public.maintenance_types enable row level security;
create policy "maintenance_types: read all authenticated" on public.maintenance_types for select using (auth.role() = 'authenticated');
create policy "maintenance_types: admin write" on public.maintenance_types for insert with check (public.is_admin());
create policy "maintenance_types: admin update" on public.maintenance_types for update using (public.is_admin());
create policy "maintenance_types: admin delete" on public.maintenance_types for delete using (public.is_admin());
insert into public.maintenance_types (name) values
('Preventive Maintenance (PM)'),('Corrective Maintenance (CM)'),('Emergency Maintenance'),
('Inspection'),('Calibration'),('Cleaning'),('Repair'),('Replacement'),('Overhaul'),('Testing')
on conflict (name) do nothing;

-- Purchase Log: restocks / additional-quantity purchases; each entry adds to assets.registered_qty
create table if not exists public.purchase_log (
  id bigint generated always as identity primary key,
  purchase_date date not null default current_date,
  asset_id bigint references public.assets(id) on delete set null,
  qty numeric(12,2) not null,
  unit_cost numeric(14,2),
  amount numeric(14,2) generated always as (qty * coalesce(unit_cost, 0)) stored,
  supplier text,
  acquisition_type text,
  remarks text,
  logged_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.purchase_log enable row level security;
create policy "purchase_log: read all authenticated" on public.purchase_log for select using (auth.role() = 'authenticated');
create policy "purchase_log: manager+admin insert" on public.purchase_log for insert with check (public.is_manager_or_admin());
create policy "purchase_log: manager+admin update" on public.purchase_log for update using (public.is_manager_or_admin());
create policy "purchase_log: admin delete" on public.purchase_log for delete using (public.is_admin());

create or replace view public.purchase_log_computed as
select pl.*, a.asset_code, a.asset_name, a.property_id, pr.name as property_name, p.full_name as logged_by_name
from public.purchase_log pl
left join public.assets a on a.id = pl.asset_id
left join public.properties pr on pr.id = a.property_id
left join public.profiles p on p.id = pl.logged_by;
alter view public.purchase_log_computed set (security_invoker = true);
grant select on public.purchase_log_computed to authenticated;

create or replace function public.apply_purchase_to_asset()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.asset_id is not null then
    update public.assets set registered_qty = coalesce(registered_qty,0) + new.qty where id = new.asset_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_purchase_apply on public.purchase_log;
create trigger trg_purchase_apply after insert on public.purchase_log
  for each row execute function public.apply_purchase_to_asset();
revoke execute on function public.apply_purchase_to_asset() from anon, authenticated, public;

-- Disposal Log: write-offs, sales, losses; each entry adds to assets.disposal_qty
create table if not exists public.disposal_log (
  id bigint generated always as identity primary key,
  disposal_date date not null default current_date,
  asset_id bigint references public.assets(id) on delete set null,
  qty numeric(12,2) not null,
  unit_cost numeric(14,2),
  amount numeric(14,2) generated always as (qty * coalesce(unit_cost, 0)) stored,
  disposal_reason text,
  remarks text,
  logged_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.disposal_log enable row level security;
create policy "disposal_log: read all authenticated" on public.disposal_log for select using (auth.role() = 'authenticated');
create policy "disposal_log: manager+admin insert" on public.disposal_log for insert with check (public.is_manager_or_admin());
create policy "disposal_log: manager+admin update" on public.disposal_log for update using (public.is_manager_or_admin());
create policy "disposal_log: admin delete" on public.disposal_log for delete using (public.is_admin());

create or replace view public.disposal_log_computed as
select dl.*, a.asset_code, a.asset_name, a.property_id, pr.name as property_name, p.full_name as logged_by_name
from public.disposal_log dl
left join public.assets a on a.id = dl.asset_id
left join public.properties pr on pr.id = a.property_id
left join public.profiles p on p.id = dl.logged_by;
alter view public.disposal_log_computed set (security_invoker = true);
grant select on public.disposal_log_computed to authenticated;

create or replace function public.apply_disposal_to_asset()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.asset_id is not null then
    update public.assets
      set disposal_qty = coalesce(disposal_qty,0) + new.qty,
          disposal_date = new.disposal_date,
          disposal_reason = coalesce(new.disposal_reason, disposal_reason)
      where id = new.asset_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_disposal_apply on public.disposal_log;
create trigger trg_disposal_apply after insert on public.disposal_log
  for each row execute function public.apply_disposal_to_asset();
revoke execute on function public.apply_disposal_to_asset() from anon, authenticated, public;

-- Maintenance Log (PMS): scheduling + history; marking an entry COMPLETED updates assets.last_maintenance
create table if not exists public.maintenance_log (
  id bigint generated always as identity primary key,
  scheduled_date date not null default current_date,
  asset_id bigint references public.assets(id) on delete set null,
  pms_status text not null default 'SCHEDULED',
  maintenance_type text,
  technician text,
  findings text,
  maintenance_cost numeric(14,2),
  remarks text,
  logged_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.maintenance_log enable row level security;
create policy "maintenance_log: read all authenticated" on public.maintenance_log for select using (auth.role() = 'authenticated');
create policy "maintenance_log: manager+admin insert" on public.maintenance_log for insert with check (public.is_manager_or_admin());
create policy "maintenance_log: manager+admin update" on public.maintenance_log for update using (public.is_manager_or_admin());
create policy "maintenance_log: admin delete" on public.maintenance_log for delete using (public.is_admin());

create or replace view public.maintenance_log_computed as
select ml.*, a.asset_code, a.asset_name, a.property_id, pr.name as property_name, p.full_name as logged_by_name
from public.maintenance_log ml
left join public.assets a on a.id = ml.asset_id
left join public.properties pr on pr.id = a.property_id
left join public.profiles p on p.id = ml.logged_by;
alter view public.maintenance_log_computed set (security_invoker = true);
grant select on public.maintenance_log_computed to authenticated;

create or replace function public.apply_maintenance_to_asset()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.asset_id is not null and upper(new.pms_status) = 'COMPLETED' then
    update public.assets set last_maintenance = new.scheduled_date where id = new.asset_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_maintenance_apply on public.maintenance_log;
create trigger trg_maintenance_apply after insert on public.maintenance_log
  for each row execute function public.apply_maintenance_to_asset();
revoke execute on function public.apply_maintenance_to_asset() from anon, authenticated, public;

-- Refresh assets_computed so actual_location is exposed (views with a.* don't auto-pick-up new columns)
drop view if exists public.assets_computed;
create view public.assets_computed as
select
  a.*,
  p.name as property_name,
  case when a.last_maintenance is not null and a.maintenance_frequency_days is not null
       then a.last_maintenance + a.maintenance_frequency_days end as maintenance_due,
  round(coalesce(a.purchase_cost,0) * 0.10, 2) as salvage_value,
  case when a.purchase_cost is not null and a.useful_life_years is not null and a.useful_life_years <> 0
       then round(greatest(a.purchase_cost - coalesce(a.purchase_cost,0)*0.10, 0) / a.useful_life_years, 2)
  end as annual_depreciation,
  case when a.acquisition_date is not null and a.useful_life_years is not null
       then (a.acquisition_date + make_interval(days => round(a.useful_life_years * 365.25)::int))::date
  end as end_of_life,
  case when a.purchase_cost is not null and a.acquisition_date is not null and a.useful_life_years is not null then
    case when (a.purchase_cost - a.purchase_cost*0.10) <= 0 then 0::numeric
      when current_date <= a.acquisition_date then 0::numeric
      when current_date >= (a.acquisition_date + make_interval(days => round(a.useful_life_years * 365.25)::int))::date
        then round(a.purchase_cost - a.purchase_cost*0.10, 2)
      else round(least(
             a.purchase_cost - a.purchase_cost*0.10,
             greatest((a.purchase_cost - a.purchase_cost*0.10) *
               ((current_date - a.acquisition_date)::numeric / 365.25), 0)
           ), 2)
    end
  end as accumulated_depreciation,
  case when a.purchase_cost is not null and a.acquisition_date is not null and a.useful_life_years is not null then
    greatest(
      round(a.purchase_cost * 0.10, 2),
      a.purchase_cost - (
        case when (a.purchase_cost - a.purchase_cost*0.10) <= 0 then 0::numeric
          when current_date <= a.acquisition_date then 0::numeric
          when current_date >= (a.acquisition_date + make_interval(days => round(a.useful_life_years * 365.25)::int))::date
            then round(a.purchase_cost - a.purchase_cost*0.10, 2)
          else round(least(
                 a.purchase_cost - a.purchase_cost*0.10,
                 greatest((a.purchase_cost - a.purchase_cost*0.10) *
                   ((current_date - a.acquisition_date)::numeric / 365.25), 0)
               ), 2)
        end
      )
    )
  end as current_asset_value,
  case when a.acquisition_date is not null and a.useful_life_years is not null then
    case when current_date >= (a.acquisition_date + make_interval(days => round(a.useful_life_years * 365.25)::int))::date then 0::numeric
      else ceil((((a.acquisition_date + make_interval(days => round(a.useful_life_years * 365.25)::int))::date - current_date)::numeric / 365.25) * 10) / 10.0
    end
  end as remaining_life_years,
  (a.registered_qty * coalesce(a.purchase_cost,0)) as registered_amount,
  (a.disposal_qty * coalesce(a.purchase_cost,0)) as disposal_amount,
  (a.registered_qty - a.disposal_qty) as remaining_qty,
  ((a.registered_qty - a.disposal_qty) * coalesce(a.purchase_cost,0)) as remaining_amount
from public.assets a
left join public.properties p on p.id = a.property_id;
alter view public.assets_computed set (security_invoker = true);
grant select on public.assets_computed to authenticated;
