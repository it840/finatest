-- Each asset's own number (tag / property number), typed in by staff
alter table public.assets add column if not exists asset_number text;

-- the same number cannot be used twice within one property (case and spaces ignored); blanks are allowed
create unique index if not exists uq_assets_property_asset_number
  on public.assets (property_id, lower(trim(asset_number)))
  where asset_number is not null and trim(asset_number) <> '';

-- expose it in assets_computed (appended as the last column; the rest of the view is unchanged)
do $$
declare d text;
begin
  d := pg_get_viewdef('public.assets_computed'::regclass, true);
  if position('asset_number' in d) = 0 then
    d := regexp_replace(d, '\n\s*FROM assets a', E',\n    a.asset_number\n   FROM assets a');
    execute 'create or replace view public.assets_computed as ' || d;
  end if;
end $$;
alter view public.assets_computed set (security_invoker = true);
grant select on public.assets_computed to authenticated;
