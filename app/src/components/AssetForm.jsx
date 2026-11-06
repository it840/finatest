import React, { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { forProperty, withCurrent } from '../lib/propertyScope'

export const WRITABLE_FIELDS = [
  'asset_name', 'category', 'sub_category', 'brand', 'model', 'serial_number',
  'location', 'actual_location', 'department', 'assigned_to', 'status', 'condition',
  'acquisition_date', 'acquisition_type', 'purchase_cost', 'supplier',
  'warranty_start', 'warranty_expiry', 'last_maintenance', 'maintenance_frequency_days',
  'useful_life_years', 'disposal_date', 'disposal_reason', 'remarks',
  'registered_qty', 'disposal_qty', 'property_id', 'photo_url',
]

export const EMPTY_ASSET = {
  asset_name: '', category: '', sub_category: '', brand: '', model: '', serial_number: '',
  location: '', actual_location: '', department: '', assigned_to: '', status: 'Active', condition: '',
  acquisition_date: '', acquisition_type: '', purchase_cost: '', supplier: '',
  warranty_start: '', warranty_expiry: '', last_maintenance: '', maintenance_frequency_days: '',
  useful_life_years: '', disposal_date: '', disposal_reason: '', remarks: '',
  registered_qty: 1, disposal_qty: 0,
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1">{label}</span>
      {children}
    </label>
  )
}

export default function AssetForm({ initial, lookups, properties, defaultPropertyId, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { ...EMPTY_ASSET, property_id: defaultPropertyId !== 'all' ? defaultPropertyId : '' })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(initial?.photo_url || '')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // match a category by name, ignoring emoji/punctuation (older or imported assets may be saved without the emoji)
  const norm = (t) => (t || '').replace(/[^\p{L}\p{N}\s/&]/gu, '').replace(/\s+/g, ' ').trim().toLowerCase()
  const selectedCat = form.category
    ? (lookups.categories.find(c => c.name === form.category) || lookups.categories.find(c => norm(c.name) === norm(form.category)))
    : null
  const subOptions = useMemo(() => {
    const list = selectedCat ? lookups.sub_categories.filter(s => s.category_id === selectedCat.id) : []
    return form.sub_category && !list.some(s => s.name === form.sub_category)
      ? [...list, { id: `current-${form.sub_category}`, name: form.sub_category }]
      : list
  }, [selectedCat, form.sub_category, lookups])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const changeCategory = (e) => {
    const name = e.target.value
    setForm(f => {
      const cat = lookups.categories.find(c => c.name === name)
      const stillValid = cat && lookups.sub_categories.some(s => s.category_id === cat.id && s.name === f.sub_category)
      return { ...f, category: name, sub_category: stillValid ? f.sub_category : '' }
    })
  }

  const changeSubCategory = (e) => {
    const v = e.target.value
    if (!selectedCat && v.includes('|')) {
      const [cid, ...rest] = v.split('|')
      const cat = lookups.categories.find(c => String(c.id) === cid)
      setForm(f => ({ ...f, category: cat ? cat.name : f.category, sub_category: rest.join('|') }))
    } else {
      setForm(f => ({ ...f, sub_category: v }))
    }
  }

  // locations and departments are limited to the selected property
  const locationOptions = withCurrent(forProperty(lookups.locations, form.property_id), form.location)
  const actualLocationOptions = withCurrent(forProperty(lookups.locations, form.property_id), form.actual_location)
  const departmentOptions = withCurrent(forProperty(lookups.departments, form.property_id), form.department)

  const changeProperty = (e) => {
    const pid = e.target.value ? Number(e.target.value) : null
    setForm(f => {
      const ok = (list, v) => !v || forProperty(list, pid).some(i => i.name === v)
      return {
        ...f,
        property_id: pid,
        location: ok(lookups.locations, f.location) ? f.location : '',
        actual_location: ok(lookups.locations, f.actual_location) ? f.actual_location : '',
        department: ok(lookups.departments, f.department) ? f.department : '',
      }
    })
  }

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
            <select required value={form.property_id ?? ''} onChange={changeProperty} className="input">
              <option value="">—</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select value={form.category} onChange={changeCategory} className="input">
              <option value="">—</option>
              {lookups.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Sub-Category">
            <select value={form.sub_category} onChange={changeSubCategory} className="input">
              <option value="">—</option>
              {selectedCat
                ? subOptions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                : lookups.categories.map(c => {
                    const subs = lookups.sub_categories.filter(s => s.category_id === c.id)
                    return subs.length === 0 ? null : (
                      <optgroup key={c.id} label={c.name}>
                        {subs.map(s => <option key={s.id} value={`${c.id}|${s.name}`}>{s.name}</option>)}
                      </optgroup>
                    )
                  })}
            </select>
            {!selectedCat && <span className="block text-xs text-muted mt-1">Pick one and its category fills in.</span>}
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

          <Field label="Location (Home Base)">
            <select value={form.location} onChange={set('location')} className="input">
              <option value="">—</option>
              {locationOptions.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Actual Location (Current)">
            <select value={form.actual_location} onChange={set('actual_location')} className="input">
              <option value="">—</option>
              {actualLocationOptions.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Department">
            <select value={form.department} onChange={set('department')} className="input">
              <option value="">—</option>
              {departmentOptions.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
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

          {/* Disposals for new assets are recorded in the Disposal Log, so these only show when editing */}
          {initial?.id && (
            <>
            <Field label="Disposal Qty"><input type="number" step="0.01" value={form.disposal_qty ?? ''} onChange={set('disposal_qty')} className="input" /></Field>
            <Field label="Disposal Date"><input type="date" value={form.disposal_date || ''} onChange={set('disposal_date')} className="input" /></Field>
            <Field label="Disposal Reason">
              <select value={form.disposal_reason} onChange={set('disposal_reason')} className="input">
                <option value="">—</option>
                {lookups.disposal_reasons.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </Field>
            </>
          )}

          <div className="col-span-3">
            <Field label="Remarks"><textarea value={form.remarks} onChange={set('remarks')} className="input" rows={2} /></Field>
          </div>
        </div>

        {error && <div className="text-sm text-danger">{error}</div>}

        <div className="flex justify-end gap-3 pt-2 border-t border-hairline">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-muted hover:text-ink">Cancel</button>
          <button disabled={saving} type="submit" className="px-4 py-2 text-sm bg-theme-accent text-white rounded hover:bg-theme-accent/90 disabled:opacity-50">
            {uploadingPhoto ? 'Uploading photo…' : saving ? 'Saving…' : 'Save Asset'}
          </button>
        </div>
      </form>
    </div>
  )
}
