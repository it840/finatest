-- Email shown in Settings > Users. Copied from the sign-in account (auth.users) and kept in sync.
-- Profiles are readable only by the person themself or an admin, so emails are not exposed to other staff.
alter table public.profiles add column if not exists email text;

update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is distinct from u.email;

create or replace function public.profile_fill_email()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if new.email is null then
    select email into new.email from auth.users where id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists trg_profile_fill_email on public.profiles;
create trigger trg_profile_fill_email before insert on public.profiles
  for each row execute function public.profile_fill_email();

create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  update public.profiles set email = new.email where id = new.id and email is distinct from new.email;
  return new;
end $$;
drop trigger if exists trg_sync_profile_email on auth.users;
create trigger trg_sync_profile_email after insert or update of email on auth.users
  for each row execute function public.sync_profile_email();

revoke execute on function public.profile_fill_email() from public, anon, authenticated;
revoke execute on function public.sync_profile_email() from public, anon, authenticated;
