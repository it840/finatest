-- One-time backfill: give every asset that existed before migration 32 a Purchase Log entry
-- for the quantity not already covered by earlier entries. Does not change any asset quantity,
-- and the activity-log trigger is paused so no noise is written to Log History.
alter table public.purchase_log disable trigger trg_log_purchase_log;
select set_config('app.purchase_sync', 'on', true);

insert into public.purchase_log (purchase_date, asset_id, qty, unit_cost, supplier, acquisition_type, remarks)
select coalesce(a.acquisition_date, a.created_at::date), a.id,
       a.registered_qty - coalesce(p.logged, 0),
       a.purchase_cost, nullif(a.supplier,''), nullif(a.acquisition_type,''), nullif(a.remarks,'')
  from public.assets a
  left join (select asset_id, sum(qty) as logged from public.purchase_log group by asset_id) p on p.asset_id = a.id
 where a.registered_qty - coalesce(p.logged, 0) > 0;

select set_config('app.purchase_sync', 'off', true);
alter table public.purchase_log enable trigger trg_log_purchase_log;
