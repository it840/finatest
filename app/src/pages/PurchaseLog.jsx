import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProperty } from '../lib/PropertyContext'
import Pagination from '../components/Pagination'

function peso(n) { return n === null || n === undefined ? '—' : '₱' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }) }

const EMPTY = { asset_id: '', qty: '', unit_cost: '', supplier: '', acquisition_type: '', remarks: '' }

export default function PurchaseLog({ profile }) {
  const canWrite = profile?.role === 'admin' || profile?.role === 'manager'
  const { currentPropertyId, currentProperty } = useProperty()
  const [rows, setRows] = useState([])
  const [assets, setAssets] = useState([])
  const [acquisitionTypes, setAcquisitionTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(30)
  const [query, setQuery] = useState('')

  const load = async () => {
    setLoading(true)
    const [pl, a, at] = await Promise.all([
      supabase.from('purchase_log_computed').select('*').order('purchase_date', { ascending: false }),
      supabase.from('assets').select('id, asset_code, asset_name, registered_qty, property_id'),
      supabase.from('acquisition_types').select('*').order('name'),
    ])
    setRows(pl.data || [])
    setAssets(a.data || [])
    setAcquisitionTypes(at.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const selectedAsset = assets.find(a => String(a.id) === String(form.asset_id))
  const scopedAssets = currentPropertyId === 'all' ? assets : assets.filter(a => a.property_id === currentPropertyId)
  const scopedRows = currentPropertyId === 'all' ? rows : rows.filter(r => r.property_id === currentPropertyId)

  const filteredRows = scopedRows.filter(r =>
    !query || [r.asset_code, r.asset_name, r.supplier].filter(Boolean).some(v => v.toLowerCase().includes(query.toLowerCase()))
  )

  useEffect(() => { setPage(0) }, [currentPropertyId, query])
  const pageRows = filteredRows.slice(page * pageSize, page * pageSize + pageSize)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    const { error } = await supabase.from('purchase_log').insert({
      asset_id: Number(form.asset_id),
      qty: Number(form.qty),
      unit_cost: form.unit_cost === '' ? null : Number(form.unit_cost),
      supplier: form.supplier || null,
      acquisition_type: form.acquisition_type || null,
      remarks: form.remarks || null,
      logged_by: profile?.id,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    setForm(EMPTY)
    load()
  }

  if (loading) return <div className="text-muted text-sm">Loading purchase log…</div>

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Purchase Log</h1>
      <p className="text-sm text-muted mb-1">
        {currentPropertyId === 'all' ? 'All properties' : currentProperty?.name} · Record restocks and additional-quantity purchases. Each entry adds to the asset's Registered Qty.
      </p>
      <p className="text-sm text-muted mb-6">{filteredRows.length} of {scopedRows.length} purchases shown</p>

      {canWrite ? (
        <form onSubmit={submit} className="border border-hairline bg-surface rounded p-5 mb-8 grid grid-cols-3 gap-4 items-end">
        <label className="block">
          <span className="block text-xs text-muted mb-1">Asset</span>
          <select required value={form.asset_id} onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))} className="input">
            <option value="">Select asset…</option>
            {scopedAssets.map(a => <option key={a.id} value={a.id}>{a.asset_code} — {a.asset_name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Current Registered Qty</span>
          <input disabled value={selectedAsset?.registered_qty ?? ''} className="input bg-hairline/30" />
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Qty Purchased</span>
          <input required type="number" step="0.01" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} className="input" />
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Unit Cost</span>
          <input type="number" step="0.01" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} className="input" />
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Supplier</span>
          <input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="input" />
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Acquisition Type</span>
          <select value={form.acquisition_type} onChange={e => setForm(f => ({ ...f, acquisition_type: e.target.value }))} className="input">
            <option value="">—</option>
            {acquisitionTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </label>
        <label className="block col-span-2">
          <span className="block text-xs text-muted mb-1">Remarks</span>
          <input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} className="input" />
        </label>
        <div>
          {error && <div className="text-sm text-danger mb-2">{error}</div>}
          <button disabled={saving} className="w-full px-4 py-2 text-sm bg-ink text-paper rounded hover:bg-ink/90 disabled:opacity-50">
            {saving ? 'Saving…' : 'Log Purchase'}
          </button>
        </div>
      </form>
      ) : (
        <div className="border border-hairline bg-surface rounded p-4 mb-8 text-sm text-muted">
          You have read-only access to this log. Contact a manager or admin to add entries.
        </div>
      )}

      <input placeholder="Search purchases…" value={query} onChange={e => setQuery(e.target.value)} className="input mb-4 max-w-md" />

      <div className="overflow-x-auto border border-hairline rounded scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="bg-ink text-paper text-xs uppercase tracking-wide">
            <tr>
              {['Date', 'Asset', 'Qty', 'Unit Cost', 'Amount', 'Supplier', 'Type', 'Logged By'].map(h => (
                <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => (
              <tr key={r.id} className="border-t border-hairline hover:bg-hairline/20">
                <td className="px-3 py-2 whitespace-nowrap">{r.purchase_date}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.asset_code} — {r.asset_name}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.qty}</td>
                <td className="px-3 py-2 whitespace-nowrap">{peso(r.unit_cost)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{peso(r.amount)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.supplier}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.acquisition_type}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.logged_by_name}</td>
              </tr>
            ))}
            {pageRows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted">No purchases logged yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalCount={filteredRows.length} />
    </div>
  )
}
