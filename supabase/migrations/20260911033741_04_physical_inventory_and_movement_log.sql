create table if not exists public.physical_inventory (
  id bigint generated always as identity primary key,
  inventory_date date not null default current_date,
  asset_id bigint references public.assets(id) on delete set null,
  registered_qty numeric(12,2),
  actual_qty numeric(12,2) not null,
  actual_location text,
  inventory_status text,
  condition text,
  verified_by uuid references public.profiles(id) on delete set null,
  verification_date date default current_date,
  remarks text,
  created_at timestamptz not null default now()
);

create or replace view public.physical_inventory_computed as
select
  pi.*,
  a.asset_code, a.asset_name, a.location as registered_location, a.department, a.assigned_to,
  case
    when pi.actual_qty is null or pi.registered_qty is null then null
    when pi.actual_qty = pi.registered_qty then 'No Discrepancy'
    when pi.actual_qty < pi.registered_qty then (pi.registered_qty - pi.actual_qty)::text || ' Missing'
    else (pi.actual_qty - pi.registered_qty)::text || ' Extra'
  end as discrepancy
from public.physical_inventory pi
left join public.assets a on a.id = pi.asset_id;

alter table public.physical_inventory enable row level security;
create policy "pi: read all authenticated" on public.physical_inventory for select
  using (auth.role() = 'authenticated');
create policy "pi: any authenticated insert" on public.physical_inventory for insert
  with check (auth.role() = 'authenticated');
create policy "pi: manager+admin update" on public.physical_inventory for update
  using (public.is_manager_or_admin());
create policy "pi: admin delete" on public.physical_inventory for delete
  using (public.is_admin());

alter view public.physical_inventory_computed set (security_invoker = true);
grant select on public.physical_inventory_computed to authenticated;

create table if not exists public.movement_log (
  id bigint generated always as identity primary key,
  movement_date date not null default current_date,
  asset_id bigint references public.assets(id) on delete set null,
  movement_type text,
  from_location text,
  to_location text,
  reason text,
  authorized_by uuid references public.profiles(id) on delete set null,
  remarks text,
  created_at timestamptz not null default now()
);

create or replace view public.movement_log_computed as
select
  ml.*,
  a.asset_code, a.asset_name
from public.movement_log ml
left join public.assets a on a.id = ml.asset_id;

alter table public.movement_log enable row level security;
create policy "ml: read all authenticated" on public.movement_log for select
  using (auth.role() = 'authenticated');
create policy "ml: any authenticated insert" on public.movement_log for insert
  with check (auth.role() = 'authenticated');
create policy "ml: manager+admin update" on public.movement_log for update
  using (public.is_manager_or_admin());
create policy "ml: admin delete" on public.movement_log for delete
  using (public.is_admin());

alter view public.movement_log_computed set (security_invoker = true);
grant select on public.movement_log_computed to authenticated;

create or replace function public.apply_movement_to_asset()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.asset_id is not null and new.to_location is not null then
    update public.assets set location = new.to_location where id = new.asset_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_movement_apply on public.movement_log;
create trigger trg_movement_apply after insert on public.movement_log
  for each row execute function public.apply_movement_to_asset();

revoke execute on function public.apply_movement_to_asset() from anon, authenticated, public;
