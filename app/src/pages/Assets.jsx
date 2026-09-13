import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useLookups } from '../lib/useLookups'
import { useProperty } from '../lib/PropertyContext'
import Pagination from '../components/Pagination'

const WRITABLE_FIELDS = [
  'asset_name', 'category', 'sub_category', 'brand', 'model', 'serial_number',
  'location', 'department', 'assigned_to', 'status', 'condition',
  'acquisition_date', 'acquisition_type', 'purchase_cost', 'supplier',
  'warranty_start', 'warranty_expiry', 'last_maintenance', 'maintenance_frequency_days',
  'useful_life_years', 'disposal_date', 'disposal_reason', 'remarks',
  'registered_qty', 'disposal_qty', 'property_id', 'photo_url',
]

const EMPTY = {
  asset_name: '', category: '', sub_category: '', brand: '', model: '', serial_number: '',
  location: '', department: '', assigned_to: '', status: 'Active', condition: '',
  acquisition_date: '', acquisition_type: '', purchase_cost: '', supplier: '',
  warranty_start: '', warranty_expiry: '', last_maintenance: '', maintenance_frequency_days: '',
  useful_life_years: '', disposal_date: '', disposal_reason: '', remarks: '',
  registered_qty: 1, disposal_qty: 0,
}

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

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1">{label}</span>
      {children}
    </label>
  )
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

