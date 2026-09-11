create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table if not exists public.sub_categories (
  id bigint generated always as identity primary key,
  category_id bigint not null references public.categories(id) on delete cascade,
  name text not null,
  unique(category_id, name)
);

create table if not exists public.locations (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table if not exists public.departments (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table if not exists public.statuses (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table if not exists public.conditions (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table if not exists public.acquisition_types (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table if not exists public.disposal_reasons (
  id bigint generated always as identity primary key,
  name text not null unique,
  meaning text not null default ''
);

create table if not exists public.movement_types (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table if not exists public.movement_reasons (
  id bigint generated always as identity primary key,
  name text not null unique
);

alter table public.categories enable row level security;
alter table public.sub_categories enable row level security;
alter table public.locations enable row level security;
alter table public.departments enable row level security;
alter table public.statuses enable row level security;
alter table public.conditions enable row level security;
alter table public.acquisition_types enable row level security;
alter table public.disposal_reasons enable row level security;
alter table public.movement_types enable row level security;
alter table public.movement_reasons enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['categories','sub_categories','locations','departments','statuses','conditions','acquisition_types','disposal_reasons','movement_types','movement_reasons']
  loop
    execute format('create policy "%1$s: read all authenticated" on public.%1$s for select using (auth.role() = ''authenticated'');', t);
    execute format('create policy "%1$s: admin write" on public.%1$s for insert with check (public.is_admin());', t);
    execute format('create policy "%1$s: admin update" on public.%1$s for update using (public.is_admin());', t);
    execute format('create policy "%1$s: admin delete" on public.%1$s for delete using (public.is_admin());', t);
  end loop;
end $$;
