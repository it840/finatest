-- PMS review fixes
-- 1) maintenance_log.completed_date: when the work was actually done (visits can now be completed later)
-- 2) apply_maintenance_to_asset(): runs on INSERT and on a status change to COMPLETED; uses the completion date;
--    never moves Last Maintenance backwards
-- 3) schedule_next_maintenance(): next visit = completion date + frequency; no next visit for disposed assets
-- 4) apply_disposal_to_asset(): fully disposing an asset cancels its open visits (Scheduled/Due/Overdue/In Progress)
-- 5) one-time: visits left open on already-disposed assets were cancelled (Asset-014, Asset-015, Asset-003)
-- 6) maintenance_log_computed exposes completed_date (last column)
alter table public.maintenance_log add column if not exists completed_date date;

create or replace function public.apply_maintenance_to_asset()
returns trigger language plpgsql security definer set search_path = public as $$
declare d date;
begin
  if new.asset_id is null or upper(new.pms_status) <> 'COMPLETED' then return new; end if;
  if TG_OP = 'UPDATE' and upper(old.pms_status) = 'COMPLETED' then return new; end if;
  d := coalesce(new.completed_date, new.scheduled_date);
  update public.assets set last_maintenance = greatest(coalesce(last_maintenance, d), d) where id = new.asset_id;
  return new;
end $$;

drop trigger if exists trg_maintenance_apply on public.maintenance_log;
create trigger trg_maintenance_apply after insert or update of pms_status on public.maintenance_log
  for each row execute function public.apply_maintenance_to_asset();

create or replace function public.schedule_next_maintenance()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  freq int;
  base date;
begin
  if new.asset_id is null or upper(new.pms_status) <> 'COMPLETED' then return new; end if;
  if TG_OP = 'UPDATE' and upper(old.pms_status) = 'COMPLETED' then return new; end if;

  select maintenance_frequency_days into freq from public.assets where id = new.asset_id and coalesce(status,'') <> 'Disposed';
  if freq is null or freq <= 0 then return new; end if;
  base := coalesce(new.completed_date, new.scheduled_date);

  if exists (select 1 from public.maintenance_log
              where asset_id = new.asset_id and id <> new.id
                and upper(pms_status) in ('SCHEDULED','DUE','OVERDUE','IN PROGRESS')
                and scheduled_date >= base) then
    return new;
  end if;

  insert into public.maintenance_log (scheduled_date, asset_id, pms_status, maintenance_type, technician, remarks, logged_by)
  values (base + freq, new.asset_id, 'SCHEDULED', new.maintenance_type, new.technician,
          'Auto-scheduled after maintenance completed on ' || base, new.logged_by);
  return new;
end $$;

CREATE OR REPLACE FUNCTION public.apply_disposal_to_asset()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.asset_id is not null then
    if new.qty > (select coalesce(registered_qty,0) from public.assets where id = new.asset_id) then
      raise exception 'Cannot dispose more than the quantity on hand.';
    end if;

    update public.assets
      set registered_qty = coalesce(registered_qty,0) - new.qty,
          disposal_qty = coalesce(disposal_qty,0) + new.qty,
          disposal_date = new.disposal_date,
          disposal_reason = coalesce(new.disposal_reason, disposal_reason),
          status = case when coalesce(registered_qty,0) - new.qty <= 0 then 'Disposed' else status end,
          condition = case when coalesce(registered_qty,0) - new.qty <= 0 then 'Disposed' else condition end
      where id = new.asset_id;

    if (select coalesce(registered_qty,0) from public.assets where id = new.asset_id) <= 0 then
      update public.maintenance_log
         set pms_status = 'CANCELLED',
             remarks = trim(coalesce(remarks || ' ', '') || 'Cancelled automatically: asset disposed on ' || coalesce(new.disposal_date, current_date) || '.')
       where asset_id = new.asset_id
         and upper(pms_status) in ('SCHEDULED','DUE','OVERDUE','IN PROGRESS');
    end if;
  end if;
  return new;
end $function$;

update public.maintenance_log m
   set pms_status = 'CANCELLED',
       remarks = trim(coalesce(m.remarks || ' ', '') || 'Cancelled automatically: asset was disposed.')
  from public.assets a
 where a.id = m.asset_id and a.status = 'Disposed'
   and upper(m.pms_status) in ('SCHEDULED','DUE','OVERDUE','IN PROGRESS');

create or replace view public.maintenance_log_computed as
 SELECT ml.id, ml.scheduled_date, ml.asset_id,
    case
      when upper(ml.pms_status) in ('SCHEDULED','DUE') and ml.scheduled_date < current_date then 'OVERDUE'
      when upper(ml.pms_status) in ('SCHEDULED','DUE') and ml.scheduled_date = current_date then 'DUE'
      else ml.pms_status
    end as pms_status,
    ml.maintenance_type, ml.technician, ml.findings, ml.maintenance_cost, ml.remarks, ml.logged_by, ml.created_at,
    ac.asset_code, ac.asset_name, ac.category, ac.sub_category, ac.brand, ac.model, ac.serial_number,
    ac.location AS registered_location, ac.actual_location, ac.department, ac.assigned_to,
    ac.status AS asset_status, ac.condition, ac.last_maintenance, ac.maintenance_frequency_days, ac.maintenance_due,
    ac.property_id, ac.property_name,
    p.full_name AS logged_by_name,
    ml.pms_status as pms_status_set,
    ml.completed_date
   FROM maintenance_log ml
     LEFT JOIN assets_computed ac ON ac.id = ml.asset_id
     LEFT JOIN profiles p ON p.id = ml.logged_by;
