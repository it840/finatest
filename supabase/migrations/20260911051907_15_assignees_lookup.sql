create table if not exists public.assignees (
  id bigint generated always as identity primary key,
  name text not null unique
);

alter table public.assignees enable row level security;

create policy "assignees: read all authenticated" on public.assignees for select
  using (auth.role() = 'authenticated');
create policy "assignees: admin insert" on public.assignees for insert
  with check (public.is_admin());
create policy "assignees: admin update" on public.assignees for update
  using (public.is_admin());
create policy "assignees: admin delete" on public.assignees for delete
  using (public.is_admin());

insert into public.assignees (name)
select distinct assigned_to from public.assets where assigned_to is not null and assigned_to <> ''
union
select distinct full_name from public.profiles where full_name is not null and full_name <> ''
on conflict (name) do nothing;
