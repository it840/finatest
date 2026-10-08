import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProperty } from '../lib/PropertyContext'
import Pagination from '../components/Pagination'
import { forProperty } from '../lib/propertyScope'

export default function MovementLog() {
  const { currentPropertyId, currentProperty } = useProperty()
  const [rows, setRows] = useState([])
  const [types, setTypes] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(30)
  const [query, setQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const load = async () => {
    setLoading(true)
    const [ml, t, l] = await Promise.all([
      supabase.from('movement_log_computed').select('*').order('movement_date', { ascending: false }),
      supabase.from('movement_types').select('*').order('name'),
      supabase.from('locations').select('*').order('name'),
    ])
    setRows(ml.data || [])
    setTypes(t.data || [])
    setLocations(l.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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

  if (loading) return <div className="text-muted text-sm">Loading movement log…</div>

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Asset Movement Log</h1>
      <p className="text-sm text-muted mb-1">
        {currentPropertyId === 'all' ? 'All properties' : currentProperty?.name} · Every transfer, assignment, or return updates the asset's current location automatically.
      </p>
      <p className="text-sm text-muted mb-6">{filteredRows.length} of {scopedRows.length} movements shown</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <input placeholder="Search movements…" value={query} onChange={e => setQuery(e.target.value)}
          className="input flex-1 min-w-[200px]" />
        <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="input w-auto">
          <option value="">All locations</option>
          {forProperty(locations, currentPropertyId).map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
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
              {['Date', 'Asset', 'Qty', 'Type', 'From', 'To', 'Reason', 'Remarks'].map(h => (
                <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => (
              <tr key={r.id} className="border-t border-hairline hover:bg-hairline/20">
                <td className="px-3 py-2 whitespace-nowrap">{r.movement_date}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.asset_code} — {r.asset_name}</td>
                <td className="px-3 py-2 whitespace-nowrap font-medium">{r.qty == null ? '—' : Number(r.qty).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.movement_type}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.from_location}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.to_location}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.reason}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.remarks}</td>
              </tr>
            ))}
            {pageRows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted">No movements match.</td></tr>}
          </tbody>
        </table>
      </div>

      <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalCount={filteredRows.length} />
    </div>
  )
}
