import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProperty } from '../lib/PropertyContext'
import { useLookups } from '../lib/useLookups'
import Pagination from '../components/Pagination'
import AssetForm from '../components/AssetForm'

function peso(n) { return n === null || n === undefined ? '—' : '₱' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }) }

export default function PurchaseLog({ profile }) {
  const canWrite = profile?.role === 'admin' || profile?.role === 'manager'
  const { currentPropertyId, currentProperty, properties } = useProperty()
  const { lookups, loading: lookupsLoading } = useLookups()
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(30)
  const [query, setQuery] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('purchase_log_computed').select('*').order('purchase_date', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const scopedRows = currentPropertyId === 'all' ? rows : rows.filter(r => r.property_id === currentPropertyId)

  const filteredRows = scopedRows.filter(r =>
    !query || [r.asset_code, r.asset_name, r.supplier].filter(Boolean).some(v => v.toLowerCase().includes(query.toLowerCase()))
  )

  useEffect(() => { setPage(0) }, [currentPropertyId, query])
  const pageRows = filteredRows.slice(page * pageSize, page * pageSize + pageSize)

  if (loading) return <div className="text-muted text-sm">Loading purchase log…</div>

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
        <h1 className="font-display text-2xl">Purchase Log</h1>
        {canWrite && (
          <button onClick={() => setShowAssetForm(true)}
            className="px-4 py-2 text-sm bg-ink text-paper rounded hover:bg-ink/90">
            Purchase / Add Asset
          </button>
        )}
      </div>
      <p className="text-sm text-muted mb-1">
        {currentPropertyId === 'all' ? 'All properties' : currentProperty?.name} · Add newly purchased assets and review past purchases.
      </p>
      <p className="text-sm text-muted mb-6">{filteredRows.length} of {scopedRows.length} purchases shown</p>

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

      {showAssetForm && !lookupsLoading && (
        <AssetForm
          lookups={lookups}
          properties={properties}
          defaultPropertyId={currentPropertyId}
          onCancel={() => setShowAssetForm(false)}
          onSave={() => { setShowAssetForm(false); load() }}
        />
      )}
    </div>
  )
}
