import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLookups } from '../lib/useLookups'
import { useProperty } from '../lib/PropertyContext'
import Pagination from '../components/Pagination'
import { matchesQuery, num, peso2 } from '../lib/tableUtils'
import AssetForm from '../components/AssetForm'
import { forProperty } from '../lib/propertyScope'
import { buildQrUrl } from '../lib/assetQr'
import { takeNavFilter } from '../lib/navFilter'

function qty(n) { return n === null || n === undefined ? '—' : Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }) }
function peso(n) { return n === null || n === undefined ? '—' : '₱' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }) }

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

export function AssetDetailModal({ asset, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [big, setBig] = useState(null) // { src, caption, isQr } - enlarged photo or QR code
  const qrUrl = buildQrUrl(asset)

  // Esc closes the enlarged picture first, then the details window
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (big) setBig(null)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [big, onClose])

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
              <button onClick={() => setBig({ src: asset.photo_url, caption: `${asset.asset_code} — ${asset.asset_name}` })} title="Click to enlarge" className="block w-full cursor-zoom-in group relative">
                <img src={asset.photo_url} alt={asset.asset_name} className="w-full h-32 object-cover rounded-lg border border-hairline group-hover:opacity-90 transition-opacity" />
                <span className="absolute bottom-1.5 right-1.5 text-[10px] bg-ink/70 text-white rounded px-1.5 py-0.5">Click to enlarge</span>
              </button>
            )}
            <button onClick={() => setBig({ src: qrUrl, caption: `QR code · ${asset.asset_code} — ${asset.asset_name}`, isQr: true })}
              title="Click to enlarge the QR code" className="block border border-hairline rounded-lg p-3 bg-paper cursor-zoom-in group relative">
              <img src={qrUrl} alt="QR code" className="w-36 h-36 group-hover:opacity-90 transition-opacity" />
              <span className="absolute bottom-1.5 right-1.5 text-[10px] bg-ink/70 text-white rounded px-1.5 py-0.5">Click to enlarge</span>
            </button>
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

      {big && (
        <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-6 cursor-zoom-out" onClick={() => setBig(null)}>
          <button onClick={() => setBig(null)} aria-label="Close picture" className="absolute top-4 right-5 text-white/90 hover:text-white text-3xl leading-none">×</button>
          <img src={big.src} alt={big.caption} onClick={e => e.stopPropagation()}
            className={`max-w-full max-h-[85vh] object-contain rounded-lg cursor-default ${big.isQr ? 'bg-white p-4' : ''}`} />
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 text-sm text-white/90" onClick={e => e.stopPropagation()}>
            <span>{big.caption}</span>
            <a href={big.src} target="_blank" rel="noreferrer" className="underline hover:text-white">Open in a new tab</a>
            {big.isQr && <button onClick={printQr} className="underline hover:text-white">Print QR Code</button>}
          </div>
        </div>
      )}
    </div>
  )
}

