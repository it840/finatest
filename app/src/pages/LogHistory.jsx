import React, { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import { useProperty } from '../lib/PropertyContext'

const TABLE_LABELS = {
  assets: 'Asset',
  physical_inventory: 'Physical Inventory',
  movement_log: 'Movement Log',
  profiles: 'User',
}

const ACTION_LABELS = { insert: 'Created', update: 'Updated', delete: 'Deleted' }
const ACTION_COLOR = { insert: 'text-success', update: 'text-gold', delete: 'text-danger' }
const ACTION_BG = { insert: 'bg-success/10', update: 'bg-gold/10', delete: 'bg-danger/10' }

const svgProps = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
const ACTION_ICONS = {
  insert: (<svg width="14" height="14" viewBox="0 0 20 20" {...svgProps}><path d="M10 4v12M4 10h12" /></svg>),
  update: (<svg width="14" height="14" viewBox="0 0 20 20" {...svgProps}><path d="M13.2 3.8a3 3 0 00-4 3.6L3.8 13a1.6 1.6 0 002.3 2.3l5.6-5.4a3 3 0 003.6-4l-2 2-1.7-.5-.5-1.7 2.1-2.1z" /></svg>),
  delete: (<svg width="14" height="14" viewBox="0 0 20 20" {...svgProps}><path d="M4.5 6h11l-.8 10.2a1.5 1.5 0 01-1.5 1.3H6.8a1.5 1.5 0 01-1.5-1.3L4.5 6z" /><path d="M7.5 3.5h5a1 1 0 011 1V6h-7V4.5a1 1 0 011-1z" /><path d="M8.3 9v5M11.7 9v5" /></svg>),
}
const TABLE_ICONS = {
  assets: (<svg width="13" height="13" viewBox="0 0 20 20" {...svgProps}><path d="M10 2.5l7 3.75v7.5L10 17.5l-7-3.75v-7.5L10 2.5z" /></svg>),
  physical_inventory: (<svg width="13" height="13" viewBox="0 0 20 20" {...svgProps}><rect x="4" y="3.5" width="12" height="14" rx="1.5" /><path d="M7 10.5l1.8 1.8L13 8.3" /></svg>),
  movement_log: (<svg width="13" height="13" viewBox="0 0 20 20" {...svgProps}><path d="M3 6.5h11.5M14.5 6.5L11.5 3.5M14.5 6.5l-3 3" /><path d="M17 13.5H5.5M5.5 13.5l3-3M5.5 13.5l3 3" /></svg>),
  profiles: (<svg width="13" height="13" viewBox="0 0 20 20" {...svgProps}><circle cx="10" cy="6.5" r="3" /><path d="M3.5 17c1-3.2 3.7-5 6.5-5s5.5 1.8 6.5 5" /></svg>),
}
const DOWNLOAD_ICON = (<svg width="14" height="14" viewBox="0 0 20 20" {...svgProps}><path d="M10 3v10M6.5 9.5L10 13l3.5-3.5" /><path d="M4 15.5h12" /></svg>)

const DIFF_IGNORE = new Set(['updated_at', 'created_at'])
const PAGE_SIZE_OPTIONS = [30, 40, 50, 100]

function subjectFor(row, assetMap) {
  const d = row.new_data || row.old_data || {}
  if (row.table_name === 'assets') return `${d.asset_code || ''} — ${d.asset_name || ''}`.trim()
  if (row.table_name === 'physical_inventory') {
    const code = assetMap[d.asset_id]
    return code ? `${code} count` : `Asset #${d.asset_id ?? '?'} count`
  }
  if (row.table_name === 'movement_log') {
    const code = assetMap[d.asset_id]
    return code ? `${code} movement` : `Asset #${d.asset_id ?? '?'} movement`
  }
  if (row.table_name === 'profiles') return d.full_name || 'User'
  return row.record_id
}

function diffFields(row) {
  if (row.action !== 'update' || !row.old_data || !row.new_data) return []
  const changed = []
  const keys = new Set([...Object.keys(row.old_data), ...Object.keys(row.new_data)])
  keys.forEach(k => {
    if (DIFF_IGNORE.has(k)) return
    const before = row.old_data[k]
    const after = row.new_data[k]
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changed.push({ field: k, before, after })
    }
  })
  return changed
}

