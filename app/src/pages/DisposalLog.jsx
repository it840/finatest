import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProperty } from '../lib/PropertyContext'
import Pagination from '../components/Pagination'
import { matchesQuery, num, peso2 } from '../lib/tableUtils'

function peso(n) { return n === null || n === undefined ? '—' : '₱' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }) }

const EMPTY = { asset_id: '', qty: '', unit_cost: '', disposal_reason: '', remarks: '' }

export default function DisposalLog({ profile }) {
  const canWrite = profile?.role === 'admin' || profile?.role === 'manager'
  const { currentPropertyId, currentProperty } = useProperty()
  const [rows, setRows] = useState([])
  const [assets, setAssets] = useState([])
  const [reasons, setReasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(30)
  const [query, setQuery] = useState('')

  const load = async () => {
    setLoading(true)
    const [dl, a, r] = await Promise.all([
      supabase.from('disposal_log_computed').select('*').order('disposal_date', { ascending: false }),
      supabase.from('assets').select('id, asset_code, asset_name, registered_qty, disposal_qty, purchase_cost, property_id'),
      supabase.from('disposal_reasons').select('*').order('name'),
    ])
    setRows(dl.data || [])
    setAssets(a.data || [])
    setReasons(r.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const selectedAsset = assets.find(a => String(a.id) === String(form.asset_id))
  const remainingQty = selectedAsset ? Number(selectedAsset.registered_qty || 0) - Number(selectedAsset.disposal_qty || 0) : null
  const scopedAssets = currentPropertyId === 'all' ? assets : assets.filter(a => a.property_id === currentPropertyId)
  const scopedRows = currentPropertyId === 'all' ? rows : rows.filter(r => r.property_id === currentPropertyId)

  const filteredRows = scopedRows.filter(r =>
    !query || matchesQuery(query, [
      r.disposal_date, r.asset_code, r.asset_name, r.qty, r.unit_cost, r.amount,
      r.disposal_reason, r.remarks, r.logged_by_name,
    ])
  )

  useEffect(() => { setPage(0) }, [currentPropertyId, query])
  // totals cover every filtered disposal, not just the current page
  const totalQty = filteredRows.reduce((sum, r) => sum + Number(r.qty || 0), 0)
  const totalAmount = filteredRows.reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const avgUnitCost = totalQty > 0 ? totalAmount / totalQty : 0

  const pageRows = filteredRows.slice(page * pageSize, page * pageSize + pageSize)

  useEffect(() => {
    if (selectedAsset) setForm(f => ({ ...f, unit_cost: selectedAsset.purchase_cost ?? '' }))
  }, [form.asset_id])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    if (remainingQty !== null && Number(form.qty) > remainingQty) {
      setSaving(false); setError(`Can't dispose more than the remaining quantity (${remainingQty}).`); return
    }
    const { error } = await supabase.from('disposal_log').insert({
      asset_id: Number(form.asset_id),
      qty: Number(form.qty),
      unit_cost: form.unit_cost === '' ? null : Number(form.unit_cost),
      disposal_reason: form.disposal_reason || null,
      remarks: form.remarks || null,
      logged_by: profile?.id,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    setForm(EMPTY)
    load()
  }

  if (loading) return <div className="text-muted text-sm">Loading disposal log…</div>

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Disposal Log</h1>
      <p className="text-sm text-muted mb-1">
        {currentPropertyId === 'all' ? 'All properties' : currentProperty?.name} · Record write-offs, sales, and losses. Each entry adds to the asset's Disposal Qty.
      </p>
      <p className="text-sm text-muted mb-6">{filteredRows.length} of {scopedRows.length} disposals shown</p>

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
          <span className="block text-xs text-muted mb-1">Remaining Qty</span>
          <input disabled value={remainingQty ?? ''} className="input bg-hairline/30" />
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Qty Disposed</span>
          <input required type="number" step="0.01" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} className="input" />
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Unit Cost</span>
          <input type="number" step="0.01" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} className="input" />
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Disposal Reason</span>
          <select required value={form.disposal_reason} onChange={e => setForm(f => ({ ...f, disposal_reason: e.target.value }))} className="input">
            <option value="">—</option>
            {reasons.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Remarks</span>
          <input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} className="input" />
        </label>
        <div>
          {error && <div className="text-sm text-danger mb-2">{error}</div>}
          <button disabled={saving} className="w-full px-4 py-2 text-sm bg-theme-accent text-white rounded hover:bg-theme-accent/90 disabled:opacity-50">
            {saving ? 'Saving…' : 'Log Disposal'}
          </button>
        </div>
      </form>
      ) : (
        <div className="border border-hairline bg-surface rounded p-4 mb-8 text-sm text-muted">
          You have read-only access to this log. Contact a manager or admin to add entries.
        </div>
      )}

      <input placeholder="Search any column…" value={query} onChange={e => setQuery(e.target.value)} className="input mb-4 max-w-xl" />

      <div className="overflow-x-auto border border-hairline rounded scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="bg-theme-active text-theme-text text-xs uppercase tracking-wide">
            <tr>
              {['Date', 'Asset', 'Qty', 'Unit Cost', 'Amount', 'Reason', 'Remarks', 'Logged By'].map(h => (
                <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => (
              <tr key={r.id} className="border-t border-hairline hover:bg-hairline/20">
                <td className="px-3 py-2 whitespace-nowrap">{r.disposal_date}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.asset_code} — {r.asset_name}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.qty}</td>
                <td className="px-3 py-2 whitespace-nowrap">{peso(r.unit_cost)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{peso(r.amount)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-danger">{r.disposal_reason}</td>
                <td className="px-3 py-2">{r.remarks}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.logged_by_name}</td>
              </tr>
            ))}
            {pageRows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted">No disposals logged yet.</td></tr>}
          </tbody>
          {filteredRows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-theme-accent bg-theme-bg font-medium">
                <td className="px-3 py-2 whitespace-nowrap" colSpan={2}>Total · {filteredRows.length} {filteredRows.length === 1 ? 'entry' : 'entries'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{num(totalQty)}</td>
                <td className="px-3 py-2 whitespace-nowrap" title="Total amount ÷ total qty">{peso2(avgUnitCost)} <span className="text-xs font-normal text-muted">avg</span></td>
                <td className="px-3 py-2 whitespace-nowrap">{peso2(totalAmount)}</td>
                <td className="px-3 py-2" colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalCount={filteredRows.length} />
    </div>
  )
}
