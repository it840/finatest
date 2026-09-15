import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProperty } from '../lib/PropertyContext'
import Pagination from '../components/Pagination'

const EMPTY = { asset_id: '', movement_type: '', to_location: '', reason: '', remarks: '' }

export default function MovementLog({ profile }) {
  const { currentPropertyId, currentProperty } = useProperty()
  const [rows, setRows] = useState([])
  const [assets, setAssets] = useState([])
  const [types, setTypes] = useState([])
  const [reasons, setReasons] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(30)
  const [query, setQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const load = async () => {
    setLoading(true)
    const [ml, a, t, r, l] = await Promise.all([
      supabase.from('movement_log_computed').select('*').order('movement_date', { ascending: false }),
      supabase.from('assets').select('id, asset_code, asset_name, location, property_id'),
      supabase.from('movement_types').select('*').order('name'),
      supabase.from('movement_reasons').select('*').order('name'),
      supabase.from('locations').select('*').order('name'),
    ])
    setRows(ml.data || [])
    setAssets(a.data || [])
    setTypes(t.data || [])
    setReasons(r.data || [])
    setLocations(l.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const selectedAsset = assets.find(a => String(a.id) === String(form.asset_id))

  const scopedAssets = currentPropertyId === 'all' ? assets : assets.filter(a => a.property_id === currentPropertyId)
  const scopedRows = currentPropertyId === 'all' ? rows : rows.filter(r => r.property_id === currentPropertyId)

  const filteredRows = scopedRows.filter(r =>
    (!query ||
      [r.asset_code, r.asset_name, r.from_location, r.to_location, r.reason]
        .filter(Boolean).some(v => v.toLowerCase().includes(query.toLowerCase()))
    ) &&
    (!locationFilter || r.to_location === locationFilter || r.from_location === locationFilter) &&
    (!typeFilter || r.movement_type === typeFilter)
  )

  useEffect(() => { setPage(0) }, [currentPropertyId, query, locationFilter, typeFilter])

  const pageRows = filteredRows.slice(page * pageSize, page * pageSize + pageSize)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    const { error } = await supabase.from('movement_log').insert({
      asset_id: Number(form.asset_id),
      movement_type: form.movement_type,
      from_location: selectedAsset?.location ?? null,
      to_location: form.to_location,
      reason: form.reason,
      authorized_by: profile?.id,
      remarks: form.remarks || null,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    setForm(EMPTY)
    load()
  }

  if (loading) return <div className="text-muted text-sm">Loading movement log…</div>

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Asset Movement Log</h1>
      <p className="text-sm text-muted mb-1">
        {currentPropertyId === 'all' ? 'All properties' : currentProperty?.name} · Every transfer, assignment, or return updates the asset's current location automatically.
      </p>
      <p className="text-sm text-muted mb-6">{filteredRows.length} of {scopedRows.length} movements shown</p>

      <form onSubmit={submit} className="border border-hairline bg-surface rounded p-5 mb-8 grid grid-cols-3 gap-4 items-end">
        <label className="block">
          <span className="block text-xs text-muted mb-1">Asset</span>
          <select required value={form.asset_id} onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))} className="input">
            <option value="">Select asset…</option>
            {scopedAssets.map(a => <option key={a.id} value={a.id}>{a.asset_code} — {a.asset_name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">From Location</span>
          <input disabled value={selectedAsset?.location ?? ''} className="input bg-hairline/30" />
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">To Location</span>
          <select required value={form.to_location} onChange={e => setForm(f => ({ ...f, to_location: e.target.value }))} className="input">
            <option value="">—</option>
            {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Movement Type</span>
          <select required value={form.movement_type} onChange={e => setForm(f => ({ ...f, movement_type: e.target.value }))} className="input">
            <option value="">—</option>
            {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Reason</span>
          <select required value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="input">
            <option value="">—</option>
            {reasons.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Remarks</span>
          <input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} className="input" />
        </label>
        <div className="col-span-3">
          {error && <div className="text-sm text-danger mb-2">{error}</div>}
          <button disabled={saving} className="px-4 py-2 text-sm bg-ink text-paper rounded hover:bg-ink/90 disabled:opacity-50">
            {saving ? 'Saving…' : 'Log Movement'}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-3 mb-4">
        <input placeholder="Search movements…" value={query} onChange={e => setQuery(e.target.value)}
          className="input flex-1 min-w-[200px]" />
        <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="input w-auto">
          <option value="">All locations</option>
          {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input w-auto">
          <option value="">All types</option>
          {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto border border-hairline rounded scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="bg-ink text-paper text-xs uppercase tracking-wide">
            <tr>
              {['Date', 'Asset', 'Type', 'From', 'To', 'Reason', 'Remarks'].map(h => (
                <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => (
              <tr key={r.id} className="border-t border-hairline hover:bg-hairline/20">
                <td className="px-3 py-2 whitespace-nowrap">{r.movement_date}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.asset_code} — {r.asset_name}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.movement_type}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.from_location}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.to_location}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.reason}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.remarks}</td>
              </tr>
            ))}
            {pageRows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted">No movements match.</td></tr>}
          </tbody>
        </table>
      </div>

      <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalCount={filteredRows.length} />
    </div>
  )
}
