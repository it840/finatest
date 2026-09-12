import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const TABLE_LABELS = {
  assets: 'Asset',
  physical_inventory: 'Physical Inventory',
  movement_log: 'Movement Log',
  profiles: 'User',
}

const ACTION_LABELS = { insert: 'Created', update: 'Updated', delete: 'Deleted' }
const ACTION_COLOR = { insert: 'text-success', update: 'text-gold', delete: 'text-danger' }

const DIFF_IGNORE = new Set(['updated_at', 'created_at'])
const PAGE_SIZE = 100

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
  const [rows, setRows] = useState([])
  const [assetMap, setAssetMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [tableFilter, setTableFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  // load the asset id -> code map once
  useEffect(() => {
    supabase.from('assets').select('id, asset_code').then(({ data }) => {
      const map = {}
      ;(data || []).forEach(a => { map[a.id] = a.asset_code })
      setAssetMap(map)
    })
  }, [])

  // reset to page 0 whenever the filter changes
  useEffect(() => { setPage(0) }, [tableFilter])

  useEffect(() => {
    (async () => {
      setLoading(true)
      let query = supabase
        .from('activity_log_computed')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

      if (tableFilter !== 'all') query = query.eq('table_name', tableFilter)

      const { data, count } = await query
      setRows(data || [])
      setTotalCount(count || 0)
      setLoading(false)
    })()
  }, [tableFilter, page])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const rangeStart = totalCount === 0 ? 0 : page * PAGE_SIZE + 1
  const rangeEnd = Math.min(totalCount, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Log History</h1>
      <p className="text-sm text-muted mb-6">Every create, edit, and delete across assets, physical counts, movements, and user roles — most recent first.</p>

      <div className="flex gap-2 mb-6 border-b border-hairline">
        {[['all', 'All'], ['assets', 'Assets'], ['physical_inventory', 'Physical Inventory'], ['movement_log', 'Movement Log'], ['profiles', 'Users']].map(([key, label]) => (
          <button key={key} onClick={() => setTableFilter(key)}
            className={`px-4 py-2 text-sm -mb-px border-b-2 ${tableFilter === key ? 'border-gold text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
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
                <div key={`${r.table_name}-${r.id}`} className="border border-hairline bg-surface rounded px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className={`font-medium ${ACTION_COLOR[r.action]}`}>{ACTION_LABELS[r.action]}</span>
                      {' '}
                      <span className="text-muted">{TABLE_LABELS[r.table_name] || r.table_name}</span>
                      {' — '}
                      <span className="font-medium">{subjectFor(r, assetMap)}</span>
                    </div>
                    <div className="text-xs text-muted whitespace-nowrap">
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
              )
            })}
            {rows.length === 0 && <div className="text-sm text-muted px-4 py-6 text-center border border-hairline rounded bg-surface">No activity yet.</div>}
          </div>

          {totalCount > 0 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-hairline text-sm">
              <span className="text-muted">
                Showing {rangeStart}–{rangeEnd} of {totalCount}
              </span>
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
