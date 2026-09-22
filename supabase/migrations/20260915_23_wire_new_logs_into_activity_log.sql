create or replace function public.log_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  prop_id bigint;
  rec record;
begin
  rec := coalesce(new, old);

  if TG_TABLE_NAME = 'assets' then
    prop_id := rec.property_id;
  elsif TG_TABLE_NAME = 'profiles' then
    prop_id := rec.property_id;
  elsif TG_TABLE_NAME in ('physical_inventory', 'movement_log', 'maintenance_log', 'disposal_log', 'purchase_log') then
    select property_id into prop_id from public.assets where id = rec.asset_id;
  end if;

  if TG_OP = 'DELETE' then
    insert into public.activity_log(table_name, record_id, action, actor_id, old_data, property_id)
      values (TG_TABLE_NAME, old.id::text, 'delete', auth.uid(), to_jsonb(old), prop_id);
    return old;
  elsif TG_OP = 'UPDATE' then
    insert into public.activity_log(table_name, record_id, action, actor_id, old_data, new_data, property_id)
      values (TG_TABLE_NAME, new.id::text, 'update', auth.uid(), to_jsonb(old), to_jsonb(new), prop_id);
    return new;
  else
    insert into public.activity_log(table_name, record_id, action, actor_id, new_data, property_id)
      values (TG_TABLE_NAME, new.id::text, 'insert', auth.uid(), to_jsonb(new), prop_id);
    return new;
  end if;
end $$;

drop trigger if exists trg_log_maintenance_log on public.maintenance_log;
create trigger trg_log_maintenance_log after insert or update or delete on public.maintenance_log
  for each row execute function public.log_activity();

drop trigger if exists trg_log_disposal_log on public.disposal_log;
create trigger trg_log_disposal_log after insert or update or delete on public.disposal_log
  for each row execute function public.log_activity();

drop trigger if exists trg_log_purchase_log on public.purchase_log;
create trigger trg_log_purchase_log after insert or update or delete on public.purchase_log
  for each row execute function public.log_activity();
