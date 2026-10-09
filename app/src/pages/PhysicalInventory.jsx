import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProperty } from '../lib/PropertyContext'
import Pagination from '../components/Pagination'
import { matchesQuery, num, peso2 } from '../lib/tableUtils'
import { forProperty, withCurrent } from '../lib/propertyScope'

const EMPTY = { asset_id: '', actual_qty: '', actual_location: '', inventory_status: '', condition: '', remarks: '' }

export default function PhysicalInventory({ profile }) {
  const { currentPropertyId, currentProperty } = useProperty()
  const [rows, setRows] = useState([])
  const [assets, setAssets] = useState([])
  const [statuses, setStatuses] = useState([])
  const [conditions, setConditions] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(30)
  const [query, setQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const load = async () => {
    setLoading(true)
    const [pi, a, s, c, l] = await Promise.all([
      supabase.from('physical_inventory_computed').select('*').order('inventory_date', { ascending: false }),
      supabase.from('assets').select('id, asset_code, asset_name, location, department, assigned_to, registered_qty, property_id'),
      supabase.from('statuses').select('*').order('name'),
      supabase.from('conditions').select('*').order('name'),
      supabase.from('locations').select('*').order('name'),
    ])
    setRows(pi.data || [])
    setAssets(a.data || [])
    setStatuses(s.data || [])
    setConditions(c.data || [])
    setLocations(l.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const selectedAsset = assets.find(a => String(a.id) === String(form.asset_id))

  const scopedAssets = currentPropertyId === 'all' ? assets : assets.filter(a => a.property_id === currentPropertyId)
  const scopedRows = currentPropertyId === 'all' ? rows : rows.filter(r => r.property_id === currentPropertyId)

  const filteredRows = scopedRows.filter(r =>
    (!query || matchesQuery(query, [
      r.inventory_date, r.asset_code, r.asset_name, r.registered_qty, r.actual_qty, r.actual_location,
      r.inventory_status, r.condition, r.discrepancy, r.department, r.assigned_to, r.remarks,
    ])) &&
    (!locationFilter || r.actual_location === locationFilter) &&
    (!statusFilter || r.inventory_status === statusFilter)
  )

  useEffect(() => { setPage(0) }, [currentPropertyId, query, locationFilter, statusFilter])

  // totals cover every filtered count, not just the current page
  const totalRegistered = filteredRows.reduce((sum, r) => sum + Number(r.registered_qty || 0), 0)
  const totalActual = filteredRows.reduce((sum, r) => sum + Number(r.actual_qty || 0), 0)
  const netVariance = totalActual - totalRegistered
  const withDiscrepancy = filteredRows.filter(r => r.discrepancy && r.discrepancy !== 'No Discrepancy').length

  const pageRows = filteredRows.slice(page * pageSize, page * pageSize + pageSize)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    const { error } = await supabase.from('physical_inventory').insert({
      asset_id: Number(form.asset_id),
      registered_qty: selectedAsset?.registered_qty ?? null,
      actual_qty: Number(form.actual_qty),
      actual_location: form.actual_location,
      inventory_status: form.inventory_status,
      condition: form.condition,
      verified_by: profile?.id,
      remarks: form.remarks || null,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    setForm(EMPTY)
    load()
  }

  if (loading) return <div className="text-muted text-sm">Loading physical inventory…</div>

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Physical Inventory</h1>
      <p className="text-sm text-muted mb-1">
        {currentPropertyId === 'all' ? 'All properties' : currentProperty?.name} · Record a physical count and compare it against what's registered.
      </p>
      <p className="text-sm text-muted mb-6">{filteredRows.length} of {scopedRows.length} counts shown</p>

      <form onSubmit={submit} className="border border-hairline bg-surface rounded p-5 mb-8 grid grid-cols-3 gap-4 items-end">
        <label className="block col-span-1">
          <span className="block text-xs text-muted mb-1">Asset</span>
          <select required value={form.asset_id} onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))} className="input">
            <option value="">Select asset…</option>
            {scopedAssets.map(a => <option key={a.id} value={a.id}>{a.asset_code} — {a.asset_name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Registered Qty</span>
          <input disabled value={selectedAsset?.registered_qty ?? ''} className="input bg-hairline/30" />
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Actual Qty Counted</span>
          <input required type="number" step="0.01" value={form.actual_qty} onChange={e => setForm(f => ({ ...f, actual_qty: e.target.value }))} className="input" />
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Actual Location</span>
          <select required value={form.actual_location} onChange={e => setForm(f => ({ ...f, actual_location: e.target.value }))} className="input">
            <option value="">—</option>
            {withCurrent(forProperty(locations, selectedAsset?.property_id ?? currentPropertyId), form.actual_location).map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Inventory Status</span>
          <select required value={form.inventory_status} onChange={e => setForm(f => ({ ...f, inventory_status: e.target.value }))} className="input">
            <option value="">—</option>
            {statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Condition</span>
          <select required value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} className="input">
            <option value="">—</option>
            {conditions.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </label>
        <label className="block col-span-2">
          <span className="block text-xs text-muted mb-1">Remarks</span>
          <input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} className="input" />
        </label>
        <div>
          {error && <div className="text-sm text-danger mb-2">{error}</div>}
          <button disabled={saving} className="w-full px-4 py-2 text-sm bg-sage-accent text-white rounded hover:bg-sage-accent/90 disabled:opacity-50">
            {saving ? 'Saving…' : 'Log Count'}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-3 mb-4">
        <input placeholder="Search any column…" value={query} onChange={e => setQuery(e.target.value)}
          className="input flex-1 min-w-[200px]" />
        <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="input w-auto">
          <option value="">All locations</option>
          {forProperty(locations, currentPropertyId).map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">All statuses</option>
          {statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto border border-hairline rounded scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="bg-sage-active text-sage-text text-xs uppercase tracking-wide">
            <tr>
              {['Date', 'Asset', 'Registered', 'Actual', 'Location', 'Status', 'Condition', 'Discrepancy'].map(h => (
                <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => (
              <tr key={r.id} className="border-t border-hairline hover:bg-hairline/20">
                <td className="px-3 py-2 whitespace-nowrap">{r.inventory_date}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.asset_code} — {r.asset_name}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.registered_qty}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.actual_qty}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.actual_location}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.inventory_status}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.condition}</td>
                <td className={`px-3 py-2 whitespace-nowrap ${r.discrepancy !== 'No Discrepancy' ? 'text-danger' : 'text-success'}`}>{r.discrepancy}</td>
              </tr>
            ))}
            {pageRows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted">No counts match.</td></tr>}
          </tbody>
          {filteredRows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-sage-accent bg-sage-bg font-medium">
                <td className="px-3 py-2 whitespace-nowrap" colSpan={2}>Total · {filteredRows.length} {filteredRows.length === 1 ? 'count' : 'counts'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{num(totalRegistered)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{num(totalActual)}</td>
                <td className="px-3 py-2" colSpan={3}></td>
                <td className={`px-3 py-2 whitespace-nowrap ${withDiscrepancy ? 'text-danger' : 'text-success'}`}>
                  {withDiscrepancy ? `${withDiscrepancy} with discrepancy · net ${netVariance > 0 ? '+' : ''}${num(netVariance)}` : 'No Discrepancy'}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalCount={filteredRows.length} />
    </div>
  )
}
