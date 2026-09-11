-- Role enum
do $$ begin
  create type public.app_role as enum ('admin','manager','staff');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'staff',
  department text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.current_role()
returns public.app_role
language sql security definer stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public
as $$ select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false); $$;

create or replace function public.is_manager_or_admin()
returns boolean language sql security definer stable set search_path = public
as $$ select coalesce((select role from public.profiles where id = auth.uid()) in ('admin','manager'), false); $$;

create policy "profiles: self read" on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "profiles: self update basic" on public.profiles for update
  using (auth.uid() = id or public.is_admin());

create policy "profiles: admin insert" on public.profiles for insert
  with check (auth.uid() = id or public.is_admin());

create policy "profiles: admin delete" on public.profiles for delete
  using (public.is_admin());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  is_first boolean;
begin
  select not exists(select 1 from public.profiles) into is_first;
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email),
          case when is_first then 'admin'::public.app_role else 'staff'::public.app_role end)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from anon, authenticated, public;
