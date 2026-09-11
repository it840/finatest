drop view if exists public.physical_inventory_computed;
create view public.physical_inventory_computed as
select
  pi.*,
  a.asset_code, a.asset_name, a.location as registered_location, a.department, a.assigned_to,
  a.property_id, pr.name as property_name,
  case
    when pi.actual_qty is null or pi.registered_qty is null then null
    when pi.actual_qty = pi.registered_qty then 'No Discrepancy'
    when pi.actual_qty < pi.registered_qty then (pi.registered_qty - pi.actual_qty)::text || ' Missing'
    else (pi.actual_qty - pi.registered_qty)::text || ' Extra'
  end as discrepancy
from public.physical_inventory pi
left join public.assets a on a.id = pi.asset_id
left join public.properties pr on pr.id = a.property_id;

alter view public.physical_inventory_computed set (security_invoker = true);
grant select on public.physical_inventory_computed to authenticated;

drop view if exists public.movement_log_computed;
create view public.movement_log_computed as
select
  ml.*,
  a.asset_code, a.asset_name,
  a.property_id, pr.name as property_name
from public.movement_log ml
left join public.assets a on a.id = ml.asset_id
left join public.properties pr on pr.id = a.property_id;

alter view public.movement_log_computed set (security_invoker = true);
grant select on public.movement_log_computed to authenticated;
