-- Inter-property asset transfers with QR verification.
-- send -> asset becomes "In Transit"; receive -> asset moves to the new property/location (+ one Movement Log entry);
-- cancel -> asset status is restored. All changes go through the three functions below (no direct table writes),
-- and both send and receive require the asset to be verified (QR scan or typed Asset ID).
insert into public.statuses (name) select 'In Transit' where not exists (select 1 from public.statuses where name = 'In Transit');
insert into public.movement_reasons (name) select 'Inter-Property Transfer' where not exists (select 1 from public.movement_reasons where name = 'Inter-Property Transfer');

create table if not exists public.asset_transfers (
  id bigint generated always as identity primary key,
  asset_id bigint not null references public.assets(id) on delete restrict,
  qty numeric(12,2) not null,
  from_property_id bigint not null references public.properties(id),
  to_property_id bigint not null references public.properties(id),
  status text not null default 'In Transit' check (status in ('In Transit','Received','Cancelled')),
  status_before text,
  from_location text,
  to_location text,
  sent_at timestamptz not null default now(),
  sent_by uuid references public.profiles(id) on delete set null,
  send_verified_method text check (send_verified_method in ('qr','manual')),
  send_verified_at timestamptz,
  send_remarks text,
  received_at timestamptz,
  received_by uuid references public.profiles(id) on delete set null,
  receive_verified_method text check (receive_verified_method in ('qr','manual')),
  receive_verified_at timestamptz,
  receive_remarks text,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete set null,
  cancel_reason text
);
create index if not exists idx_asset_transfers_status on public.asset_transfers(status, to_property_id);
create index if not exists idx_asset_transfers_asset on public.asset_transfers(asset_id);

alter table public.asset_transfers enable row level security;
create policy "asset_transfers: read all authenticated" on public.asset_transfers for select using (auth.role() = 'authenticated');

create or replace view public.asset_transfers_computed as
 select t.id, 'TR-' || lpad(t.id::text, 4, '0') as transfer_code,
        t.asset_id, a.asset_code, a.asset_name, a.brand, a.model, a.serial_number, a.category, a.photo_url,
        t.qty, t.status, t.status_before,
        t.from_property_id, fp.name as from_property_name, t.to_property_id, tp.name as to_property_name,
        t.from_location, t.to_location,
        t.sent_at, sb.full_name as sent_by_name, t.send_verified_method, t.send_verified_at, t.send_remarks,
        t.received_at, rb.full_name as received_by_name, t.receive_verified_method, t.receive_verified_at, t.receive_remarks,
        t.cancelled_at, cb.full_name as cancelled_by_name, t.cancel_reason
   from public.asset_transfers t
   left join public.assets a on a.id = t.asset_id
   left join public.properties fp on fp.id = t.from_property_id
   left join public.properties tp on tp.id = t.to_property_id
   left join public.profiles sb on sb.id = t.sent_by
   left join public.profiles rb on rb.id = t.received_by
   left join public.profiles cb on cb.id = t.cancelled_by;
alter view public.asset_transfers_computed set (security_invoker = true);
grant select on public.asset_transfers_computed to authenticated;

create or replace function public.send_asset_transfer(p_asset_id bigint, p_to_property_id bigint, p_remarks text, p_method text)
returns bigint language plpgsql security definer set search_path = public as $$
declare a record; tid bigint;
begin
  if not public.is_manager_or_admin() then raise exception 'Only managers and admins can send transfers.'; end if;
  if p_method is null or p_method not in ('qr','manual') then raise exception 'Verify the asset first: scan its QR code or enter its Asset ID.'; end if;
  select * into a from public.assets where id = p_asset_id for update;
  if not found then raise exception 'Asset not found.'; end if;
  if a.property_id is null then raise exception 'This asset has no property set.'; end if;
  if a.property_id = p_to_property_id then raise exception 'Choose a different destination property.'; end if;
  if not exists (select 1 from public.properties where id = p_to_property_id) then raise exception 'Destination property not found.'; end if;
  if coalesce(a.registered_qty,0) <= 0 then raise exception 'There is nothing on hand to transfer.'; end if;
  if exists (select 1 from public.asset_transfers where asset_id = p_asset_id and status = 'In Transit') then
    raise exception 'This asset already has a transfer in transit.';
  end if;

  insert into public.asset_transfers (asset_id, qty, from_property_id, to_property_id, status_before, from_location,
                                      sent_by, send_verified_method, send_verified_at, send_remarks)
  values (p_asset_id, a.registered_qty, a.property_id, p_to_property_id, a.status, coalesce(a.actual_location, a.location),
          auth.uid(), p_method, now(), nullif(trim(coalesce(p_remarks,'')), ''))
  returning id into tid;

  update public.assets set status = 'In Transit' where id = p_asset_id;
  return tid;
