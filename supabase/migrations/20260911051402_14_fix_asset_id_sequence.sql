-- Keeps the Asset ID auto-numbering sequence in sync with the highest
-- existing asset_code, so newly generated codes never collide with
-- manually-seeded or imported ones.
select setval(
  'public.asset_id_seq',
  greatest(
    (select coalesce(max(substring(asset_code from '[0-9]+$')::int), 0) from public.assets),
    1
  )
);
