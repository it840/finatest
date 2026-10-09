import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLookups } from '../lib/useLookups'
import { useProperty } from '../lib/PropertyContext'
import Pagination from '../components/Pagination'
import { matchesQuery, num, peso2 } from '../lib/tableUtils'
import AssetForm from '../components/AssetForm'
import { forProperty } from '../lib/propertyScope'

function qty(n) { return n === null || n === undefined ? '—' : Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }) }
function peso(n) { return n === null || n === undefined ? '—' : '₱' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }) }

function buildQrUrl(a) {
  const lines = [
    'IDENTIFICATION',
    `Asset ID: ${a.asset_code || ''}`,
    `Asset Name: ${a.asset_name || ''}`,
    `Category: ${a.category || '—'}`,
    `Sub-Category: ${a.sub_category || '—'}`,
    '',
    'ASSET DETAILS',
    `Brand: ${a.brand || '—'}`,
    `Model: ${a.model || '—'}`,
    `Serial Number: ${a.serial_number || '—'}`,
    '',
    'LOCATION & ASSIGNMENT',
    `Property: ${a.property_name || '—'}`,
    `Location: ${a.location || '—'}`,
    `Actual Location: ${a.actual_location || '—'}`,
    `Department: ${a.department || '—'}`,
    `Assigned To: ${a.assigned_to || '—'}`,
    '',
    'STATUS',
    `Status: ${a.status || '—'}`,
    `Condition: ${a.condition || '—'}`,
    ...(a.photo_url ? ['', 'PHOTO', a.photo_url] : []),
  ].join('\n')
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(lines)}`
}

const STATUS_DOT = {
  Active: 'bg-success', 'In Use': 'bg-success', Available: 'bg-success',
  'Under Maintenance': 'bg-gold', Missing: 'bg-danger', Damaged: 'bg-danger',
  Retired: 'bg-muted', Disposed: 'bg-muted',
}

const ACTION_LABELS = { insert: 'Created', update: 'Updated', delete: 'Deleted' }
const ACTION_COLOR = { insert: 'bg-success', update: 'bg-gold', delete: 'bg-danger' }
const HISTORY_IGNORE = new Set(['updated_at', 'created_at', 'qr_url'])

function DetailRow({ label, value }) {
  return (
    <div>
      <div className="text-xs text-muted mb-0.5">{label}</div>
      <div className="text-sm">{value || value === 0 ? value : '—'}</div>
    </div>
  )
}

function AssetDetailModal({ asset, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const qrUrl = buildQrUrl(asset)

  useEffect(() => {
    supabase.from('activity_log_computed').select('*')
      .eq('table_name', 'assets').eq('record_id', String(asset.id))
      .order('created_at', { ascending: false })
      .then(({ data }) => { setHistory(data || []); setLoading(false) })
  }, [asset.id])

  const printQr = () => {
    const w = window.open('', '_blank', 'width=420,height=520')
    if (!w) return
    w.document.write(`
      <html><head><title>${asset.asset_code}</title></head>
      <body style="text-align:center;font-family:sans-serif;padding:24px;">
        <img src="${qrUrl}" style="width:300px;height:300px;" onload="window.print()" />
        <div style="margin-top:12px;font-size:14px;letter-spacing:1px;">${asset.asset_code}</div>
      </body></html>
    `)
    w.document.close()
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-start justify-center overflow-y-auto py-10 z-50 px-4">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-2xl">
        <div className="flex items-start justify-between px-6 py-5 border-b border-hairline">
          <div>
            <span className="font-display text-xl">{asset.asset_name}</span>
            <span className="text-muted"> — </span>
            <span className="text-xs font-medium tracking-wide text-muted align-middle">{asset.asset_code}</span>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 grid grid-cols-[auto_1fr] gap-6">
          <div className="w-44 flex flex-col items-center gap-3">
            {asset.photo_url && (
              <img src={asset.photo_url} alt={asset.asset_name} className="w-full h-32 object-cover rounded-lg border border-hairline" />
            )}
            <div className="border border-hairline rounded-lg p-3 bg-paper">
              <img src={qrUrl} alt="QR code" className="w-36 h-36" />
            </div>
            <div className="text-xs tracking-wide text-muted">{asset.asset_code}</div>
            <button onClick={printQr} className="w-full px-3 py-2 text-xs border border-hairline rounded hover:bg-hairline/20">
              Print QR Code
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <div className="text-xs text-muted mb-1">Status</div>
              <span className="inline-flex items-center gap-1.5 text-sm">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[asset.status] || 'bg-muted'}`} />
                {asset.status || '—'}
              </span>
            </div>
            <DetailRow label="Category" value={asset.category} />
            <DetailRow label="Brand" value={asset.brand} />
            <DetailRow label="Model" value={asset.model} />
            <DetailRow label="Serial Number" value={asset.serial_number} />
            <DetailRow label="Condition" value={asset.condition} />
            <DetailRow label="Location" value={asset.location} />
            <DetailRow label="Actual Location" value={asset.actual_location} />
            <DetailRow label="Assigned To" value={asset.assigned_to} />
            <DetailRow label="Acquisition Date" value={asset.acquisition_date} />
            <DetailRow label="Purchase Cost" value={peso(asset.purchase_cost)} />
            <DetailRow label="Warranty Expiry" value={asset.warranty_expiry} />
            <DetailRow label="Current Value" value={peso(asset.current_asset_value)} />
          </div>
        </div>

        {asset.remarks && (
          <div className="px-6 pb-2">
            <div className="text-xs text-muted mb-1">Remarks</div>
            <div className="text-sm">{asset.remarks}</div>
          </div>
        )}

        <div className="mx-6 mb-6 border border-hairline rounded-lg">
          <div className="px-4 py-3 border-b border-hairline font-medium text-sm">History</div>
          <div className="max-h-56 overflow-y-auto divide-y divide-hairline">
            {loading && <div className="px-4 py-4 text-sm text-muted">Loading…</div>}
            {!loading && history.length === 0 && <div className="px-4 py-4 text-sm text-muted">No history yet.</div>}
            {history.map(h => {
              const d = h.new_data || h.old_data || {}
              const changes = h.action === 'update' && h.old_data && h.new_data
                ? Object.keys({ ...h.old_data, ...h.new_data 
                  }).filter(k => !HISTORY_IGNORE.has(k) && JSON.stringify(h.old_data[k]) !== JSON.stringify(h.new_data[k]))
                : []
              return (
                <div key={h.id} className="px-4 py-3 flex gap-3">
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${ACTION_COLOR[h.action]}`} />
                  <div>
                    <div className="text-sm">
                      <span className="font-medium">{ACTION_LABELS[h.action]}</span>
                      {h.action === 'insert' && ': Asset added to inventory'}
                      {h.action === 'delete' && ': Asset removed'}
                      {changes.length > 0 && `: ${changes.join(', ')} changed`}
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {new Date(h.created_at).toLocaleString()} · {h.actor_name || 'Unknown'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-hairline rounded hover:bg-hairline/20">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Assets({ profile }) {
  const { lookups, loading: lookupsLoading } = useLookups()
  const { properties, currentPropertyId } = useProperty()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [viewingAsset, setViewingAsset] = useState(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(30)

  const canWrite = profile?.role === 'admin' || profile?.role === 'manager'
  const canDelete = profile?.role === 'admin'

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('assets_computed').select('*').order('asset_code')
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const scoped = currentPropertyId === 'all' ? rows : rows.filter(r => r.property_id === currentPropertyId)

  const filtered = scoped.filter(r =>
    (!query || matchesQuery(query, [
      r.asset_code, r.property_name, r.asset_name, r.category, r.sub_category, r.brand, r.model, r.serial_number,
      r.registered_qty, r.disposal_qty, r.remaining_qty, r.location, r.actual_location, r.department,
      r.assigned_to, r.status, r.condition, r.current_asset_value,
    ])) &&
    (!categoryFilter || r.category === categoryFilter) &&
    (!locationFilter || r.location === locationFilter) &&
    (!statusFilter || r.status === statusFilter)
  )

  useEffect(() => { setPage(0) }, [query, categoryFilter, locationFilter, statusFilter, currentPropertyId])

  // totals cover every filtered asset, not just the current page
  const totalReg = filtered.reduce((sum, r) => sum + Number(r.registered_qty || 0), 0)
  const totalDisposed = filtered.reduce((sum, r) => sum + Number(r.disposal_qty || 0), 0)
  const totalRemaining = filtered.reduce((sum, r) => sum + Number(r.remaining_qty || 0), 0)
  // current value is per unit, so the total is value x remaining qty
  const totalValue = filtered.reduce((sum, r) => sum + Number(r.current_asset_value || 0) * Number(r.remaining_qty || 0), 0)

  const pageRows = filtered.slice(page * pageSize, page * pageSize + pageSize)

  const remove = async (row) => {
    if (!confirm(`Delete ${row.asset_code} — ${row.asset_name}? This cannot be undone.`)) return
    await supabase.from('assets').delete().eq('id', row.id)
    load()
  }

  if (lookupsLoading || loading) return <div className="text-muted text-sm">Loading asset database…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl">Asset Database</h1>
          <p className="text-sm text-muted">{filtered.length} of {rows.length} assets shown</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input placeholder="Search any column…" value={query} onChange={e => setQuery(e.target.value)}
          className="input flex-1 min-w-[200px]" />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input w-auto">
          <option value="">All categories</option>
          {lookups.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="input w-auto">
          <option value="">All locations</option>
          {forProperty(lookups.locations, currentPropertyId).map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">All statuses</option>
          {lookups.statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto border border-hairline rounded scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="bg-sage-active text-sage-text text-xs uppercase tracking-wide">
            <tr>
              {['ID', 'Property', 'Name', 'Category', 'Reg. Qty', 'Disposed', 'Remaining', 'Location', 'Actual Location', 'Assigned To', 'Status', 'Condition', 'Current Value', 'QR', ''].map(h => (
                <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => (
              <tr key={r.id} className="border-t border-hairline hover:bg-hairline/20">
                <td className="px-3 py-2 whitespace-nowrap font-medium">{r.asset_code}</td>
                <td className="px-3 py-2 whitespace-nowrap text-muted">{r.property_name}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.asset_name}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.category}</td>
                <td className="px-3 py-2 whitespace-nowrap">{qty(r.registered_qty)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-muted">{qty(r.disposal_qty)}</td>
                <td className={`px-3 py-2 whitespace-nowrap font-medium ${Number(r.remaining_qty) <= 0 ? 'text-danger' : ''}`}>{qty(r.remaining_qty)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.location}</td>
                <td className="px-3 py-2 whitespace-nowrap text-muted">{r.actual_location}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.assigned_to}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.status}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.condition}</td>
                <td className="px-3 py-2 whitespace-nowrap">{peso(r.current_asset_value)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <button onClick={() => setViewingAsset(r)} className="text-sage-accent underline">View</button>
                </td>
                <td className="px-3 py-2 whitespace-nowrap space-x-3">
                  {canWrite && <button onClick={() => { setEditing(r); setShowForm(true) }} className="text-ink underline">Edit</button>}
                  {canDelete && <button onClick={() => remove(r)} className="text-danger underline">Delete</button>}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={15} className="px-3 py-6 text-center text-muted">No assets match.</td></tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-sage-accent bg-sage-bg font-medium">
                <td className="px-3 py-2 whitespace-nowrap" colSpan={4}>Total · {filtered.length} {filtered.length === 1 ? 'asset' : 'assets'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{num(totalReg)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-muted">{num(totalDisposed)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{num(totalRemaining)}</td>
                <td className="px-3 py-2" colSpan={5}></td>
                <td className="px-3 py-2 whitespace-nowrap" title="Current value × remaining qty">{peso2(totalValue)} <span className="text-xs font-normal text-muted">× qty</span></td>
                <td className="px-3 py-2" colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalCount={filtered.length} />

      {showForm && (
        <AssetForm
          initial={editing}
          lookups={lookups}
          properties={properties}
          defaultPropertyId={currentPropertyId}
          onCancel={() => setShowForm(false)}
          onSave={() => { setShowForm(false); load() }}
        />
      )}

      {viewingAsset && (
        <AssetDetailModal asset={viewingAsset} onClose={() => setViewingAsset(null)} />
      )}
    </div>
  )
}
