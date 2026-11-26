-- PMS repair / maintenance history
-- maintenance_log: breakdown_date (when it broke), problem, parts_replaced (one per line), parts_cost.
-- maintenance_log_computed: + those columns and downtime_days (completed_date - breakdown_date).
-- assets_computed: + maint_history (latest 3 completed / in-progress entries, one line each) and next_pms_date,
--   used by the QR code text ("MAINTENANCE" section).
alter table public.maintenance_log
  add column if not exists breakdown_date date,
  add column if not exists problem text,
  add column if not exists parts_replaced text,
  add column if not exists parts_cost numeric(12,2);

do $$
declare v text;
begin
  v := rtrim(pg_get_viewdef('public.assets_computed'::regclass, true), '; ' || chr(10));
  v := regexp_replace(v, '\s+FROM assets a', ',
    (SELECT string_agg(h.line, chr(10) ORDER BY h.d DESC, h.id DESC) FROM (
       SELECT m.id, COALESCE(m.completed_date, m.scheduled_date) AS d,
              concat_ws('' | '',
                COALESCE(m.completed_date, m.scheduled_date)::text || '' '' || COALESCE(m.maintenance_type, ''Maintenance'')
                  || CASE WHEN upper(m.pms_status) <> ''COMPLETED'' THEN '' ('' || lower(m.pms_status) || '')'' ELSE '''' END,
                CASE WHEN m.breakdown_date IS NOT NULL THEN ''Broke '' || m.breakdown_date END,
                CASE WHEN NULLIF(trim(m.problem), '''') IS NOT NULL THEN ''Problem: '' || trim(m.problem) END,
                CASE WHEN NULLIF(trim(m.parts_replaced), '''') IS NOT NULL THEN ''Parts: '' || regexp_replace(trim(m.parts_replaced), ''\s*\n\s*'', '', '', ''g'') END,
                CASE WHEN NULLIF(trim(m.technician), '''') IS NOT NULL THEN ''By: '' || trim(m.technician) END,
                CASE WHEN m.maintenance_cost IS NOT NULL THEN ''Cost: '' || trim(to_char(m.maintenance_cost, ''FM999,999,990.00'')) END
              ) AS line
         FROM maintenance_log m
        WHERE m.asset_id = a.id AND upper(m.pms_status) IN (''COMPLETED'', ''IN PROGRESS'')
        ORDER BY COALESCE(m.completed_date, m.scheduled_date) DESC, m.id DESC
        LIMIT 3) h) AS maint_history,
    (SELECT min(m.scheduled_date) FROM maintenance_log m
      WHERE m.asset_id = a.id AND upper(m.pms_status) IN (''SCHEDULED'', ''DUE'', ''OVERDUE'')) AS next_pms_date
   FROM assets a');
  execute 'create or replace view public.assets_computed as ' || v;
end $$;

do $$
declare v text;
begin
  v := rtrim(pg_get_viewdef('public.maintenance_log_computed'::regclass, true), '; ' || chr(10));
  v := regexp_replace(v, '\s+FROM maintenance_log ml', ',
    ml.breakdown_date, ml.problem, ml.parts_replaced, ml.parts_cost,
    CASE WHEN ml.breakdown_date IS NOT NULL AND ml.completed_date IS NOT NULL THEN ml.completed_date - ml.breakdown_date END AS downtime_days
   FROM maintenance_log ml');
  execute 'create or replace view public.maintenance_log_computed as ' || v;
end $$;
