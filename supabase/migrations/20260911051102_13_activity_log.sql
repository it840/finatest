create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text not null,
  action text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_log_created_at on public.activity_log(created_at desc);
create index if not exists idx_activity_log_table on public.activity_log(table_name);

alter table public.activity_log enable row level security;

create policy "activity_log: manager+admin read" on public.activity_log for select
  using (public.is_manager_or_admin());

revoke insert, update, delete on public.activity_log from anon, authenticated;

create or replace function public.log_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'DELETE' then
    insert into public.activity_log(table_name, record_id, action, actor_id, old_data)
      values (TG_TABLE_NAME, old.id::text, 'delete', auth.uid(), to_jsonb(old));
    return old;
  elsif TG_OP = 'UPDATE' then
    insert into public.activity_log(table_name, record_id, action, actor_id, old_data, new_data)
      values (TG_TABLE_NAME, new.id::text, 'update', auth.uid(), to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.activity_log(table_name, record_id, action, actor_id, new_data)
      values (TG_TABLE_NAME, new.id::text, 'insert', auth.uid(), to_jsonb(new));
    return new;
  end if;
end $$;

revoke execute on function public.log_activity() from anon, authenticated, public;

drop trigger if exists trg_log_assets on public.assets;
create trigger trg_log_assets after insert or update or delete on public.assets
  for each row execute function public.log_activity();

drop trigger if exists trg_log_physical_inventory on public.physical_inventory;
create trigger trg_log_physical_inventory after insert or update or delete on public.physical_inventory
  for each row execute function public.log_activity();

drop trigger if exists trg_log_movement_log on public.movement_log;
create trigger trg_log_movement_log after insert or update or delete on public.movement_log
  for each row execute function public.log_activity();

drop trigger if exists trg_log_profiles on public.profiles;
create trigger trg_log_profiles after update on public.profiles
  for each row execute function public.log_activity();

create or replace view public.activity_log_computed as
select
  a.*,
  p.full_name as actor_name
from public.activity_log a
left join public.profiles p on p.id = a.actor_id;

alter view public.activity_log_computed set (security_invoker = true);
grant select on public.activity_log_computed to authenticated;