end $$;

create or replace function public.receive_asset_transfer(p_transfer_id bigint, p_to_location text, p_department text, p_method text, p_remarks text)
returns void language plpgsql security definer set search_path = public as $$
declare t record; from_name text; to_name text; code text;
begin
  if not public.is_manager_or_admin() then raise exception 'Only managers and admins can receive transfers.'; end if;
  if p_method is null or p_method not in ('qr','manual') then raise exception 'Verify the asset first: scan its QR code or enter its Asset ID.'; end if;
  select * into t from public.asset_transfers where id = p_transfer_id for update;
  if not found then raise exception 'Transfer not found.'; end if;
  if t.status <> 'In Transit' then raise exception 'This transfer is already %.', lower(t.status); end if;
  if coalesce(trim(p_to_location),'') = '' then raise exception 'Choose where the asset is going in the receiving property.'; end if;
  if not exists (select 1 from public.locations where name = p_to_location and (property_id is null or property_id = t.to_property_id)) then
    raise exception 'That location does not belong to the receiving property.';
  end if;
  if coalesce(trim(p_department),'') <> '' and not exists (select 1 from public.departments where name = p_department and (property_id is null or property_id = t.to_property_id)) then
    raise exception 'That department does not belong to the receiving property.';
  end if;

  select name into from_name from public.properties where id = t.from_property_id;
  select name into to_name from public.properties where id = t.to_property_id;
  code := 'TR-' || lpad(t.id::text, 4, '0');

  update public.asset_transfers
     set status = 'Received', received_by = auth.uid(), received_at = now(), to_location = p_to_location,
         receive_verified_method = p_method, receive_verified_at = now(),
         receive_remarks = nullif(trim(coalesce(p_remarks,'')), '')
   where id = t.id;

  perform set_config('app.movement_sync', 'on', true);
  update public.assets
     set property_id = t.to_property_id, location = p_to_location, actual_location = p_to_location,
         department = nullif(trim(coalesce(p_department,'')), ''),
         status = case when status = 'In Transit' then coalesce(t.status_before, 'Active') else status end
   where id = t.asset_id;
  perform set_config('app.movement_sync', 'off', true);

  insert into public.movement_log (movement_date, asset_id, movement_type, from_location, to_location, reason, authorized_by, remarks, qty)
  values (current_date, t.asset_id, 'Transfer', t.from_location, p_to_location, 'Inter-Property Transfer', auth.uid(),
          code || ': moved from ' || coalesce(from_name,'?') || ' to ' || coalesce(to_name,'?') || '.', t.qty);
end $$;

create or replace function public.cancel_asset_transfer(p_transfer_id bigint, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare t record;
begin
  if not public.is_manager_or_admin() then raise exception 'Only managers and admins can cancel transfers.'; end if;
  select * into t from public.asset_transfers where id = p_transfer_id for update;
  if not found then raise exception 'Transfer not found.'; end if;
  if t.status <> 'In Transit' then raise exception 'This transfer is already %.', lower(t.status); end if;

  update public.asset_transfers
     set status = 'Cancelled', cancelled_by = auth.uid(), cancelled_at = now(), cancel_reason = nullif(trim(coalesce(p_reason,'')), '')
   where id = t.id;
  update public.assets set status = coalesce(t.status_before, 'Active') where id = t.asset_id and status = 'In Transit';
end $$;

revoke execute on function public.send_asset_transfer(bigint, bigint, text, text) from public, anon;
revoke execute on function public.receive_asset_transfer(bigint, text, text, text, text) from public, anon;
revoke execute on function public.cancel_asset_transfer(bigint, text) from public, anon;
grant execute on function public.send_asset_transfer(bigint, bigint, text, text) to authenticated;
grant execute on function public.receive_asset_transfer(bigint, text, text, text, text) to authenticated;
grant execute on function public.cancel_asset_transfer(bigint, text) to authenticated;
