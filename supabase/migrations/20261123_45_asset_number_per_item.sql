-- Asset Number per item: PROPERTY-ITEMCODE-NNN  (e.g. 10 Wooden Chairs -> VBR-WC-001 ... VBR-WC-010)
-- Item code: initials for several words (Wooden Chair -> WC), first two letters for one word (Chair -> CH);
-- remembered per item name in asset_item_codes (same code in every property) and never shared (Charger -> CHA).
-- Existing PREFIX-0001 style numbers were renumbered once, in the order the assets were added.
create table if not exists public.asset_item_codes (
  id bigint generated always as identity primary key,
  name_key text not null unique,
  code text not null unique,
  created_at timestamptz not null default now()
);
alter table public.asset_item_codes enable row level security;
drop policy if exists "item codes: read" on public.asset_item_codes;
create policy "item codes: read" on public.asset_item_codes for select to authenticated using (true);

create or replace function public.item_name_key(p_name text) returns text language sql immutable as $$
  select lower(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'))
$$;

create or replace function public.item_code_base(p_name text) returns text language plpgsql immutable as $$
declare words text[] := '{}'; x text;
begin
  foreach x in array regexp_split_to_array(upper(coalesce(p_name, '')), '[^A-Z0-9]+') loop
    if x ~ '^[A-Z]' then words := words || x; end if;
  end loop;
  if coalesce(array_length(words, 1), 0) = 0 then return 'IT'; end if;
  if array_length(words, 1) = 1 then return left(words[1], 2); end if;
  return left(words[1], 1) || left(words[2], 1) || coalesce(left(words[3], 1), '');
end $$;

create or replace function public.item_code(p_name text, p_create boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare k text := public.item_name_key(p_name); b text; w text; c text; cands text[];
begin
  if k = '' then return 'IT'; end if;
  select code into c from public.asset_item_codes where name_key = k;
  if c is not null then return c; end if;
  if p_create then
    perform pg_advisory_xact_lock(hashtext('asset_item_code'));
    select code into c from public.asset_item_codes where name_key = k;
    if c is not null then return c; end if;
  end if;
  b := public.item_code_base(p_name);
  select x into w from unnest(regexp_split_to_array(upper(p_name), '[^A-Z0-9]+')) x where x ~ '^[A-Z]' limit 1;
  cands := array[b];
  if w is not null and left(w, 3) <> b then cands := cands || left(w, 3); end if;
  if w is not null and left(w, 4) <> b and left(w, 4) <> left(w, 3) then cands := cands || left(w, 4); end if;
  for i in 2..99 loop cands := cands || (b || i); end loop;
  foreach c in array cands loop
    if not exists (select 1 from public.asset_item_codes where code = c) then
      if p_create then insert into public.asset_item_codes (name_key, code) values (k, c); end if;
      return c;
    end if;
  end loop;
  return b || 'X';
end $$;

create or replace function public.next_asset_number_for(p_property_id bigint, p_asset_name text, p_create boolean)
returns text language plpgsql security definer set search_path = public as $$
declare pfx text; stem text; n int;
begin
  select coalesce(nullif(trim(asset_prefix), ''), 'AST') into pfx from public.properties where id = p_property_id;
  stem := upper(coalesce(pfx, 'AST')) || '-' || public.item_code(p_asset_name, p_create) || '-';
  perform pg_advisory_xact_lock(hashtext('asset_number:' || stem));
  select coalesce(max(substr(asset_number, length(stem) + 1)::int), 0) + 1 into n
    from public.assets
   where upper(left(asset_number, length(stem))) = stem
     and substr(asset_number, length(stem) + 1) ~ '^[0-9]+$';
  return stem || case when length(n::text) >= 3 then n::text else lpad(n::text, 3, '0') end;
end $$;
revoke execute on function public.next_asset_number_for(bigint, text, boolean) from public, anon, authenticated;
revoke execute on function public.item_code(text, boolean) from public, anon, authenticated;

create or replace function public.next_asset_number(p_property_id bigint, p_asset_name text)
returns text language sql security definer set search_path = public as $$
  select public.next_asset_number_for(p_property_id, p_asset_name, false)
$$;
revoke execute on function public.next_asset_number(bigint, text) from public, anon;
grant execute on function public.next_asset_number(bigint, text) to authenticated;
drop function if exists public.next_asset_number(bigint);

create or replace function public.assign_asset_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(new.asset_number), '') = '' then
    new.asset_number := public.next_asset_number_for(new.property_id, new.asset_name, true);
  end if;
  return new;
end $$;

alter table public.assets disable trigger trg_log_assets;
update public.assets set asset_number = null where asset_number ~ '^[A-Z0-9]+-[0-9]{4}$';
do $$
declare r record;
begin
  for r in select id, property_id, asset_name from public.assets where asset_number is null order by id loop
    update public.assets set asset_number = public.next_asset_number_for(r.property_id, r.asset_name, true) where id = r.id;
  end loop;
end $$;
alter table public.assets enable trigger trg_log_assets;
