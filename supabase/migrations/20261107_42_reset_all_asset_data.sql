-- ONE-TIME DATA RESET (2026-11-07) — do NOT run on a project that has real data.
-- At the owner's request, all asset data was cleared in every property to start fresh:
-- assets, purchase_log, physical_inventory, movement_log, asset_transfers, disposal_log, maintenance_log, activity_log.
-- Kept: properties, users (profiles), lookup lists and settings. Asset IDs restart at Asset-001.
-- A full copy of every cleared table was saved first in the schema backup_before_reset_20261107.
create schema if not exists backup_before_reset_20261107;
create table backup_before_reset_20261107.assets             as select * from public.assets;
create table backup_before_reset_20261107.purchase_log       as select * from public.purchase_log;
create table backup_before_reset_20261107.physical_inventory as select * from public.physical_inventory;
create table backup_before_reset_20261107.movement_log       as select * from public.movement_log;
create table backup_before_reset_20261107.asset_transfers    as select * from public.asset_transfers;
create table backup_before_reset_20261107.disposal_log       as select * from public.disposal_log;
create table backup_before_reset_20261107.maintenance_log    as select * from public.maintenance_log;
create table backup_before_reset_20261107.activity_log       as select * from public.activity_log;
revoke all on schema backup_before_reset_20261107 from anon, authenticated;

truncate table public.purchase_log, public.physical_inventory, public.movement_log, public.asset_transfers,
               public.disposal_log, public.maintenance_log, public.activity_log, public.assets
  restart identity;

alter sequence public.asset_id_seq restart with 1;
