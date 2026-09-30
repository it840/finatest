import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProperty } from '../lib/PropertyContext'
import Pagination from '../components/Pagination'

function peso(n) { return n === null || n === undefined ? '—' : '₱' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }) }

const STATUS_COLOR = {
  SCHEDULED: 'text-muted', DUE: 'text-gold', OVERDUE: 'text-danger',
  'IN PROGRESS': 'text-gold', COMPLETED: 'text-success', CANCELLED: 'text-muted',
}

const EMPTY = { asset_id: '', scheduled_date: '', pms_status: 'SCHEDULED', maintenance_type: '', technician: '', findings: '', maintenance_cost: '', remarks: '' }

export default function MaintenanceLog({ profile }) {
  const canWrite = profile?.role === 'admin' || profile?.role === 'manager'
  const { currentPropertyId, currentProperty } = useProperty()
  const [rows, setRows] = useState([])
  const [assets, setAssets] = useState([])
  const [types, setTypes] = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(30)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const load = async () => {
    setLoading(true)
    const [ml, a, t, s] = await Promise.all([
      supabase.from('maintenance_log_computed').select('*').order('scheduled_date', { ascending: false }),
      supabase.from('assets_computed').select('id, asset_code, asset_name, category, sub_category, brand, model, serial_number, location, actual_location, department, assigned_to, status, condition, last_maintenance, maintenance_due, property_id'),
      supabase.from('maintenance_types').select('*').order('name'),
      supabase.from('pms_statuses').select('*').order('name'),
    ])
    setRows(ml.data || [])
    setAssets(a.data || [])
    setTypes(t.data || [])
    setStatuses(s.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const scopedAssets = currentPropertyId === 'all' ? assets : assets.filter(a => a.property_id === currentPropertyId)
  const selectedAsset = assets.find(a => String(a.id) === String(form.asset_id))
  const scopedRows = currentPropertyId === 'all' ? rows : rows.filter(r => r.property_id === currentPropertyId)

  const filteredRows = scopedRows.filter(r =>
    (!query || [r.asset_code, r.asset_name, r.technician, r.category, r.sub_category, r.brand, r.model, r.serial_number, r.department, r.assigned_to].filter(Boolean).some(v => v.toLowerCase().includes(query.toLowerCase()))) &&
    (!statusFilter || r.pms_status === statusFilter)
  )

  useEffect(() => { setPage(0) }, [currentPropertyId, query, statusFilter])
  const pageRows = filteredRows.slice(page * pageSize, page * pageSize + pageSize)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    const { error } = await supabase.from('maintenance_log').insert({
      asset_id: Number(form.asset_id),
      scheduled_date: form.scheduled_date || new Date().toISOString().slice(0, 10),
      pms_status: form.pms_status,
      maintenance_type: form.maintenance_type || null,
      technician: form.technician || null,
      findings: form.findings || null,
      maintenance_cost: form.maintenance_cost === '' ? null : Number(form.maintenance_cost),
      remarks: form.remarks || null,
      logged_by: profile?.id,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    setForm(EMPTY)
    load()
  }

  if (loading) return <div className="text-muted text-sm">Loading maintenance log…</div>

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Preventive Maintenance (PMS)</h1>
      <p className="text-sm text-muted mb-1">
        {currentPropertyId === 'all' ? 'All properties' : currentProperty?.name} · Schedule and track maintenance work. Marking an entry Completed updates the asset's Last Maintenance date.
      </p>
      <p className="text-sm text-muted mb-6">{filteredRows.length} of {scopedRows.length} entries shown</p>

      {canWrite ? (
        <form onSubmit={submit} className="border border-hairline bg-surface rounded p-5 mb-8 grid grid-cols-3 gap-4 items-end">
        <label className="block">
          <span className="block text-xs text-muted mb-1">Asset</span>
          <select required value={form.asset_id} onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))} className="input">
            <option value="">Select asset…</option>
            {scopedAssets.map(a => <option key={a.id} value={a.id}>{a.asset_code} — {a.asset_name}</option>)}
          </select>
        </label>

        {selectedAsset && (
          <div className="col-span-3 -mt-1 mb-1 grid grid-cols-6 gap-x-4 gap-y-2 text-xs border border-hairline rounded p-3 bg-paper">
            <div><span className="text-muted block">Category</span>{selectedAsset.category || '—'}</div>
            <div><span className="text-muted block">Sub-Category</span>{selectedAsset.sub_category || '—'}</div>
            <div><span className="text-muted block">Brand</span>{selectedAsset.brand || '—'}</div>
            <div><span className="text-muted block">Model</span>{selectedAsset.model || '—'}</div>
            <div><span className="text-muted block">Serial</span>{selectedAsset.serial_number || '—'}</div>
            <div><span className="text-muted block">Location</span>{selectedAsset.location || '—'}</div>
            <div><span className="text-muted block">Actual Location</span>{selectedAsset.actual_location || '—'}</div>
            <div><span className="text-muted block">Department</span>{selectedAsset.department || '—'}</div>
            <div><span className="text-muted block">Assigned To</span>{selectedAsset.assigned_to || '—'}</div>
            <div><span className="text-muted block">Asset Status</span>{selectedAsset.status || '—'}</div>
            <div><span className="text-muted block">Condition</span>{selectedAsset.condition || '—'}</div>
            <div><span className="text-muted block">Last Maintenance</span>{selectedAsset.last_maintenance || '—'}</div>
          </div>
        )}
        <label className="block">
          <span className="block text-xs text-muted mb-1">Date</span>
          <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} className="input" />
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">PMS Status</span>
          <select value={form.pms_status} onChange={e => setForm(f => ({ ...f, pms_status: e.target.value }))} className="input">
            {statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Maintenance Type</span>
          <select value={form.maintenance_type} onChange={e => setForm(f => ({ ...f, maintenance_type: e.target.value }))} className="input">
            <option value="">—</option>
            {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Technician / Service Provider</span>
          <input value={form.technician} onChange={e => setForm(f => ({ ...f, technician: e.target.value }))} className="input" />
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Maintenance Cost</span>
          <input type="number" step="0.01" value={form.maintenance_cost} onChange={e => setForm(f => ({ ...f, maintenance_cost: e.target.value }))} className="input" />
        </label>
        <label className="block col-span-2">
          <span className="block text-xs text-muted mb-1">Action Taken / Findings</span>
          <input value={form.findings} onChange={e => setForm(f => ({ ...f, findings: e.target.value }))} className="input" />
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Remarks</span>
          <input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} className="input" />
        </label>
        <div className="col-span-3">
          {error && <div className="text-sm text-danger mb-2">{error}</div>}
          <button disabled={saving} className="px-4 py-2 text-sm bg-ink text-paper rounded hover:bg-ink/90 disabled:opacity-50">
            {saving ? 'Saving…' : 'Log Maintenance'}
          </button>
        </div>
      </form>
      ) : (
        <div className="border border-hairline bg-surface rounded p-4 mb-8 text-sm text-muted">
          You have read-only access to this log. Contact a manager or admin to add entries.
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <input placeholder="Search maintenance entries…" value={query} onChange={e => setQuery(e.target.value)} className="input flex-1 min-w-[200px]" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">All statuses</option>
          {statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto border border-hairline rounded scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="bg-ink text-paper text-xs uppercase tracking-wide">
            <tr>
              {['Date', 'Asset ID', 'Asset Name', 'Category', 'Sub-Category', 'Brand', 'Model', 'Serial', 'Location', 'Actual Location', 'Department', 'Assigned To', 'Asset Status', 'Condition', 'Last Maintenance', 'Freq. (Days)', 'Maintenance Due', 'PMS Status', 'Type', 'Technician', 'Findings', 'Cost', 'Remarks', 'Logged By'].map(h => (
                <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => (
              <tr key={r.id} className="border-t border-hairline hover:bg-hairline/20">
                <td className="px-3 py-2 whitespace-nowrap">{r.scheduled_date}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.asset_code}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.asset_name}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.category}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.sub_category}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.brand}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.model}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.serial_number}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.registered_location}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.actual_location}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.department}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.assigned_to}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.asset_status}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.condition}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.last_maintenance}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.maintenance_frequency_days}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.maintenance_due}</td>
                <td className={`px-3 py-2 whitespace-nowrap font-medium ${STATUS_COLOR[r.pms_status] || ''}`}>{r.pms_status}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.maintenance_type}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.technician}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.findings}</td>
                <td className="px-3 py-2 whitespace-nowrap">{peso(r.maintenance_cost)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.remarks}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.logged_by_name}</td>
              </tr>
            ))}
            {pageRows.length === 0 && <tr><td colSpan={23} className="px-3 py-6 text-center text-muted">No maintenance entries yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalCount={filteredRows.length} />
    </div>
  )
}
