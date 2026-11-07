import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProperty } from '../lib/PropertyContext'
import Pagination from '../components/Pagination'
import { matchesQuery, num, peso2, timeOf } from '../lib/tableUtils'

function peso(n) { return n === null || n === undefined ? '—' : '₱' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }) }

const STATUS_COLOR = {
  SCHEDULED: 'text-muted', DUE: 'text-gold', OVERDUE: 'text-danger',
  'IN PROGRESS': 'text-gold', COMPLETED: 'text-success', CANCELLED: 'text-muted',
}

const EMPTY = { asset_id: '', scheduled_date: '', pms_status: 'SCHEDULED', maintenance_type: '', technician: '', findings: '', maintenance_cost: '', remarks: '' }

const OPEN = ['SCHEDULED', 'DUE', 'OVERDUE', 'IN PROGRESS']
const today = () => new Date().toISOString().slice(0, 10)

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-ink/40 flex items-start justify-center overflow-y-auto py-10 z-50 px-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="font-display text-xl">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CompleteModal({ entry, onClose, onDone }) {
  const [form, setForm] = useState({
    completed_date: today(), technician: entry.technician || '', maintenance_cost: entry.maintenance_cost ?? '',
    findings: entry.findings || '', remarks: entry.remarks || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const save = async () => {
    setSaving(true); setError('')
    const { error } = await supabase.from('maintenance_log').update({
      pms_status: 'COMPLETED', completed_date: form.completed_date || today(),
      technician: form.technician || null, findings: form.findings || null, remarks: form.remarks || null,
      maintenance_cost: form.maintenance_cost === '' ? null : Number(form.maintenance_cost),
    }).eq('id', entry.id)
    if (error) { setSaving(false); setError(error.message); return }
    // tell the user when the next visit was scheduled automatically
    const { data } = await supabase.from('maintenance_log').select('scheduled_date').eq('asset_id', entry.asset_id)
      .eq('pms_status', 'SCHEDULED').gt('scheduled_date', form.completed_date || today()).order('scheduled_date').limit(1)
    setSaving(false)
    onDone(`${entry.asset_code} marked completed${data && data[0] ? ` · next visit scheduled for ${data[0].scheduled_date}` : ''}.`)
  }
  return (
    <Modal title={`Complete visit · ${entry.asset_code}`} onClose={onClose}>
      <p className="text-sm text-muted">{entry.asset_name} · scheduled {entry.scheduled_date}{entry.maintenance_type ? ` · ${entry.maintenance_type}` : ''}</p>
      <div className="grid grid-cols-2 gap-4">
        <label className="block"><span className="block text-xs text-muted mb-1">Date completed</span>
          <input type="date" value={form.completed_date} onChange={set('completed_date')} className="input" /></label>
        <label className="block"><span className="block text-xs text-muted mb-1">Cost</span>
          <input type="number" step="0.01" min="0" value={form.maintenance_cost} onChange={set('maintenance_cost')} className="input" /></label>
        <label className="block col-span-2"><span className="block text-xs text-muted mb-1">Technician</span>
          <input value={form.technician} onChange={set('technician')} className="input" /></label>
        <label className="block col-span-2"><span className="block text-xs text-muted mb-1">Findings / work done</span>
          <input value={form.findings} onChange={set('findings')} className="input" /></label>
        <label className="block col-span-2"><span className="block text-xs text-muted mb-1">Remarks</span>
          <input value={form.remarks} onChange={set('remarks')} className="input" /></label>
      </div>
      <p className="text-xs text-muted">Completing updates the asset's Last Maintenance date and schedules its next visit automatically.</p>
      {error && <div className="text-sm text-danger">{error}</div>}
      <div className="flex justify-end gap-3 pt-2 border-t border-hairline">
        <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-ink">Close</button>
        <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-theme-accent text-white rounded hover:bg-theme-accent/90 disabled:opacity-50">
          {saving ? 'Saving…' : 'Mark completed'}
        </button>
      </div>
    </Modal>
  )
}

function CancelModal({ entry, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    setSaving(true); setError('')
    const note = reason.trim() ? `Cancelled: ${reason.trim()}` : 'Cancelled.'
    const { error } = await supabase.from('maintenance_log').update({
      pms_status: 'CANCELLED', remarks: entry.remarks ? `${entry.remarks} · ${note}` : note,
    }).eq('id', entry.id)
    setSaving(false)
    if (error) { setError(error.message); return }
    onDone(`${entry.asset_code} visit cancelled.`)
  }
  return (
    <Modal title={`Cancel visit · ${entry.asset_code}`} onClose={onClose}>
      <p className="text-sm text-muted">{entry.asset_name} · scheduled {entry.scheduled_date}. No next visit is scheduled when a visit is cancelled.</p>
      <label className="block"><span className="block text-xs text-muted mb-1">Reason (optional)</span>
        <input value={reason} onChange={e => setReason(e.target.value)} className="input" /></label>
      {error && <div className="text-sm text-danger">{error}</div>}
      <div className="flex justify-end gap-3 pt-2 border-t border-hairline">
        <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-ink">Keep visit</button>
        <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-danger text-white rounded hover:bg-danger/90 disabled:opacity-50">
          {saving ? 'Cancelling…' : 'Cancel visit'}
        </button>
      </div>
    </Modal>
  )
}

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
  const [completing, setCompleting] = useState(null)
  const [cancelling, setCancelling] = useState(null)
  const [notice, setNotice] = useState('')

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

  const scopedAssets = (currentPropertyId === 'all' ? assets : assets.filter(a => a.property_id === currentPropertyId))
    .filter(a => !['Disposed', 'In Transit'].includes(a.status)) // nothing to maintain once disposed or while in transit
  const selectedAsset = assets.find(a => String(a.id) === String(form.asset_id))
  const scopedRows = currentPropertyId === 'all' ? rows : rows.filter(r => r.property_id === currentPropertyId)

  const filteredRows = scopedRows.filter(r =>
    (!query || matchesQuery(query, [
      r.scheduled_date, timeOf(r.created_at), r.asset_code, r.asset_name, r.category, r.sub_category, r.brand, r.model, r.serial_number,
      r.registered_location, r.actual_location, r.department, r.assigned_to, r.asset_status, r.condition,
      r.last_maintenance, r.maintenance_frequency_days, r.maintenance_due, r.pms_status, r.maintenance_type,
      r.technician, r.findings, r.maintenance_cost, r.remarks, r.logged_by_name,
    ])) &&
    (!statusFilter || r.pms_status === statusFilter)
  )

  useEffect(() => { setPage(0) }, [currentPropertyId, query, statusFilter])
  // totals cover every filtered entry, not just the current page
  // money actually spent = completed visits; open visits are only planned; cancelled ones count for nothing
  const totalCost = filteredRows.filter(r => r.pms_status === 'COMPLETED').reduce((sum, r) => sum + Number(r.maintenance_cost || 0), 0)
  const plannedCost = filteredRows.filter(r => OPEN.includes(r.pms_status)).reduce((sum, r) => sum + Number(r.maintenance_cost || 0), 0)
  const completedCount = filteredRows.filter(r => r.pms_status === 'COMPLETED').length

  const pageRows = filteredRows.slice(page * pageSize, page * pageSize + pageSize)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    const { error } = await supabase.from('maintenance_log').insert({
      asset_id: Number(form.asset_id),
      scheduled_date: form.scheduled_date || new Date().toISOString().slice(0, 10),
      pms_status: form.pms_status,
      completed_date: form.pms_status === 'COMPLETED' ? (form.scheduled_date || new Date().toISOString().slice(0, 10)) : null,
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

  // full-page loading only on first open; later refreshes (after Start/Complete/Cancel) keep the table on screen
  if (loading && rows.length === 0 && assets.length === 0) return <div className="text-muted text-sm">Loading maintenance log…</div>

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Preventive Maintenance (PMS)</h1>
      <p className="text-sm text-muted mb-1">
        {currentPropertyId === 'all' ? 'All properties' : currentProperty?.name} · Schedule and track maintenance work. Use Start, Complete or Cancel on each visit; completing one updates the asset's Last Maintenance date and schedules the next visit.
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
            {statuses.filter(s => ['SCHEDULED', 'IN PROGRESS', 'COMPLETED'].includes(s.name)).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
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
          <button disabled={saving} className="px-4 py-2 text-sm bg-theme-accent text-white rounded hover:bg-theme-accent/90 disabled:opacity-50">
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
        <input placeholder="Search any column…" value={query} onChange={e => setQuery(e.target.value)} className="input flex-1 min-w-[200px]" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">All statuses</option>
          {statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
      </div>

      {notice && (
        <div className="mb-3 text-sm rounded border border-[#97C459] bg-[#F4FAEC] text-[#27500A] px-3 py-2 flex justify-between gap-3">
          <span>{notice}</span><button onClick={() => setNotice('')} className="text-[#27500A] hover:underline">Dismiss</button>
        </div>
      )}
      <div className="overflow-x-auto border border-hairline rounded scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="bg-theme-active text-theme-text text-xs uppercase tracking-wide">
            <tr>
              {['Date', 'Time', 'Asset ID', 'Asset Name', 'Category', 'Sub-Category', 'Brand', 'Model', 'Serial', 'Location', 'Actual Location', 'Department', 'Assigned To', 'Asset Status', 'Condition', 'Last Maintenance', 'Freq. (Days)', 'Maintenance Due', 'PMS Status', 'Type', 'Technician', 'Findings', 'Cost', 'Remarks', 'Logged By', ''].map(h => (
                <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => (
              <tr key={r.id} className="border-t border-hairline hover:bg-hairline/20">
                <td className="px-3 py-2 whitespace-nowrap">{r.scheduled_date}</td>
                <td className="px-3 py-2 whitespace-nowrap text-muted" title="Time this entry was logged">{timeOf(r.created_at)}</td>
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
                <td className={`px-3 py-2 whitespace-nowrap font-medium ${STATUS_COLOR[r.pms_status] || ''}`}>
                  {r.pms_status}
                  {r.pms_status === 'COMPLETED' && r.completed_date && <span className="block text-xs font-normal text-muted">on {r.completed_date}</span>}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{r.maintenance_type}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.technician}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.findings}</td>
                <td className="px-3 py-2 whitespace-nowrap">{peso(r.maintenance_cost)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.remarks}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.logged_by_name}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {canWrite && OPEN.includes(r.pms_status) && (
                    <div className="flex items-center gap-2">
                      {r.pms_status !== 'IN PROGRESS' && (
                        <button onClick={async () => { await supabase.from('maintenance_log').update({ pms_status: 'IN PROGRESS' }).eq('id', r.id); setNotice(`${r.asset_code} visit started.`); load() }}
                          className="px-2.5 py-1 text-xs border border-hairline rounded hover:bg-theme-hover">Start</button>
                      )}
                      <button onClick={() => setCompleting(r)} className="px-2.5 py-1 text-xs bg-theme-accent text-white rounded hover:bg-theme-accent/90">Complete</button>
                      <button onClick={() => setCancelling(r)} className="text-xs text-danger hover:underline">Cancel</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && <tr><td colSpan={26} className="px-3 py-6 text-center text-muted">No maintenance entries yet.</td></tr>}
          </tbody>
          {filteredRows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-theme-accent bg-theme-bg font-medium">
                <td className="px-3 py-2 whitespace-nowrap" colSpan={22}>Total · {filteredRows.length} {filteredRows.length === 1 ? 'entry' : 'entries'} · {completedCount} completed{plannedCost > 0 ? ` · ${peso2(plannedCost)} planned` : ''}</td>
                <td className="px-3 py-2 whitespace-nowrap" title="Cost of completed visits only">{peso2(totalCost)}</td>
                <td className="px-3 py-2" colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalCount={filteredRows.length} />

      {completing && <CompleteModal entry={completing} onClose={() => setCompleting(null)} onDone={(msg) => { setCompleting(null); setNotice(msg); load() }} />}
      {cancelling && <CancelModal entry={cancelling} onClose={() => setCancelling(null)} onDone={(msg) => { setCancelling(null); setNotice(msg); load() }} />}
    </div>
  )
}
