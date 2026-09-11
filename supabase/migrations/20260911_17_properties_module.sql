create table if not exists public.properties (
  id bigint generated always as identity primary key,
  name text not null unique,
  logo_url text,
  created_at timestamptz not null default now()
);

alter table public.properties enable row level security;

create policy "properties: read all authenticated" on public.properties for select
  using (auth.role() = 'authenticated');
create policy "properties: admin insert" on public.properties for insert
  with check (public.is_admin());
create policy "properties: admin update" on public.properties for update
  using (public.is_admin());
create policy "properties: admin delete" on public.properties for delete
  using (public.is_admin());

insert into public.properties (name, logo_url) values
  ('Virgin Beach Resort', '/virgin-logo.png'),
  ('Z Hostel', '/zhostel-logo.png')
on conflict (name) do nothing;

alter table public.assets add column if not exists property_id bigint references public.properties(id) on delete set null;
create index if not exists idx_assets_property on public.assets(property_id);

update public.assets set property_id = (select id from public.properties order by id limit 1)
where property_id is null;

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