function AssetForm({ initial, lookups, properties, defaultPropertyId, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { ...EMPTY, property_id: defaultPropertyId !== 'all' ? defaultPropertyId : '' })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(initial?.photo_url || '')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const subOptions = useMemo(
    () => lookups.sub_categories.filter(s => {
      const cat = lookups.categories.find(c => c.name === form.category)
      return cat && s.category_id === cat.id
    }),
    [form.category, lookups]
  )

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const onPickPhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const removePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview('')
    setForm(f => ({ ...f, photo_url: null }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')

    let photoUrl = form.photo_url ?? null
    if (photoFile) {
      setUploadingPhoto(true)
      const path = `${Date.now()}-${photoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: uploadErr } = await supabase.storage.from('asset-photos').upload(path, photoFile, { upsert: true })
      setUploadingPhoto(false)
      if (uploadErr) { setSaving(false); setError(`Photo upload failed: ${uploadErr.message}`); return }
      photoUrl = supabase.storage.from('asset-photos').getPublicUrl(path).data.publicUrl
    }

    // only send actual writable columns — `form` may carry extra computed
    // fields (accumulated_depreciation, qr_url, property_name, etc.) when
    // editing, since it was seeded from the assets_computed view
    const payload = {}
    WRITABLE_FIELDS.forEach(k => { payload[k] = form[k] })
    payload.photo_url = photoUrl
    ;['purchase_cost', 'maintenance_frequency_days', 'useful_life_years', 'registered_qty', 'disposal_qty']
      .forEach(k => { payload[k] = payload[k] === '' ? null : Number(payload[k]) })
    ;['acquisition_date', 'warranty_start', 'warranty_expiry', 'last_maintenance', 'disposal_date']
      .forEach(k => { payload[k] = payload[k] === '' ? null : payload[k] })

    const { error } = initial?.id
      ? await supabase.from('assets').update(payload).eq('id', initial.id)
      : await supabase.from('assets').insert(payload)

    setSaving(false)
    if (error) { setError(error.message); return }
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-start justify-center overflow-y-auto py-10 z-50">
      <form onSubmit={submit} className="bg-surface rounded shadow-xl w-full max-w-3xl p-6 space-y-5">
        <h2 className="font-display text-xl">{initial?.id ? 'Edit Asset' : 'Add Asset'}</h2>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Asset Name"><input required value={form.asset_name} onChange={set('asset_name')} className="input" /></Field>
          <Field label="Property">
            <select required value={form.property_id ?? ''} onChange={e => setForm(f => ({ ...f, property_id: e.target.value ? Number(e.target.value) : null }))} className="input">
              <option value="">—</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select value={form.category} onChange={set('category')} className="input">
              <option value="">—</option>
              {lookups.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Sub-Category">
            <select value={form.sub_category} onChange={set('sub_category')} className="input">
              <option value="">—</option>
              {subOptions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Brand"><input value={form.brand} onChange={set('brand')} className="input" /></Field>
          <Field label="Model"><input value={form.model} onChange={set('model')} className="input" /></Field>
          <Field label="Serial Number"><input value={form.serial_number} onChange={set('serial_number')} className="input" /></Field>

          <div className="col-span-3">
            <span className="block text-xs text-muted mb-1">Photo</span>
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="w-20 h-20 object-cover rounded border border-hairline" />
              ) : (
                <div className="w-20 h-20 rounded border border-dashed border-hairline flex items-center justify-center text-xs text-muted">No photo</div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="px-3 py-2 text-sm border border-hairline rounded hover:bg-hairline/20 cursor-pointer inline-block w-fit">
                  {photoPreview ? 'Replace Photo' : 'Upload Photo'}
                  <input type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
                </label>
                {photoPreview && (
                  <button type="button" onClick={removePhoto} className="text-xs text-danger underline text-left w-fit">Remove photo</button>
                )}
              </div>
            </div>
          </div>

          <Field label="Location">
            <select value={form.location} onChange={set('location')} className="input">
              <option value="">—</option>
              {lookups.locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Department">
            <select value={form.department} onChange={set('department')} className="input">
              <option value="">—</option>
              {lookups.departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Assigned To">
            <select value={form.assigned_to} onChange={set('assigned_to')} className="input">
              <option value="">—</option>
              {lookups.assignees.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </Field>

          <Field label="Status">
            <select value={form.status} onChange={set('status')} className="input">
              {lookups.statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Condition">
            <select value={form.condition} onChange={set('condition')} className="input">
              <option value="">—</option>
              {lookups.conditions.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Acquisition Type">
            <select value={form.acquisition_type} onChange={set('acquisition_type')} className="input">
              <option value="">—</option>
              {lookups.acquisition_types.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </Field>

          <Field label="Acquisition Date"><input type="date" value={form.acquisition_date || ''} onChange={set('acquisition_date')} className="input" /></Field>
          <Field label="Purchase Cost"><input type="number" step="0.01" value={form.purchase_cost ?? ''} onChange={set('purchase_cost')} className="input" /></Field>
          <Field label="Supplier"><input value={form.supplier} onChange={set('supplier')} className="input" /></Field>

          <Field label="Warranty Start"><input type="date" value={form.warranty_start || ''} onChange={set('warranty_start')} className="input" /></Field>
          <Field label="Warranty Expiry"><input type="date" value={form.warranty_expiry || ''} onChange={set('warranty_expiry')} className="input" /></Field>
          <Field label="Last Maintenance"><input type="date" value={form.last_maintenance || ''} onChange={set('last_maintenance')} className="input" /></Field>

          <Field label="Maintenance Frequency (days)"><input type="number" value={form.maintenance_frequency_days ?? ''} onChange={set('maintenance_frequency_days')} className="input" /></Field>
          <Field label="Useful Life (years)"><input type="number" step="0.1" value={form.useful_life_years ?? ''} onChange={set('useful_life_years')} className="input" /></Field>
          <Field label="Registered Qty"><input type="number" step="0.01" value={form.registered_qty ?? ''} onChange={set('registered_qty')} className="input" /></Field>

          <Field label="Disposal Qty"><input type="number" step="0.01" value={form.disposal_qty ?? ''} onChange={set('disposal_qty')} className="input" /></Field>
          <Field label="Disposal Date"><input type="date" value={form.disposal_date || ''} onChange={set('disposal_date')} className="input" /></Field>
          <Field label="Disposal Reason">
            <select value={form.disposal_reason} onChange={set('disposal_reason')} className="input">
              <option value="">—</option>
              {lookups.disposal_reasons.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </Field>

          <div className="col-span-3">
            <Field label="Remarks"><textarea value={form.remarks} onChange={set('remarks')} className="input" rows={2} /></Field>
          </div>
        </div>

        {error && <div className="text-sm text-danger">{error}</div>}

        <div className="flex justify-end gap-3 pt-2 border-t border-hairline">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-muted hover:text-ink">Cancel</button>
          <button disabled={saving} type="submit" className="px-4 py-2 text-sm bg-ink text-paper rounded hover:bg-ink/90 disabled:opacity-50">
            {uploadingPhoto ? 'Uploading photo…' : saving ? 'Saving…' : 'Save Asset'}
          </button>
        </div>
      </form>
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
    (!query ||
      [r.asset_code, r.asset_name, r.category, r.location, r.department, r.assigned_to, r.serial_number]
        .filter(Boolean).some(v => v.toLowerCase().includes(query.toLowerCase()))
    ) &&
    (!categoryFilter || r.category === categoryFilter) &&
    (!locationFilter || r.location === locationFilter) &&
    (!statusFilter || r.status === statusFilter)
  )

  useEffect(() => { setPage(0) }, [query, categoryFilter, locationFilter, statusFilter, currentPropertyId])

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
        {canWrite && (
          <button onClick={() => { setEditing(null); setShowForm(true) }}
            className="px-4 py-2 text-sm bg-ink text-paper rounded hover:bg-ink/90">
            Add Asset
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input placeholder="Search assets…" value={query} onChange={e => setQuery(e.target.value)}
          className="input flex-1 min-w-[200px]" />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input w-auto">
          <option value="">All categories</option>
          {lookups.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="input w-auto">
          <option value="">All locations</option>
          {lookups.locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">All statuses</option>
          {lookups.statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto border border-hairline rounded scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="bg-ink text-paper text-xs uppercase tracking-wide">
            <tr>
              {['ID', 'Property', 'Name', 'Category', 'Location', 'Assigned To', 'Status', 'Condition', 'Current Value', 'QR', ''].map(h => (
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
                <td className="px-3 py-2 whitespace-nowrap">{r.location}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.assigned_to}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.status}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.condition}</td>
                <td className="px-3 py-2 whitespace-nowrap">{peso(r.current_asset_value)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <button onClick={() => setViewingAsset(r)} className="text-gold underline">View</button>
                </td>
                <td className="px-3 py-2 whitespace-nowrap space-x-3">
                  {canWrite && <button onClick={() => { setEditing(r); setShowForm(true) }} className="text-ink underline">Edit</button>}
                  {canDelete && <button onClick={() => remove(r)} className="text-danger underline">Delete</button>}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={11} className="px-3 py-6 text-center text-muted">No assets match.</td></tr>
            )}
          </tbody>
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
