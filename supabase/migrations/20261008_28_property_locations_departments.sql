-- Property-specific Locations and Departments
-- Run this once in Supabase -> SQL Editor.

-- 1) Let each location / department belong to a property (NULL = shared by all)
alter table public.locations   add column if not exists property_id bigint references public.properties(id) on delete set null;
alter table public.departments add column if not exists property_id bigint references public.properties(id) on delete set null;

-- 2) The existing lists were built for Virgin Beach Resort, so tag them to it
update public.locations
   set property_id = (select id from public.properties where name ilike 'Virgin%' order by id limit 1)
 where property_id is null;

update public.departments
   set property_id = (select id from public.properties where name ilike 'Virgin%' order by id limit 1)
 where property_id is null;

-- 3) Z Hostel locations (used for both Location (Home Base) and Actual Location)
insert into public.locations (name, property_id)
select v.name, p.id
from (values
  ('Z Procurement basement'), ('Z Housekeeping basement'), ('Z Maintenance basement'),
  ('Z Lobby'), ('Z Kitchen'), ('Z Front office'), ('Z Cafe'), ('Z Lounge'), ('Z Alfresco'),
  ('Z RD Turf side'), ('Z RD Left side'), ('Z DJ booths'), ('Z Theater'), ('Z Sundeck'),
  ('E&M Building Conference room')
) as v(name)
cross join (select id from public.properties where name ilike 'Z Hostel%' order by id limit 1) p
on conflict (name) do update set property_id = excluded.property_id;

-- 4) Z Hostel departments
insert into public.departments (name, property_id)
select v.name, p.id
from (values
  ('Z Accounting'), ('Z IT'), ('Z Housekeeping'), ('Z Front Office'),
  ('Z F&B Bar'), ('Z F&B Cafe'), ('Z Kitchen'), ('Z HR')
) as v(name)
cross join (select id from public.properties where name ilike 'Z Hostel%' order by id limit 1) p
on conflict (name) do update set property_id = excluded.property_id;

-- 5) Make the API pick up the new column straight away
notify pgrst, 'reload schema';

-- Check: should show 15 Z Hostel locations and 8 Z Hostel departments
select 'locations' as list, p.name as property, count(*) from public.locations l left join public.properties p on p.id = l.property_id group by p.name
union all
select 'departments', p.name, count(*) from public.departments d left join public.properties p on p.id = d.property_id group by p.name;
