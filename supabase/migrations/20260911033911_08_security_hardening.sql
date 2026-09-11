-- (Folded into the relevant table/view migrations above via security_invoker.)
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
