alter table public.movement_log add column if not exists qty numeric(12,2);

update public.movement_log
   set qty = (substring(remarks from 'Actual Qty: ([0-9]+(\.[0-9]+)?)'))::numeric
 where qty is null and remarks ~ 'Actual Qty: [0-9]';

create or replace view public.movement_log_computed as
 select ml.id, ml.movement_date, ml.asset_id, ml.movement_type, ml.from_location, ml.to_location,
        ml.reason, ml.authorized_by, ml.remarks, ml.created_at,
        a.asset_code, a.asset_name, a.property_id, pr.name as property_name,
        ml.qty
   from public.movement_log ml
   left join public.assets a on a.id = ml.asset_id
   left join public.properties pr on pr.id = a.property_id;

-- apply_physical_count_to_movement() now also writes qty = actual_qty counted
-- (full function body is in the live database; see migration 27 for the rest of the logic).
