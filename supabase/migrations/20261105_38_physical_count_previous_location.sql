-- Each physical count remembers where the asset was BEFORE the count (Previous Location);
-- the location counted stays in actual_location.
alter table public.physical_inventory add column if not exists previous_location text;

-- backfill existing counts in date order: previous = the last counted location, else the asset's home location
with ordered as (
  select pi.id,
         lag(pi.actual_location) over (partition by pi.asset_id order by pi.inventory_date, pi.id) as prev_count_loc,
         a.location as home_loc
    from public.physical_inventory pi
    left join public.assets a on a.id = pi.asset_id
)
update public.physical_inventory p
   set previous_location = coalesce(o.prev_count_loc, o.home_loc)
  from ordered o
 where o.id = p.id and p.previous_location is null;

-- new counts: capture the asset's current location before the count updates it
create or replace function public.set_count_previous_location()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.previous_location is null and new.asset_id is not null then
    select coalesce(actual_location, location) into new.previous_location
      from public.assets where id = new.asset_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_count_previous_location on public.physical_inventory;
create trigger trg_count_previous_location before insert on public.physical_inventory
  for each row execute function public.set_count_previous_location();
revoke execute on function public.set_count_previous_location() from anon, authenticated, public;

-- expose it in the view (added as the last column)
create or replace view public.physical_inventory_computed as
 SELECT pi.id, pi.inventory_date, pi.asset_id, pi.registered_qty, pi.actual_qty, pi.actual_location,
    pi.inventory_status, pi.condition, pi.verified_by, pi.verification_date, pi.remarks, pi.created_at,
    a.asset_code, a.asset_name, a.location AS registered_location, a.department, a.assigned_to,
    a.property_id, pr.name AS property_name,
    CASE
        WHEN pi.actual_qty IS NULL OR pi.registered_qty IS NULL THEN NULL::text
        WHEN pi.actual_qty = pi.registered_qty THEN 'No Discrepancy'::text
        WHEN pi.actual_qty < pi.registered_qty THEN ((pi.registered_qty - pi.actual_qty)::text) || ' Missing'::text
        ELSE ((pi.actual_qty - pi.registered_qty)::text) || ' Extra'::text
    END AS discrepancy,
    pi.previous_location
   FROM physical_inventory pi
     LEFT JOIN assets a ON a.id = pi.asset_id
     LEFT JOIN properties pr ON pr.id = a.property_id;
