-- New quantity model: Reg. Qty = quantity still on hand, Disposed = running total disposed,
-- total ever purchased = Reg. Qty + Disposed. A disposal MOVES quantity from Reg. Qty to Disposed.
-- When nothing is left on hand, the asset's Status and Condition both become "Disposed".
insert into public.conditions (name) values ('Disposed') on conflict (name) do nothing;

-- one-time: move quantities that were already disposed out of Reg. Qty
update public.assets
   set registered_qty = greatest(coalesce(registered_qty,0) - coalesce(disposal_qty,0), 0)
 where coalesce(disposal_qty,0) > 0;

update public.assets
   set condition = 'Disposed', status = 'Disposed'
 where coalesce(registered_qty,0) <= 0 and coalesce(disposal_qty,0) > 0;

CREATE OR REPLACE FUNCTION public.apply_disposal_to_asset()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.asset_id is not null then
    if new.qty > (select coalesce(registered_qty,0) from public.assets where id = new.asset_id) then
      raise exception 'Cannot dispose more than the quantity on hand.';
    end if;

    update public.assets
      set registered_qty = coalesce(registered_qty,0) - new.qty,
          disposal_qty = coalesce(disposal_qty,0) + new.qty,
          disposal_date = new.disposal_date,
          disposal_reason = coalesce(new.disposal_reason, disposal_reason),
          status = case when coalesce(registered_qty,0) - new.qty <= 0 then 'Disposed' else status end,
          condition = case when coalesce(registered_qty,0) - new.qty <= 0 then 'Disposed' else condition end
      where id = new.asset_id;
  end if;
  return new;
end $function$;

-- assets_computed keeps its meaning for the Dashboard and Reports:
--   registered_amount = value of everything ever purchased ((on hand + disposed) x cost)
--   remaining_qty / remaining_amount = what is on hand
-- (the view's other columns are unchanged; see migration 36 / earlier migrations for the full definition)
-- registered_amount : (COALESCE(a.registered_qty,0) + COALESCE(a.disposal_qty,0)) * COALESCE(a.purchase_cost, 0)
-- remaining_qty     : a.registered_qty::numeric
-- remaining_amount  : a.registered_qty * COALESCE(a.purchase_cost, 0)
