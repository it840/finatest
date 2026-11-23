-- Current value fix
-- 1) categories.default_useful_life_years: standard useful life used when an asset has none (editable in Settings > Lookups)
-- 2) assets_computed: corrected straight-line depreciation. Before, the full depreciable amount was charged for every year
--    elapsed (no division by useful life). Now: accumulated = 90% of cost x years elapsed / useful life, capped at 90%;
--    current value = cost - accumulated, never below the 10% salvage value.
--    Useful life = the asset's own (if > 0) else its category's standard; start date = acquisition date else record date.
--    Two columns added at the end: effective_useful_life_years, useful_life_source ('asset' | 'category').
alter table public.categories add column if not exists default_useful_life_years numeric;
update public.categories set default_useful_life_years = case
  when name ilike '%IT / Electronics%'          then 3
  when name ilike '%Office Equipment%'          then 5
  when name ilike '%Furniture%'                 then 7
  when name ilike '%Kitchen Equipment%'         then 7
  when name ilike '%Appliances%'                then 5
  when name ilike '%Tools / Maintenance%'       then 5
  when name ilike '%Vehicles%'                  then 5
  when name ilike '%Housekeeping%'              then 3
  when name ilike '%Safety Equipment%'          then 5
  when name ilike '%Linen%'                     then 2
  when name ilike '%Communication Equipment%'   then 3
  when name ilike '%Audio / Visual%'            then 5
  when name ilike '%Sports%'                    then 5
  else 5 end
where default_useful_life_years is null;

create or replace view public.assets_computed as
 SELECT a.id, a.asset_code, a.asset_name, a.category, a.sub_category, a.brand, a.model, a.serial_number, a.qr_url,
    a.location, a.department, a.assigned_to, a.status, a.condition, a.acquisition_date, a.acquisition_type, a.purchase_cost,
    a.supplier, a.warranty_start, a.warranty_expiry, a.last_maintenance, a.maintenance_frequency_days, a.useful_life_years,
    a.disposal_date, a.disposal_reason, a.remarks, a.registered_qty, a.disposal_qty, a.created_by, a.created_at, a.updated_at,
    a.property_id, a.photo_url, a.actual_location,
    p.name AS property_name,
    CASE WHEN a.last_maintenance IS NOT NULL AND a.maintenance_frequency_days IS NOT NULL
         THEN a.last_maintenance + a.maintenance_frequency_days ELSE NULL::date END AS maintenance_due,
    round(COALESCE(a.purchase_cost, 0::numeric) * 0.10, 2) AS salvage_value,
    CASE WHEN a.purchase_cost IS NOT NULL AND x.life IS NOT NULL
         THEN round(GREATEST(a.purchase_cost * 0.90, 0::numeric) / x.life, 2) ELSE NULL::numeric END AS annual_depreciation,
    CASE WHEN x.start_date IS NOT NULL AND x.life IS NOT NULL
         THEN (x.start_date + make_interval(days => round(x.life * 365.25)::integer))::date ELSE NULL::date END AS end_of_life,
    CASE WHEN a.purchase_cost IS NOT NULL AND x.start_date IS NOT NULL AND x.life IS NOT NULL
         THEN round(LEAST(a.purchase_cost * 0.90,
                          GREATEST(a.purchase_cost * 0.90 * ((CURRENT_DATE - x.start_date)::numeric / 365.25) / x.life, 0::numeric)), 2)
         ELSE NULL::numeric END AS accumulated_depreciation,
    CASE WHEN a.purchase_cost IS NOT NULL AND x.start_date IS NOT NULL AND x.life IS NOT NULL
         THEN GREATEST(round(a.purchase_cost * 0.10, 2),
                       a.purchase_cost - round(LEAST(a.purchase_cost * 0.90,
                          GREATEST(a.purchase_cost * 0.90 * ((CURRENT_DATE - x.start_date)::numeric / 365.25) / x.life, 0::numeric)), 2))
         ELSE NULL::numeric END AS current_asset_value,
    CASE WHEN x.start_date IS NOT NULL AND x.life IS NOT NULL THEN
         CASE WHEN CURRENT_DATE >= (x.start_date + make_interval(days => round(x.life * 365.25)::integer))::date THEN 0::numeric
              ELSE ceil(((x.start_date + make_interval(days => round(x.life * 365.25)::integer))::date - CURRENT_DATE)::numeric / 365.25 * 10::numeric) / 10.0 END
         ELSE NULL::numeric END AS remaining_life_years,
    (COALESCE(a.registered_qty, 0::numeric) + COALESCE(a.disposal_qty, 0::numeric)) * COALESCE(a.purchase_cost, 0::numeric) AS registered_amount,
    a.disposal_qty * COALESCE(a.purchase_cost, 0::numeric) AS disposal_amount,
    a.registered_qty::numeric AS remaining_qty,
    a.registered_qty * COALESCE(a.purchase_cost, 0::numeric) AS remaining_amount,
    a.asset_number,
    x.life AS effective_useful_life_years,
    x.life_source AS useful_life_source
   FROM assets a
     LEFT JOIN properties p ON p.id = a.property_id
     LEFT JOIN categories c ON c.name = a.category
     CROSS JOIN LATERAL (SELECT
         COALESCE(NULLIF(a.useful_life_years, 0::numeric), c.default_useful_life_years) AS life,
         COALESCE(a.acquisition_date, a.created_at::date) AS start_date,
         CASE WHEN NULLIF(a.useful_life_years, 0::numeric) IS NOT NULL THEN 'asset'
              WHEN c.default_useful_life_years IS NOT NULL THEN 'category' END AS life_source) x;
