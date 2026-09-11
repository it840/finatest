import React, { useState, useRef } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'

const ASSET_IMPORT_COLUMNS = [
  'asset_code', 'asset_name', 'category', 'sub_category', 'brand', 'model', 'serial_number',
  'location', 'department', 'assigned_to', 'status', 'condition', 'acquisition_date',
  'acquisition_type', 'purchase_cost', 'supplier', 'warranty_start', 'warranty_expiry',
  'last_maintenance', 'maintenance_frequency_days', 'useful_life_years', 'disposal_date',
  'disposal_reason', 'remarks', 'registered_qty', 'disposal_qty',
]

function download(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function ExportBlock({ title, description, table, filename }) {
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    const { data, error } = await supabase.from(table).select('*')
    setBusy(false)
    if (error) { alert(error.message); return }
    download(filename, Papa.unparse(data || []))
  }
  return (
    <div className="border border-hairline bg-surface rounded p-4">
      <h3 className="font-medium text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted mb-3">{description}</p>
      <button onClick={run} disabled={busy} className="px-3 py-2 text-sm bg-ink text-paper rounded hover:bg-ink/90 disabled:opacity-50">
        {busy ? 'Exporting…' : 'Export CSV'}
      </button>
    </div>
  )
}

function ImportBlock() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const downloadTemplate = () => {
    const sample = {
      asset_code: '', asset_name: 'Sample Chair', category: '🪑 Furniture', sub_category: 'Office Chair',
      brand: '', model: '', serial_number: '', location: 'Warehouse', department: 'Procurement',
      assigned_to: '', status: 'Active', condition: 'Good', acquisition_date: '2026-01-01',
      acquisition_type: 'Purchase', purchase_cost: 5000, supplier: '', warranty_start: '',
      warranty_expiry: '', last_maintenance: '', maintenance_frequency_days: '', useful_life_years: 5,
      disposal_date: '', disposal_reason: '', remarks: '', registered_qty: 1, disposal_qty: 0,
    }
    download('asset_import_template.csv', Papa.unparse([sample], { columns: ASSET_IMPORT_COLUMNS }))
  }

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setError(''); setResult(null)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        try {
          const rows = res.data.map(r => {
            const row = {}
            ASSET_IMPORT_COLUMNS.forEach(col => {
              let v = r[col]
              if (v === undefined || v === '') { row[col] = null; return }
              if (['purchase_cost', 'maintenance_frequency_days', 'useful_life_years', 'registered_qty', 'disposal_qty'].includes(col)) {
                row[col] = Number(v)
              } else {
                row[col] = v
              }
            })
            if (!row.asset_code) delete row.asset_code // let DB auto-generate
            return row
          }).filter(r => r.asset_name)

          if (rows.length === 0) throw new Error('No valid rows found. Make sure the CSV has an "asset_name" column with values.')

          const withCode = rows.filter(r => r.asset_code)
          const withoutCode = rows.filter(r => !r.asset_code)

          let upserted = 0, inserted = 0
          if (withCode.length) {
            const { error, count } = await supabase.from('assets').upsert(withCode, { onConflict: 'asset_code' }).select('id')
            if (error) throw error
            upserted = withCode.length
          }
          if (withoutCode.length) {
            const { error } = await supabase.from('assets').insert(withoutCode).select('id')
            if (error) throw error
            inserted = withoutCode.length
          }
          setResult(`Imported ${upserted + inserted} rows (${upserted} matched by Asset ID, ${inserted} new).`)
        } catch (err) {
          setError(err.message || 'Import failed.')
        } finally {
          setBusy(false)
          if (inputRef.current) inputRef.current.value = ''
        }
      },
      error: (err) => { setBusy(false); setError(err.message) },
    })
  }

  return (
    <div className="border border-hairline bg-surface rounded p-4">
      <h3 className="font-medium text-sm mb-1">Import Assets</h3>
      <p className="text-xs text-muted mb-3">
        Upload a CSV with an <code>asset_name</code> column at minimum. Rows with a matching <code>asset_code</code> update
        the existing asset; rows without one are added as new assets. Works with files exported from Excel, Google Sheets, or Numbers.
      </p>
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => inputRef.current?.click()} disabled={busy}
          className="px-3 py-2 text-sm bg-ink text-paper rounded hover:bg-ink/90 disabled:opacity-50">
          {busy ? 'Importing…' : 'Choose CSV File'}
        </button>
        <button onClick={downloadTemplate} type="button" className="text-sm text-gold underline">
          Download template
        </button>
        <input ref={inputRef} type="file" accept=".csv" onChange={onFile} className="hidden" />
      </div>
      {result && <div className="text-sm text-success mt-2">{result}</div>}
      {error && <div className="text-sm text-danger mt-2">{error}</div>}
    </div>
  )
}

export default function ImportExportPanel() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-display text-lg mb-3">Export</h2>
        <div className="grid grid-cols-3 gap-4">
          <ExportBlock title="Asset Database" description="All assets with computed depreciation, current value, and maintenance fields."
            table="assets_computed" filename="asset_database.csv" />
          <ExportBlock title="Physical Inventory" description="Every physical count logged, with discrepancy results."
            table="physical_inventory_computed" filename="physical_inventory.csv" />
          <ExportBlock title="Movement Log" description="Every recorded asset transfer, assignment, and return."
            table="movement_log_computed" filename="movement_log.csv" />
        </div>
      </div>
      <div>
        <h2 className="font-display text-lg mb-3">Import</h2>
        <ImportBlock />
      </div>
    </div>
  )
}
