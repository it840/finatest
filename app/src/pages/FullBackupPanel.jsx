import React, { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

// Every table in the database, in a sensible restore order (lookups first, history last).
const TABLES = [
  'properties', 'profiles',
  'categories', 'sub_categories', 'locations', 'departments', 'statuses', 'conditions',
  'acquisition_types', 'disposal_reasons', 'movement_types', 'movement_reasons',
  'assignees', 'maintenance_types', 'pms_statuses',
  'assets', 'purchase_log', 'physical_inventory', 'movement_log', 'asset_transfers', 'disposal_log', 'maintenance_log',
  'activity_log',
]
const PAGE = 1000

function download(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

async function readTable(table) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(table).select('*').range(from, from + PAGE - 1)
    let res = await q.order('id', { ascending: true })
    if (res.error) res = await supabase.from(table).select('*').range(from, from + PAGE - 1) // table without an id column
    if (res.error) throw new Error(`${table}: ${res.error.message}`)
    rows.push(...res.data)
    if (res.data.length < PAGE) break
  }
  return rows
}

// Excel cells only hold text/numbers, so structured values (jsonb) are written as JSON text.
function sheetRows(rows) {
  return rows.map(r => {
    const o = {}
    Object.keys(r).forEach(k => {
      const v = r[k]
      o[k] = v !== null && typeof v === 'object' ? JSON.stringify(v).slice(0, 32000) : v
    })
    return o
  })
}

export default function FullBackupPanel() {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [counts, setCounts] = useState(null)

  const run = async (kind) => {
    setBusy(true); setError(''); setCounts(null)
    try {
      const data = {}
      for (let i = 0; i < TABLES.length; i++) {
        setProgress(`Reading ${TABLES[i]} (${i + 1} of ${TABLES.length})…`)
        data[TABLES[i]] = await readTable(TABLES[i])
      }
      setProgress('Building file…')
      const day = new Date().toISOString().slice(0, 10)

      if (kind === 'xlsx') {
        const wb = XLSX.utils.book_new()
        const summary = TABLES.map(t => ({ table: t, rows: data[t].length }))
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ exported: new Date().toISOString() }, ...[]]), 'About')
        XLSX.utils.sheet_add_json(wb.Sheets['About'], summary, { origin: 'A3' })
        TABLES.forEach(t => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetRows(data[t])), t.slice(0, 31)))
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        download(`asset_registry_backup_${day}.xlsx`, new Blob([buf], { type: 'application/octet-stream' }))
      } else {
        const payload = { exported_at: new Date().toISOString(), tables: data }
        download(`asset_registry_backup_${day}.json`, new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
      }
      setCounts(TABLES.map(t => [t, data[t].length]))
      setProgress('')
    } catch (e) {
      setError(e.message || 'Backup failed.')
      setProgress('')
    }
    setBusy(false)
  }

  return (
    <div className="space-y-3 max-w-3xl">
      <h2 className="font-display text-lg">Full database backup</h2>
      <div className="border border-hairline bg-surface rounded-lg p-4">
        <p className="text-sm text-muted mb-3">
          Downloads every table — assets, purchases, counts, movements, asset transfers, disposals, maintenance, the full activity history, users' names and roles, and every lookup list —
          as one file. Use <b>Excel</b> to read or share it, or <b>JSON</b> to keep an exact copy for restoring.
          Photo files stay in storage (their links are included), and passwords are never part of a backup.
        </p>
        <div className="flex gap-3 flex-wrap items-center">
          <button disabled={busy} onClick={() => run('xlsx')} className="px-4 py-2 text-sm bg-theme-accent text-white rounded hover:bg-theme-accent/90 disabled:opacity-50">
            Download Excel (.xlsx)
          </button>
          <button disabled={busy} onClick={() => run('json')} className="px-4 py-2 text-sm border border-hairline rounded hover:bg-theme-hover disabled:opacity-50">
            Download JSON
          </button>
          {progress && <span className="text-sm text-muted">{progress}</span>}
        </div>
        {error && <div className="text-sm text-danger mt-3">{error}</div>}
        {counts && (
          <div className="mt-4 border-t border-hairline pt-3">
            <div className="text-sm font-medium mb-2">Backed up {counts.reduce((s, [, n]) => s + n, 0).toLocaleString()} rows from {counts.length} tables</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-xs text-muted">
              {counts.map(([t, n]) => <div key={t} className="flex justify-between"><span>{t}</span><span>{n}</span></div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
