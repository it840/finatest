-- Per-user 4-digit scan codes: scanning an asset's QR label opens …/?scan=<Asset ID>, which asks for the person's
-- code before showing anything. Codes are stored hashed (pgcrypto bcrypt) in scan_pins - RLS on and no policies, so
-- only these functions can use it. 5 wrong codes from one connection in 15 minutes locks it for 15 minutes.
-- Each successful scan is written to activity_log (table_name 'qr_scan', action 'scan') and shows in Log History.
create table if not exists public.scan_pins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  pin_hash text not null,
  set_at timestamptz not null default now(),
  set_by uuid
);
alter table public.scan_pins enable row level security;

create table if not exists public.scan_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  asset_code text,
  ok boolean not null,
  user_id uuid,
  created_at timestamptz not null default now()
);
alter table public.scan_attempts enable row level security;
create index if not exists scan_attempts_ip_time on public.scan_attempts (ip, created_at);

create or replace function public.set_scan_pin(p_user uuid, p_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'Only admins can set scan codes.'; end if;
  if coalesce(p_pin, '') !~ '^[0-9]{4}$' then raise exception 'The scan code must be exactly 4 digits.'; end if;
  if exists (select 1 from public.scan_pins s where s.user_id <> p_user and s.pin_hash = crypt(p_pin, s.pin_hash)) then
    raise exception 'That code is already used by another user. Choose different digits.';
  end if;
  insert into public.scan_pins (user_id, pin_hash, set_at, set_by)
  values (p_user, crypt(p_pin, gen_salt('bf', 6)), now(), auth.uid())
  on conflict (user_id) do update set pin_hash = excluded.pin_hash, set_at = now(), set_by = auth.uid();
end $$;

create or replace function public.clear_scan_pin(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only admins can remove scan codes.'; end if;
  delete from public.scan_pins where user_id = p_user;
end $$;

create or replace function public.scan_pin_status()
returns table (user_id uuid, set_at timestamptz) language sql security definer set search_path = public as $$
  select s.user_id, s.set_at from public.scan_pins s where public.is_admin()
$$;

create or replace function public.scan_asset(p_code text, p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_ip text; v_fails int; v_uid uuid; v_name text; v_logo text; a record; hist jsonb;
begin
  v_ip := trim(split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1));
  if v_ip = '' then v_ip := 'unknown'; end if;
  select count(*) into v_fails from public.scan_attempts
   where ip = v_ip and not ok and created_at > now() - interval '15 minutes';
  if v_fails >= 5 then
    return jsonb_build_object('ok', false, 'error', 'locked', 'retry_minutes', 15);
  end if;
  if coalesce(p_pin, '') ~ '^[0-9]{4}$' then
    select s.user_id into v_uid from public.scan_pins s where s.pin_hash = crypt(p_pin, s.pin_hash) limit 1;
  end if;
  if v_uid is null then
    insert into public.scan_attempts (ip, asset_code, ok) values (v_ip, left(p_code, 60), false);
    return jsonb_build_object('ok', false, 'error', 'wrong_code', 'tries_left', greatest(0, 4 - v_fails));
  end if;
  insert into public.scan_attempts (ip, asset_code, ok, user_id) values (v_ip, left(p_code, 60), true, v_uid);
  select * into a from public.assets_computed where lower(asset_code) = lower(trim(p_code)) limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  select coalesce(jsonb_agg(to_jsonb(m) order by m.d desc, m.id desc), '[]'::jsonb) into hist from (
    select id, coalesce(completed_date, scheduled_date) as d, scheduled_date, completed_date, pms_status, maintenance_type,
           breakdown_date, problem, findings, parts_replaced, parts_cost, maintenance_cost, technician, downtime_days, remarks
      from public.maintenance_log_computed where asset_id = a.id
     order by coalesce(completed_date, scheduled_date) desc, id desc limit 30) m;
  select full_name into v_name from public.profiles where id = v_uid;
  select logo_url into v_logo from public.properties where id = a.property_id;
  insert into public.activity_log (table_name, record_id, action, actor_id, new_data, property_id)
  values ('qr_scan', a.id::text, 'scan', v_uid, jsonb_build_object('asset_code', a.asset_code, 'asset_name', a.asset_name), a.property_id);
  return jsonb_build_object(
    'ok', true, 'scanned_by', v_name, 'property_logo', v_logo,
    'asset', jsonb_build_object(
      'asset_code', a.asset_code, 'asset_number', a.asset_number, 'asset_name', a.asset_name,
      'category', a.category, 'sub_category', a.sub_category, 'brand', a.brand, 'model', a.model, 'serial_number', a.serial_number,
      'acquisition_date', a.acquisition_date, 'property_name', a.property_name, 'location', a.location, 'actual_location', a.actual_location,
      'department', a.department, 'assigned_to', a.assigned_to, 'status', a.status, 'condition', a.condition,
      'last_maintenance', a.last_maintenance, 'next_pms_date', a.next_pms_date, 'photo_url', a.photo_url,
      'purchase_cost', a.purchase_cost, 'current_asset_value', a.current_asset_value),
    'history', hist);
end $$;

revoke all on function public.set_scan_pin(uuid, text), public.clear_scan_pin(uuid), public.scan_pin_status() from public, anon;
grant execute on function public.set_scan_pin(uuid, text), public.clear_scan_pin(uuid), public.scan_pin_status() to authenticated;
revoke all on function public.scan_asset(text, text) from public;
grant execute on function public.scan_asset(text, text) to anon, authenticated;
