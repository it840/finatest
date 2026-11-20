-- Automatic asset numbers: PREFIX-0001, PREFIX-0002, ... per property prefix (initials by default, editable in Settings).
-- A new asset without a number gets the next one; typed numbers are kept. Existing blank numbers were filled once.
alter table public.properties add column if not exists asset_prefix text;

create or replace function public.default_asset_prefix(p_name text)
returns text language sql immutable as $$
  select coalesce(nullif(regexp_replace(initcap(coalesce(p_name,'')), '[^A-Z0-9]', '', 'g'), ''), 'AST')
$$;

update public.properties set asset_prefix = public.default_asset_prefix(name)
 where coalesce(trim(asset_prefix), '') = '';

create or replace function public.set_property_prefix()
returns trigger language plpgsql as $$
begin
  if coalesce(trim(new.asset_prefix), '') = '' then
    new.asset_prefix := public.default_asset_prefix(new.name);
  else
    new.asset_prefix := upper(trim(new.asset_prefix));
  end if;
  return new;
end $$;
drop trigger if exists trg_property_prefix on public.properties;
create trigger trg_property_prefix before insert or update of asset_prefix, name on public.properties
  for each row execute function public.set_property_prefix();

create or replace function public.next_asset_number(p_property_id bigint)
returns text language plpgsql security definer set search_path = public as $$
declare
  pfx text;
  n int;
begin
  select coalesce(nullif(trim(asset_prefix), ''), 'AST') into pfx from public.properties where id = p_property_id;
  pfx := coalesce(pfx, 'AST');
  perform pg_advisory_xact_lock(hashtext('asset_number:' || upper(pfx)));
  select coalesce(max(substr(asset_number, length(pfx) + 2)::int), 0) + 1 into n
    from public.assets
   where upper(left(asset_number, length(pfx) + 1)) = upper(pfx) || '-'
     and substr(asset_number, length(pfx) + 2) ~ '^[0-9]+$';
  return upper(pfx) || '-' || lpad(n::text, 4, '0');
end $$;
revoke execute on function public.next_asset_number(bigint) from public, anon;
grant execute on function public.next_asset_number(bigint) to authenticated;

create or replace function public.assign_asset_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(new.asset_number), '') = '' then
    new.asset_number := public.next_asset_number(new.property_id);
  end if;
  return new;
end $$;
drop trigger if exists trg_assign_asset_number on public.assets;
create trigger trg_assign_asset_number before insert on public.assets
  for each row execute function public.assign_asset_number();
revoke execute on function public.assign_asset_number() from public, anon, authenticated;

alter table public.assets disable trigger trg_log_assets;
do $$
declare r record;
begin
  for r in select id, property_id from public.assets
            where coalesce(trim(asset_number), '') = ''
            order by property_id nulls last, created_at, id loop
    update public.assets set asset_number = public.next_asset_number(r.property_id) where id = r.id;
  end loop;
end $$;
alter table public.assets enable trigger trg_log_assets;
