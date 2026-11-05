-- Every new asset (Purchase / Add Asset) writes a Purchase Log entry automatically.
-- A purchase entry made for a brand-new asset must not add its qty to the asset a second time,
-- so the asset trigger sets app.purchase_sync and apply_purchase_to_asset() skips its top-up.
CREATE OR REPLACE FUNCTION public.apply_purchase_to_asset()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(current_setting('app.purchase_sync', true), 'off') = 'on' then
    return new;
  end if;
  if new.asset_id is not null then
    update public.assets set registered_qty = coalesce(registered_qty,0) + new.qty where id = new.asset_id;
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.log_asset_purchase()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform set_config('app.purchase_sync', 'on', true);
  insert into public.purchase_log (purchase_date, asset_id, qty, unit_cost, supplier, acquisition_type, remarks, logged_by)
  values (coalesce(new.acquisition_date, current_date), new.id, coalesce(new.registered_qty, 1), new.purchase_cost,
          nullif(new.supplier, ''), nullif(new.acquisition_type, ''), nullif(new.remarks, ''), auth.uid());
  perform set_config('app.purchase_sync', 'off', true);
  return new;
end $function$;

drop trigger if exists trg_asset_purchase_entry on public.assets;
create trigger trg_asset_purchase_entry after insert on public.assets
  for each row execute function public.log_asset_purchase();
revoke execute on function public.log_asset_purchase() from anon, authenticated, public;