export default function LogHistory() {
  const { currentPropertyId, currentProperty } = useProperty()
  const [rows, setRows] = useState([])
  const [assetMap, setAssetMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [tableFilter, setTableFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(30)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    supabase.from('assets').select('id, asset_code').then(({ data }) => {
      const map = {}
      ;(data || []).forEach(a => { map[a.id] = a.asset_code })
      setAssetMap(map)
    })
  }, [])

  useEffect(() => { setPage(0) }, [tableFilter, pageSize, currentPropertyId])

  const buildQuery = () => {
    let query = supabase.from('activity_log_computed').select('*', { count: 'exact' }).order('created_at', { ascending: false })
    if (tableFilter !== 'all') query = query.eq('table_name', tableFilter)
    if (currentPropertyId !== 'all') query = query.eq('property_id', currentPropertyId)
    return query
  }

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data, count } = await buildQuery().range(page * pageSize, page * pageSize + pageSize - 1)
      setRows(data || [])
      setTotalCount(count || 0)
      setLoading(false)
    })()
  }, [tableFilter, page, pageSize, currentPropertyId])

  const exportAll = async () => {
    setExporting(true)
    const { data } = await buildQuery()
    setExporting(false)
    const out = (data || []).map(r => {
      const changes = diffFields(r)
      return {
        date: new Date(r.created_at).toLocaleString(),
        action: ACTION_LABELS[r.action],
        table: TABLE_LABELS[r.table_name] || r.table_name,
        subject: subjectFor(r, assetMap),
        actor: r.actor_name || 'Unknown',
        changes: changes.map(c => `${c.field}: ${c.before ?? '—'} → ${c.after ?? '—'}`).join('; '),
      }
    })
    const blob = new Blob([Papa.unparse(out)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `log_history_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const rangeStart = totalCount === 0 ? 0 : page * pageSize + 1
  const rangeEnd = Math.min(totalCount, page * pageSize + pageSize)

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
        <h1 className="font-display text-2xl">Log History</h1>
        <button onClick={exportAll} disabled={exporting || totalCount === 0}
          className="flex items-center gap-2 px-3.5 py-2 text-sm rounded-md border border-hairline bg-surface hover:bg-hairline/20 transition-colors disabled:opacity-50">
          {DOWNLOAD_ICON} {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>
      <p className="text-sm text-muted mb-6">
        {currentPropertyId === 'all' ? 'All properties' : currentProperty?.name} · Every create, edit, and delete across assets, physical counts, movements, and user roles — most recent first.
      </p>

      <div className="flex gap-2 mb-6 border-b border-hairline flex-wrap">
        {[['all', 'All', null], ['assets', 'Assets', 'assets'], ['physical_inventory', 'Physical Inventory', 'physical_inventory'], ['movement_log', 'Movement Log', 'movement_log'], ['profiles', 'Users', 'profiles']].map(([key, label, iconKey]) => (
          <button key={key} onClick={() => setTableFilter(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${tableFilter === key ? 'border-gold text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
            {iconKey && <span className={tableFilter === key ? 'text-gold' : ''}>{TABLE_ICONS[iconKey]}</span>}
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-muted text-sm">Loading log history…</div>
      ) : (
        <>
          <div className="space-y-2">
            {rows.map(r => {
              const changes = diffFields(r)
              return (
                <div key={`${r.table_name}-${r.id}`} className="border border-hairline bg-surface rounded-lg px-4 py-3 flex gap-3 shadow-[0_1px_2px_rgba(20,43,39,0.03)]">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${ACTION_BG[r.action]} ${ACTION_COLOR[r.action]}`}>
                    {ACTION_ICONS[r.action]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-sm gap-3">
                      <div className="min-w-0 truncate">
                        <span className={`font-medium ${ACTION_COLOR[r.action]}`}>{ACTION_LABELS[r.action]}</span>
                        {' '}
                        <span className="text-muted">{TABLE_LABELS[r.table_name] || r.table_name}</span>
                        {' — '}
                        <span className="font-medium">{subjectFor(r, assetMap)}</span>
                      </div>
                      <div className="text-xs text-muted whitespace-nowrap flex-shrink-0">
                        {new Date(r.created_at).toLocaleString()} · {r.actor_name || 'Unknown'}
                      </div>
                    </div>
                    {changes.length > 0 && (
                      <ul className="mt-2 text-xs text-muted space-y-0.5">
                        {changes.map(c => (
                          <li key={c.field}>
                            <span className="text-ink">{c.field}</span>: {String(c.before ?? '—')} → {String(c.after ?? '—')}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )
            })}
            {rows.length === 0 && <div className="text-sm text-muted px-4 py-6 text-center border border-hairline rounded bg-surface">No activity yet.</div>}
          </div>

          {totalCount > 0 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-hairline text-sm flex-wrap gap-3">
              <div className="flex items-center gap-3 text-muted">
                <span>Showing {rangeStart}–{rangeEnd} of {totalCount}</span>
                <label className="flex items-center gap-1.5">
                  <span>Per page</span>
                  <select
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                    className="border border-hairline rounded px-2 py-1 text-sm bg-surface focus:outline-none focus:ring-1 focus:ring-gold"
                  >
                    {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded border border-hairline hover:bg-hairline/20 disabled:opacity-40 disabled:cursor-not-allowed">
                  Previous
                </button>
                <span className="text-muted">Page {page + 1} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 rounded border border-hairline hover:bg-hairline/20 disabled:opacity-40 disabled:cursor-not-allowed">
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
