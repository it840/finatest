create sequence if not exists public.asset_id_seq;

create table if not exists public.assets (
  id bigint generated always as identity primary key,
  asset_code text not null unique default ('Asset-' || lpad(nextval('public.asset_id_seq')::text, 3, '0')),
  asset_name text not null,
  category text,
  sub_category text,
  brand text,
  model text,
  serial_number text,
  qr_url text generated always as (
    'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' || asset_code
  ) stored,
  location text,
  department text,
  assigned_to text,
  status text not null default 'Active',
  condition text,
  acquisition_date date,
  acquisition_type text,
  purchase_cost numeric(14,2),
  supplier text,
  warranty_start date,
  warranty_expiry date,
  last_maintenance date,
  maintenance_frequency_days int,
  useful_life_years numeric(6,2),
  disposal_date date,
  disposal_reason text,
  remarks text,
  registered_qty numeric(12,2) not null default 1,
  disposal_qty numeric(12,2) not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assets_status on public.assets(status);
create index if not exists idx_assets_category on public.assets(category);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_assets_touch on public.assets;
create trigger trg_assets_touch before update on public.assets
  for each row execute function public.touch_updated_at();

create or replace view public.assets_computed as
select
  a.*,
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
from public.assets a;

alter table public.assets enable row level security;

create policy "assets: read all authenticated" on public.assets for select
  using (auth.role() = 'authenticated');
create policy "assets: manager+admin insert" on public.assets for insert
  with check (public.is_manager_or_admin());
create policy "assets: manager+admin update" on public.assets for update
  using (public.is_manager_or_admin());
create policy "assets: admin delete" on public.assets for delete
  using (public.is_admin());

alter view public.assets_computed set (security_invoker = true);
grant select on public.assets_computed to authenticated;
