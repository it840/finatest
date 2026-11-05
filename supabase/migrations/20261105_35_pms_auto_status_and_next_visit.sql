-- 1) PMS status is worked out from the date: Scheduled/Due entries dated in the past read OVERDUE,
--    today's read DUE. The value a person typed is kept as pms_status_set (last column of the view).
create or replace view public.maintenance_log_computed as
 SELECT ml.id,
    ml.scheduled_date,
    ml.asset_id,
    case
      when upper(ml.pms_status) in ('SCHEDULED','DUE') and ml.scheduled_date < current_date then 'OVERDUE'
      when upper(ml.pms_status) in ('SCHEDULED','DUE') and ml.scheduled_date = current_date then 'DUE'
      else ml.pms_status
    end as pms_status,
    ml.maintenance_type,
    ml.technician,
    ml.findings,
    ml.maintenance_cost,
    ml.remarks,
    ml.logged_by,
    ml.created_at,
    ac.asset_code,
    ac.asset_name,
    ac.category,
    ac.sub_category,
    ac.brand,
    ac.model,
    ac.serial_number,
    ac.location AS registered_location,
    ac.actual_location,
    ac.department,
    ac.assigned_to,
    ac.status AS asset_status,
    ac.condition,
    ac.last_maintenance,
    ac.maintenance_frequency_days,
    ac.maintenance_due,
    ac.property_id,
    ac.property_name,
    p.full_name AS logged_by_name,
    ml.pms_status as pms_status_set
   FROM maintenance_log ml
     LEFT JOIN assets_computed ac ON ac.id = ml.asset_id
     LEFT JOIN profiles p ON p.id = ml.logged_by;

-- 2) completing a visit schedules the next one from the asset's maintenance frequency (no duplicates)
CREATE OR REPLACE FUNCTION public.schedule_next_maintenance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  freq int;
begin
  if new.asset_id is null or upper(new.pms_status) <> 'COMPLETED' then return new; end if;
  if TG_OP = 'UPDATE' and upper(old.pms_status) = 'COMPLETED' then return new; end if;

  select maintenance_frequency_days into freq from public.assets where id = new.asset_id;
  if freq is null or freq <= 0 then return new; end if;

  -- do not create a duplicate if a later visit is already open
  if exists (select 1 from public.maintenance_log
              where asset_id = new.asset_id and id <> new.id
                and upper(pms_status) in ('SCHEDULED','DUE','OVERDUE','IN PROGRESS')
                and scheduled_date >= new.scheduled_date) then
    return new;
  end if;

  insert into public.maintenance_log (scheduled_date, asset_id, pms_status, maintenance_type, technician, remarks, logged_by)
  values (new.scheduled_date + freq, new.asset_id, 'SCHEDULED', new.maintenance_type, new.technician,
          'Auto-scheduled after maintenance completed on ' || new.scheduled_date, new.logged_by);
  return new;
end $function$;

drop trigger if exists trg_schedule_next_maintenance on public.maintenance_log;
create trigger trg_schedule_next_maintenance after insert or update of pms_status on public.maintenance_log
  for each row execute function public.schedule_next_maintenance();
revoke execute on function public.schedule_next_maintenance() from anon, authenticated, public;
