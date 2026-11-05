-- Movement Log connections
-- 1) fix the "Tranfer" typo (lookup + existing rows)
update public.movement_types set name = 'Transfer' where name = 'Tranfer'
  and not exists (select 1 from public.movement_types where name = 'Transfer');
update public.movement_log set movement_type = 'Transfer' where movement_type = 'Tranfer';

insert into public.movement_reasons (name) values ('Updated in Asset Database')
on conflict (name) do nothing;

-- 2) movements applied to an asset flag themselves so the asset trigger below does not log twice
CREATE OR REPLACE FUNCTION public.apply_movement_to_asset()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.asset_id is not null and new.to_location is not null then
    perform set_config('app.movement_sync', 'on', true);
    update public.assets set actual_location = new.to_location where id = new.asset_id;
    perform set_config('app.movement_sync', 'off', true);
  end if;
  return new;
end $function$;

-- 3) editing Actual Location on the asset record creates a movement
CREATE OR REPLACE FUNCTION public.log_asset_location_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(current_setting('app.movement_sync', true), 'off') = 'on' then
    return new;
  end if;
  if new.actual_location is not null and new.actual_location is distinct from old.actual_location then
    if coalesce(old.actual_location, old.location) is distinct from new.actual_location then
      insert into public.movement_log (movement_date, asset_id, movement_type, from_location, to_location, reason, authorized_by, remarks, qty)
      values (current_date, new.id, 'Relocation', coalesce(old.actual_location, old.location), new.actual_location,
              'Updated in Asset Database', auth.uid(),
              'Auto-generated: Actual Location was changed on the asset record.',
              coalesce(new.registered_qty,0) - coalesce(new.disposal_qty,0));
    end if;
  end if;
  return new;
end $function$;

drop trigger if exists trg_asset_location_movement on public.assets;
create trigger trg_asset_location_movement after update of actual_location on public.assets
  for each row execute function public.log_asset_location_change();
revoke execute on function public.log_asset_location_change() from anon, authenticated, public;

-- 4) physical count: compare with where the asset is now (actual location, else home location)
CREATE OR REPLACE FUNCTION public.apply_physical_count_to_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  prev_loc text;
  detail_note text;
begin
  if new.asset_id is not null and new.actual_location is not null then
    select coalesce(actual_location, location) into prev_loc from public.assets where id = new.asset_id;

    if prev_loc is distinct from new.actual_location then
      detail_note := 'Auto-generated from physical count on ' || new.inventory_date || '.';
      if new.inventory_status is not null then detail_note := detail_note || ' Status: ' || new.inventory_status || '.'; end if;
      if new.condition is not null then detail_note := detail_note || ' Condition: ' || new.condition || '.'; end if;
      if new.actual_qty is not null then
        detail_note := detail_note || ' Actual Qty: ' || new.actual_qty
          || case when new.registered_qty is not null then ' (Registered: ' || new.registered_qty || ')' else '' end || '.';
      end if;
      if new.remarks is not null and length(trim(new.remarks)) > 0 then
        detail_note := detail_note || ' Count remarks: ' || new.remarks;
      end if;

      insert into public.movement_log (movement_date, asset_id, movement_type, from_location, to_location, reason, authorized_by, remarks, qty)
      values (new.inventory_date, new.asset_id, 'Relocation', prev_loc, new.actual_location,
              'Detected During Physical Count', coalesce(new.verified_by, auth.uid()), detail_note, new.actual_qty);
    end if;
  end if;
  return new;
end $function$;

-- 5) show who logged each movement
create or replace view public.movement_log_computed as
 select ml.id, ml.movement_date, ml.asset_id, ml.movement_type, ml.from_location, ml.to_location,
        ml.reason, ml.authorized_by, ml.remarks, ml.created_at,
        a.asset_code, a.asset_name, a.property_id, pr.name as property_name,
        ml.qty,
        pf.full_name as authorized_by_name
   from public.movement_log ml
   left join public.assets a on a.id = ml.asset_id
   left join public.properties pr on pr.id = a.property_id
   left join public.profiles pf on pf.id = ml.authorized_by;
