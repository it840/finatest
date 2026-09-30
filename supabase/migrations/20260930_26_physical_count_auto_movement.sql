insert into public.movement_reasons (name) values ('Detected During Physical Count')
on conflict (name) do nothing;

-- When a physical count finds an asset at a different actual_location than
-- currently on record, automatically create a Movement Log entry for it
-- (rather than requiring a separate manual movement entry). This keeps
-- Actual Location accurate and the audit trail complete, now that Movement
-- Log itself is view-only (no manual logging form).
create or replace function public.apply_physical_count_to_movement()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  prev_actual_loc text;
begin
  if new.asset_id is not null and new.actual_location is not null then
    select actual_location into prev_actual_loc from public.assets where id = new.asset_id;

    if prev_actual_loc is distinct from new.actual_location then
      insert into public.movement_log (
        movement_date, asset_id, movement_type, from_location, to_location, reason, authorized_by, remarks
      ) values (
        new.inventory_date, new.asset_id, 'Relocation', prev_actual_loc, new.actual_location,
        'Detected During Physical Count', new.verified_by,
        'Auto-generated: physical count on ' || new.inventory_date || ' found this asset at a different location.'
      );
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_physical_count_movement on public.physical_inventory;
create trigger trg_physical_count_movement after insert on public.physical_inventory
  for each row execute function public.apply_physical_count_to_movement();

revoke execute on function public.apply_physical_count_to_movement() from anon, authenticated, public;
