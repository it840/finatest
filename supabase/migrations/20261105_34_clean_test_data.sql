-- ONE-TIME, DATA-SPECIFIC cleanup for the original installation (skip this on a fresh project).
-- Removed 4 test assets (ids 23,24,25,27 = Asset-016 "123", Asset-017 "Test", Asset-018 "123",
-- Asset-020 "Final") with their purchase / count / movement rows, plus broken history rows:
-- movements whose asset no longer existed, movements where From = To, and one maintenance entry
-- with no asset. Everything removed was first copied into the backup_test_cleanup schema.
create schema if not exists backup_test_cleanup;

create table backup_test_cleanup.assets             as select * from public.assets             where id in (23,24,25,27);
create table backup_test_cleanup.purchase_log       as select * from public.purchase_log       where asset_id in (23,24,25,27);
create table backup_test_cleanup.physical_inventory as select * from public.physical_inventory where asset_id in (23,24,25,27);
create table backup_test_cleanup.movement_log       as select * from public.movement_log
  where asset_id in (23,24,25,27) or asset_id is null or from_location is not distinct from to_location;
create table backup_test_cleanup.maintenance_log    as select * from public.maintenance_log    where asset_id is null;

revoke all on schema backup_test_cleanup from anon, authenticated;

delete from public.purchase_log       where asset_id in (23,24,25,27);
delete from public.physical_inventory where asset_id in (23,24,25,27);
delete from public.movement_log       where asset_id in (23,24,25,27);
delete from public.assets             where id in (23,24,25,27);

delete from public.movement_log where asset_id is null or from_location is not distinct from to_location;
delete from public.maintenance_log where asset_id is null;
