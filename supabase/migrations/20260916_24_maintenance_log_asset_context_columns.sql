drop view if exists public.maintenance_log_computed;

create view public.maintenance_log_computed as
select
  ml.*,
  ac.asset_code, ac.asset_name, ac.brand, ac.model, ac.serial_number,
  ac.location as registered_location, ac.actual_location, ac.department, ac.assigned_to,
  ac.status as asset_status, ac.condition, ac.last_maintenance, ac.maintenance_frequency_days, ac.maintenance_due,
  ac.property_id, ac.property_name,
  p.full_name as logged_by_name
from public.maintenance_log ml
left join public.assets_computed ac on ac.id = ml.asset_id
left join public.profiles p on p.id = ml.logged_by;

alter view public.maintenance_log_computed set (security_invoker = true);
grant select on public.maintenance_log_computed to authenticated;