// Value of each piece of the same item: price each and current value each
function PieceValueModal({ asset, onClose }) {
  const onHand = Math.max(Math.round(Number(asset.registered_qty || 0)), 0)
  const disposed = Math.max(Math.round(Number(asset.disposal_qty || 0)), 0)
  const total = onHand + disposed
  const unitPrice = asset.purchase_cost
  const unitValue = asset.current_asset_value
  const hasValue = unitValue !== null && unitValue !== undefined
  const shown = Math.min(total, 500)
  const pieces = Array.from({ length: shown }, (_, i) => ({ n: i + 1, onHand: i < onHand }))

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-start justify-center overflow-y-auto py-10 z-50 px-4">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-xl">
        <div className="flex items-start justify-between px-6 py-5 border-b border-hairline">
          <div>
            <div className="font-display text-xl">{asset.asset_name}</div>
            <div className="text-xs text-muted mt-0.5">{asset.asset_code} · {total} {total === 1 ? 'piece' : 'pieces'} purchased · {onHand} on hand · {disposed} disposed</div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div><div className="text-xs text-muted">Price each</div><div className="font-medium">{unitPrice == null ? '—' : peso2(unitPrice)}</div></div>
          <div><div className="text-xs text-muted">Current value each</div><div className="font-medium">{hasValue ? peso2(unitValue) : '—'}</div></div>
          <div><div className="text-xs text-muted">Depreciation each (so far)</div><div>{asset.accumulated_depreciation == null ? '—' : peso2(asset.accumulated_depreciation)}</div></div>
          <div><div className="text-xs text-muted">Salvage value each</div><div>{asset.salvage_value == null ? '—' : peso2(asset.salvage_value)}</div></div>
        </div>
        {!hasValue && (
          <div className="mx-6 mb-3 text-xs text-muted border border-hairline rounded p-2">
            Current value needs a purchase cost, acquisition date and useful life on the asset.
          </div>
        )}

        <div className="mx-6 mb-4 border border-hairline rounded overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-theme-active text-theme-text text-xs uppercase tracking-wide sticky top-0">
                <tr><th className="text-left px-3 py-2 font-medium">Piece</th><th className="text-left px-3 py-2 font-medium">Status</th><th className="text-left px-3 py-2 font-medium">Price each</th><th className="text-left px-3 py-2 font-medium">Current value</th></tr>
              </thead>
              <tbody>
                {pieces.map(pc => (
                  <tr key={pc.n} className="border-t border-hairline">
                    <td className="px-3 py-1.5">#{pc.n}</td>
                    <td className={`px-3 py-1.5 ${pc.onHand ? '' : 'text-muted'}`}>{pc.onHand ? 'On hand' : 'Disposed'}</td>
                    <td className="px-3 py-1.5">{unitPrice == null ? '—' : peso2(unitPrice)}</td>
                    <td className="px-3 py-1.5">{pc.onHand ? (hasValue ? peso2(unitValue) : '—') : '₱0.00'}</td>
                  </tr>
                ))}
                {total === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-muted">No pieces recorded.</td></tr>}
              </tbody>
            </table>
          </div>
          {total > shown && <div className="px-3 py-1.5 text-xs text-muted border-t border-hairline">Showing the first {shown} of {total} pieces.</div>}
        </div>

        <div className="mx-6 mb-5 flex items-center justify-between text-sm">
          <span className="text-muted">Total current value ({onHand} on hand)</span>
          <span className="font-medium">{hasValue ? peso2(Number(unitValue) * onHand) : '—'}</span>
        </div>
        <div className="flex justify-end px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-hairline rounded hover:bg-hairline/20">Close</button>
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
  // opened from the Dashboard for one asset: show just that asset
  useEffect(() => { const f = takeNavFilter('assets'); if (f?.query) setQuery(f.query) }, [])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [viewingAsset, setViewingAsset] = useState(null)
  const [pieceAsset, setPieceAsset] = useState(null)
  const [prevLocByAsset, setPrevLocByAsset] = useState({})
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(30)

  const canWrite = profile?.role === 'admin' || profile?.role === 'manager'
  const canDelete = profile?.role === 'admin'

  const load = async () => {
    setLoading(true)
    const [a, m] = await Promise.all([
      supabase.from('assets_computed').select('*').order('asset_code'),
      supabase.from('movement_log').select('asset_id, from_location, id').order('movement_date', { ascending: false }).order('id', { ascending: false }),
    ])
    // Previous Location = where the asset was before its latest movement
    const prev = {}
    ;(m.data || []).forEach(x => { if (x.asset_id != null && !(x.asset_id in prev)) prev[x.asset_id] = x.from_location })
    setPrevLocByAsset(prev)
    setRows(a.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const scoped = currentPropertyId === 'all' ? rows : rows.filter(r => r.property_id === currentPropertyId)

  const filtered = scoped.filter(r =>
    (!query || matchesQuery(query, [
      r.asset_code, r.property_name, r.asset_name, r.category, r.sub_category, r.brand, r.model, r.serial_number,
      r.registered_qty, r.disposal_qty, prevLocByAsset[r.id], r.location, r.actual_location, r.department,
      r.assigned_to, r.status, r.disposal_reason, r.disposal_date, r.condition, r.current_asset_value,
    ])) &&
    (!categoryFilter || r.category === categoryFilter) &&
    (!locationFilter || r.location === locationFilter || r.actual_location === locationFilter) &&
    (!statusFilter || r.status === statusFilter)
  )

  useEffect(() => { setPage(0) }, [query, categoryFilter, locationFilter, statusFilter, currentPropertyId])

  // totals cover every filtered asset, not just the current page
  const totalReg = filtered.reduce((sum, r) => sum + Number(r.registered_qty || 0), 0)
  const totalDisposed = filtered.reduce((sum, r) => sum + Number(r.disposal_qty || 0), 0)
  // each row's Current Value = value of one piece x pieces on hand
  const rowValue = (r) => (r.current_asset_value == null ? null : Number(r.current_asset_value) * Number(r.registered_qty || 0))
  const totalValue = filtered.reduce((sum, r) => sum + (rowValue(r) || 0), 0)

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
          <thead className="bg-theme-active text-theme-text text-xs uppercase tracking-wide">
            <tr>
              {['Property', 'ID', 'Photo', 'Asset Name', 'Brand', 'Serial #', 'Category', 'Sub-Category', 'Reg. Qty', 'Disposed Qty', 'Previous Location', 'Actual Location', 'Assigned To', 'Status', 'Condition', 'Disposal Reason', 'Current Value', 'QR', ''].map(h => (
                <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => (
              <tr key={r.id} className="border-t border-hairline hover:bg-hairline/20">
                <td className="px-3 py-2 whitespace-nowrap text-muted">{r.property_name}</td>
                <td className="px-3 py-2 whitespace-nowrap font-medium">
                  <button onClick={() => setViewingAsset(r)} title="View full details" className="text-theme-accent hover:underline font-medium">{r.asset_code}</button>
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => setViewingAsset(r)} title="View full details" className="block">
                    {r.photo_url
                      ? <img src={r.photo_url} alt="" className="h-10 w-10 rounded border border-hairline object-cover" />
                      : <span className="h-10 w-10 rounded border border-dashed border-hairline flex items-center justify-center text-[10px] text-muted">No photo</span>}
                  </button>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{r.asset_name}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.brand}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.serial_number}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.category}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.sub_category}</td>
                <td className={`px-3 py-2 whitespace-nowrap font-medium ${Number(r.registered_qty) <= 0 ? 'text-danger' : ''}`} title="Quantity still on hand">{qty(r.registered_qty)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-muted">{qty(r.disposal_qty)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-muted">{prevLocByAsset[r.id] || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.actual_location}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.assigned_to}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.status}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.condition}</td>
                <td className="px-3 py-2 whitespace-nowrap" title={r.disposal_date ? `Last disposal: ${r.disposal_date}` : undefined}>{r.disposal_reason || ''}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {rowValue(r) == null
                    ? <button onClick={() => setPieceAsset(r)} className="text-muted hover:underline" title="Value per piece">—</button>
                    : <button onClick={() => setPieceAsset(r)} className="text-theme-accent font-medium hover:underline" title="Click for the value of each piece">{peso2(rowValue(r))}</button>}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <button onClick={() => setViewingAsset(r)} className="text-theme-accent underline">View</button>
                </td>
                <td className="px-3 py-2 whitespace-nowrap space-x-3">
                  {canWrite && <button onClick={() => { setEditing(r); setShowForm(true) }} className="text-ink underline">Edit</button>}
                  {canDelete && <button onClick={() => remove(r)} className="text-danger underline">Delete</button>}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={19} className="px-3 py-6 text-center text-muted">No assets match.</td></tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-theme-accent bg-theme-bg font-medium">
                <td className="px-3 py-2 whitespace-nowrap" colSpan={8}>Total · {filtered.length} {filtered.length === 1 ? 'asset' : 'assets'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{num(totalReg)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-muted">{num(totalDisposed)}</td>
                <td className="px-3 py-2" colSpan={6}></td>
                <td className="px-3 py-2 whitespace-nowrap" title="Value of one piece × pieces on hand, added up">{peso2(totalValue)}</td>
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

      {pieceAsset && <PieceValueModal asset={pieceAsset} onClose={() => setPieceAsset(null)} />}

      {viewingAsset && (
        <AssetDetailModal asset={viewingAsset} onClose={() => setViewingAsset(null)} />
      )}
    </div>
  )
}
