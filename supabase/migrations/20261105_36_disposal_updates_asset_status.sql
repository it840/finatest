-- A disposal entry now also sets the asset's Status to "Disposed" once nothing is left
-- (registered qty minus total disposed qty <= 0). Partial disposals leave the status alone.
CREATE OR REPLACE FUNCTION public.apply_disposal_to_asset()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.asset_id is not null then
    update public.assets
      set disposal_qty = coalesce(disposal_qty,0) + new.qty,
          disposal_date = new.disposal_date,
          disposal_reason = coalesce(new.disposal_reason, disposal_reason),
          status = case
                     when coalesce(registered_qty,0) - (coalesce(disposal_qty,0) + new.qty) <= 0 then 'Disposed'
                     else status
                   end
      where id = new.asset_id;
  end if;
  return new;
end $function$;

-- bring existing fully-disposed assets in line
update public.assets
   set status = 'Disposed'
 where coalesce(disposal_qty,0) >= coalesce(registered_qty,0)
   and coalesce(registered_qty,0) > 0
   and status is distinct from 'Disposed';
