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
  'registered_qty', 'disposal_qty', 'property_id',
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

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1">{label}</span>
      {children}
    </label>
  )
}

function AssetForm({ initial, lookups, properties, defaultPropertyId, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { ...EMPTY, property_id: defaultPropertyId !== 'all' ? defaultPropertyId : '' })
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

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    // only send actual writable columns — `form` may carry extra computed
    // fields (accumulated_depreciation, qr_url, property_name, etc.) when
    // editing, since it was seeded from the assets_computed view
    const payload = {}
    WRITABLE_FIELDS.forEach(k => { payload[k] = form[k] })
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
            {saving ? 'Saving…' : 'Save Asset'}
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
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
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
    !query ||
    [r.asset_code, r.asset_name, r.category, r.location, r.department, r.assigned_to, r.serial_number]
      .filter(Boolean).some(v => v.toLowerCase().includes(query.toLowerCase()))
  )

  useEffect(() => { setPage(0) }, [query, currentPropertyId])

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

      <input placeholder="Search by ID, name, category, location, assignee…" value={query} onChange={e => setQuery(e.target.value)}
        className="input mb-4 max-w-md" />

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
                  <a href={r.qr_url} target="_blank" rel="noreferrer" className="text-gold underline">View</a>
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
    </div>
  )
}
