-- activity_log_computed was created before activity_log.property_id existed, so the
-- per-property filter in Log History had no column to filter on (every property showed
-- "No activity yet" while All Properties worked).
create or replace view public.activity_log_computed as
 select a.id, a.table_name, a.record_id, a.action, a.actor_id, a.old_data, a.new_data, a.created_at,
        p.full_name as actor_name,
        a.property_id
   from public.activity_log a
   left join public.profiles p on p.id = a.actor_id;

update public.activity_log al
   set property_id = a.property_id
  from public.assets a
 where al.property_id is null and al.table_name = 'assets'
   and al.record_id = a.id::text and a.property_id is not null;

update public.activity_log al
   set property_id = a.property_id
  from public.assets a
 where al.property_id is null
   and al.table_name in ('physical_inventory','movement_log','maintenance_log','disposal_log','purchase_log')
   and a.id = coalesce(al.new_data->>'asset_id', al.old_data->>'asset_id')::bigint
   and a.property_id is not null;
