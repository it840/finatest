-- Ensures deleting a user account never fails or silently blocks just
-- because that person created assets, verified counts, authorized
-- movements, or appears in the activity log. Historical records are kept;
-- the user reference just becomes null.
alter table public.assets drop constraint assets_created_by_fkey;
alter table public.assets add constraint assets_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.physical_inventory drop constraint physical_inventory_verified_by_fkey;
alter table public.physical_inventory add constraint physical_inventory_verified_by_fkey
  foreign key (verified_by) references public.profiles(id) on delete set null;

alter table public.movement_log drop constraint movement_log_authorized_by_fkey;
alter table public.movement_log add constraint movement_log_authorized_by_fkey
  foreign key (authorized_by) references public.profiles(id) on delete set null;

alter table public.activity_log drop constraint activity_log_actor_id_fkey;
alter table public.activity_log add constraint activity_log_actor_id_fkey
  foreign key (actor_id) references public.profiles(id) on delete set null;
