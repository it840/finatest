alter table public.profiles add column if not exists property_id bigint references public.properties(id) on delete set null;
