-- The auto-generated Movement Log entry (from migration 26) was discarding
-- most of what the physical count actually found — only location carried
-- over. This enriches the auto-generated remarks with everything relevant:
-- inventory status, condition, actual vs. registered quantity, and the
-- count's own free-text remarks — so nothing observed during the count is
-- lost when it flows into Movement Log.
create or replace function public.apply_physical_count_to_movement()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  prev_actual_loc text;
  detail_note text;
begin
  if new.asset_id is not null and new.actual_location is not null then
    select actual_location into prev_actual_loc from public.assets where id = new.asset_id;

    if prev_actual_loc is distinct from new.actual_location then
      detail_note := 'Auto-generated from physical count on ' || new.inventory_date || '.';

      if new.inventory_status is not null then
        detail_note := detail_note || ' Status: ' || new.inventory_status || '.';
      end if;
      if new.condition is not null then
        detail_note := detail_note || ' Condition: ' || new.condition || '.';
      end if;
      if new.actual_qty is not null then
        detail_note := detail_note || ' Actual Qty: ' || new.actual_qty
          || case when new.registered_qty is not null then ' (Registered: ' || new.registered_qty || ')' else '' end
          || '.';
      end if;
      if new.remarks is not null and length(trim(new.remarks)) > 0 then
        detail_note := detail_note || ' Count remarks: ' || new.remarks;
      end if;

      insert into public.movement_log (
        movement_date, asset_id, movement_type, from_location, to_location, reason, authorized_by, remarks
      ) values (
        new.inventory_date, new.asset_id, 'Relocation', prev_actual_loc, new.actual_location,
        'Detected During Physical Count', new.verified_by, detail_note
      );
    end if;
  end if;
  return new;
end $$;
