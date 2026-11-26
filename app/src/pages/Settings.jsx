import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AccountPanel from './AccountPanel'
import ImportExportPanel from './ImportExportPanel'
import FullBackupPanel from './FullBackupPanel'
import { useProperty } from '../lib/PropertyContext'
import { useLookups } from '../lib/useLookups'
import { forProperty, withCurrent } from '../lib/propertyScope'

// supabase-js only gives a generic "non-2xx status code" message on function errors;
// the actual reason is in the response body, so pull it out for a useful message.
async function extractFnError(error, data) {
  if (data?.error) return data.error
  if (error?.context && typeof error.context.json === 'function') {
    try {
      const body = await error.context.json()
      if (body?.error) return body.error
    } catch { /* not JSON, fall through */ }
  }
  return error?.message || 'Something went wrong.'
}

const LOOKUP_TABLES = [
  { key: 'categories', label: 'Categories' },
  { key: 'locations', label: 'Locations' },
  { key: 'departments', label: 'Departments' },
  { key: 'statuses', label: 'Statuses' },
  { key: 'conditions', label: 'Conditions' },
  { key: 'acquisition_types', label: 'Acquisition Types' },
  { key: 'movement_types', label: 'Movement Types' },
  { key: 'movement_reasons', label: 'Movement Reasons' },
  { key: 'assignees', label: 'Assignees' },
]

function AddUserForm({ onCancel, onCreated }) {
  const { lookups } = useLookups()
  const { properties } = useProperty()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'staff', department: '', property_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    const payload = { ...form, property_id: form.property_id ? Number(form.property_id) : null }
    const { data, error } = await supabase.functions.invoke('admin-create-user', { body: payload })
    setSaving(false)
    if (error || data?.error) { setError(await extractFnError(error, data)); return }
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-start justify-center overflow-y-auto py-10 z-50">
      <form onSubmit={submit} className="bg-surface rounded shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="font-display text-xl">Add User</h2>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Full name</span>
          <input required value={form.full_name} onChange={set('full_name')} className="input" />
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Email</span>
          <input required type="email" value={form.email} onChange={set('email')} className="input" />
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Password</span>
          <input required type="text" minLength={6} value={form.password} onChange={set('password')} className="input" />
          <span className="block text-xs text-muted mt-1">At least 6 characters. Share it with them securely.</span>
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Department</span>
          <select value={form.department} onChange={set('department')} className="input">
            <option value="">—</option>
            {withCurrent(forProperty(lookups?.departments, form.property_id), form.department).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Property</span>
          <select value={form.property_id} onChange={set('property_id')} className="input">
            <option value="">All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Role</span>
          <select value={form.role} onChange={set('role')} className="input">
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </select>
        </label>
        {error && <div className="text-sm text-danger">{error}</div>}
        <div className="flex justify-end gap-3 pt-2 border-t border-hairline">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-muted hover:text-ink">Cancel</button>
          <button disabled={saving} type="submit" className="px-4 py-2 text-sm bg-theme-accent text-white rounded hover:bg-theme-accent/90 disabled:opacity-50">
            {saving ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  )
}

function EditUserForm({ user, onCancel, onSaved }) {
  const { lookups } = useLookups()
  const { properties } = useProperty()
  const [fullName, setFullName] = useState(user.full_name || '')
  const [department, setDepartment] = useState(user.department || '')
  const [propertyId, setPropertyId] = useState(user.property_id ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword && newPassword.length < 6) { setError('New password must be at least 6 characters.'); return }
    setSaving(true)

    const { error } = await supabase.from('profiles')
      .update({ full_name: fullName, department, property_id: propertyId ? Number(propertyId) : null })
      .eq('id', user.id)
    if (error) { setSaving(false); setError(error.message); return }

    if (newPassword) {
      const { data, error: pwError } = await supabase.functions.invoke('admin-reset-password', {
        body: { id: user.id, password: newPassword },
      })
      setSaving(false)
      if (pwError || data?.error) { setError(await extractFnError(pwError, data)); return }
    } else {
      setSaving(false)
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-start justify-center overflow-y-auto py-10 z-50">
      <form onSubmit={submit} className="bg-surface rounded shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="font-display text-xl">Edit User</h2>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Full name</span>
          <input required value={fullName} onChange={e => setFullName(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Department</span>
          <select value={department} onChange={e => setDepartment(e.target.value)} className="input">
            <option value="">—</option>
            {withCurrent(forProperty(lookups?.departments, propertyId), department).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Property</span>
          <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className="input">
            <option value="">All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="block border-t border-hairline pt-4">
          <span className="block text-xs text-muted mb-1">New password</span>
          <input type="text" minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input" placeholder="Leave blank to keep current password" />
        </label>
        {error && <div className="text-sm text-danger">{error}</div>}
        <div className="flex justify-end gap-3 pt-2 border-t border-hairline">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-muted hover:text-ink">Cancel</button>
          <button disabled={saving} type="submit" className="px-4 py-2 text-sm bg-theme-accent text-white rounded hover:bg-theme-accent/90 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

// Admin: set or change a user's 4-digit scan code (used to open assets from their QR label)
function ScanCodeModal({ user, hasCode, onClose, onSaved }) {
  const [pin, setPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    if (!/^\d{4}$/.test(pin)) { setError('Enter exactly 4 digits.'); return }
    setSaving(true); setError('')
    const { error } = await supabase.rpc('set_scan_pin', { p_user: user.id, p_pin: pin })
    setSaving(false)
    if (error) { setError(error.message); return }
    onSaved(`Scan code ${hasCode ? 'changed' : 'set'} for ${user.full_name}. Tell them their code privately.`)
  }
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-start justify-center py-16 px-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div>
          <h2 className="font-display text-xl">{hasCode ? 'Change' : 'Set'} scan code</h2>
          <p className="text-sm text-muted mt-1">{user.full_name} uses this 4-digit code to open assets by scanning their QR labels. Each user’s code must be different.</p>
        </div>
        <input autoFocus value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={e => { if (e.key === 'Enter') save() }}
          inputMode="numeric" placeholder="4 digits" aria-label="4-digit scan code" className="input text-center text-2xl tracking-[0.6em] font-semibold" />
        {error && <div className="text-sm text-danger">{error}</div>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-ink">Cancel</button>
          <button onClick={save} disabled={saving || pin.length !== 4} className="px-4 py-2 text-sm bg-theme-accent text-white rounded disabled:opacity-50">{saving ? 'Saving…' : 'Save code'}</button>
        </div>
      </div>
    </div>
  )
}

function UsersPanel({ currentUserId }) {
  const { properties } = useProperty()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const [{ data }, codes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.rpc('scan_pin_status'),
    ])
    setUsers(data || [])
    setCodes(Object.fromEntries((codes.data || []).map(c => [c.user_id, c.set_at])))
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  // scan codes: which users have one (the codes themselves are never shown)
  const [codes, setCodes] = useState({})
  const [codeFor, setCodeFor] = useState(null)
  const [codeNotice, setCodeNotice] = useState('')
  const removeCode = async (u) => {
    if (!confirm(`Remove ${u.full_name}'s scan code? They will no longer be able to open assets by scanning.`)) return
    const { error } = await supabase.rpc('clear_scan_pin', { p_user: u.id })
    if (error) { setError(error.message); return }
    setCodeNotice(`Scan code removed for ${u.full_name}.`); load()
  }

  const setRole = async (id, role) => {
    await supabase.from('profiles').update({ role }).eq('id', id)
    load()
  }

  const remove = async (user) => {
    if (user.id === currentUserId) { alert("You can't delete your own account while signed in."); return }
    if (!confirm(`Delete ${user.full_name}'s account? This cannot be undone.`)) return
    setDeletingId(user.id); setError('')
    const { data, error } = await supabase.functions.invoke('admin-delete-user', { body: { id: user.id } })
    setDeletingId(null)
    if (error || data?.error) { setError(await extractFnError(error, data)); return }
    load()
  }

  if (loading) return <div className="text-muted text-sm">Loading users…</div>

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-theme-accent text-white rounded hover:bg-theme-accent/90">
          Add User
        </button>
      </div>
      {error && <div className="text-sm text-danger mb-3">{error}</div>}
      <div className="overflow-x-auto border border-hairline rounded">
        <table className="w-full text-sm">
          <thead className="bg-theme-active text-theme-text text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Department</th>
              <th className="text-left px-3 py-2">Property</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-left px-3 py-2">Scan Code</th>
              <th className="text-left px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-hairline">
                <td className="px-3 py-2">{u.full_name}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {u.email ? <a href={`mailto:${u.email}`} className="text-theme-accent hover:underline">{u.email}</a> : <span className="text-muted">—</span>}
                </td>
                <td className="px-3 py-2">{u.department}</td>
                <td className="px-3 py-2 text-muted">
                  {properties.find(p => p.id === u.property_id)?.name || '—'}
                </td>
                <td className="px-3 py-2">
                  <select value={u.role} onChange={e => setRole(u.id, e.target.value)} className="input max-w-[10rem]">
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {codes[u.id]
                    ? <span className="text-success" title={`Set on ${new Date(codes[u.id]).toLocaleDateString()}`}>● Set</span>
                    : <span className="text-muted">Not set</span>}
                  <button onClick={() => setCodeFor(u)} className="ml-3 text-ink underline">{codes[u.id] ? 'Change' : 'Set'}</button>
                  {codes[u.id] && <button onClick={() => removeCode(u)} className="ml-3 text-danger underline">Remove</button>}
                </td>
                <td className="px-3 py-2 whitespace-nowrap space-x-3">
                  <button onClick={() => setEditing(u)} className="text-ink underline">Edit</button>
                  <button
                    onClick={() => remove(u)}
                    disabled={deletingId === u.id || u.id === currentUserId}
                    className="text-danger underline disabled:opacity-40 disabled:no-underline">
                    {deletingId === u.id ? 'Deleting…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {codeNotice && <div className="mt-3 text-sm rounded border border-[#97C459] bg-[#F4FAEC] text-[#27500A] px-3 py-2">{codeNotice}</div>}
      {codeFor && <ScanCodeModal user={codeFor} hasCode={!!codes[codeFor.id]} onClose={() => setCodeFor(null)}
        onSaved={(msg) => { setCodeFor(null); setCodeNotice(msg); load() }} />}
      {showAdd && (
        <AddUserForm onCancel={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load() }} />
      )}
      {editing && (
        <EditUserForm user={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
      )}
    </div>
  )
}

function LookupPanel({ table, label }) {
  const { properties } = useProperty()
  const scoped = table === 'locations' || table === 'departments'
  const [propId, setPropId] = useState('')
  const [items, setItems] = useState([])
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from(table).select('*').order('name')
    setItems(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [table])

  const add = async (e) => {
    e.preventDefault()
    setError('')
    if (!value.trim()) return
    const row = { name: value.trim() }
    if (scoped && propId) row.property_id = Number(propId)
    const { error } = await supabase.from(table).insert(row)
    if (error) { setError(error.message); return }
    setValue('')
    load()
  }

  const remove = async (id) => {
    await supabase.from(table).delete().eq('id', id)
    load()
  }

  // Categories: standard useful life (years) used for depreciation when an asset has none of its own
  const isCategories = table === 'categories'
  const [lifeDraft, setLifeDraft] = useState({})
  const saveLife = async (item) => {
    const raw = lifeDraft[item.id]
    if (raw === undefined) return
    const v = raw === '' ? null : Number(raw)
    if (v !== null && (!(v > 0) || v > 100)) { setError('Useful life must be between 0 and 100 years.'); return }
    setError('')
    const { error } = await supabase.from('categories').update({ default_useful_life_years: v }).eq('id', item.id)
    if (error) { setError(error.message); return }
    setLifeDraft(d => { const n = { ...d }; delete n[item.id]; return n })
    load()
  }

  return (
    <div className="border border-hairline bg-surface rounded p-4">
      <h3 className="font-medium text-sm mb-3">{label}</h3>
      {isCategories && (
        <p className="text-xs text-muted -mt-2 mb-3">Useful life (years) is the standard used to work out current value for assets that don’t have their own.</p>
      )}
      <form onSubmit={add} className="flex gap-2 mb-3">
        {scoped && (
          <select value={propId} onChange={e => setPropId(e.target.value)} className="input w-auto" title="Which property this belongs to">
            <option value="">All properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <input value={value} onChange={e => setValue(e.target.value)} placeholder={`Add ${label.toLowerCase().replace(/s$/, '')}…`} className="input" />
        <button className="px-3 py-2 text-sm bg-theme-accent text-white rounded hover:bg-theme-accent/90 whitespace-nowrap">Add</button>
      </form>
      {error && <div className="text-xs text-danger mb-2">{error}</div>}
      {loading ? <div className="text-xs text-muted">Loading…</div> : (
        <ul className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
          {items.map(i => (
            <li key={i.id} className="flex justify-between items-center text-sm px-2 py-1 rounded hover:bg-hairline/20">
              <span>
                {i.name}
                {scoped && (
                  <span className="text-xs text-muted"> — {properties.find(p => p.id === i.property_id)?.name || 'All properties'}</span>
                )}
              </span>
              <span className="flex items-center gap-3">
                {isCategories && (
                  <label className="flex items-center gap-1 text-xs text-muted" title="Standard useful life for this category">
                    <input type="number" min="0.5" max="100" step="0.5" aria-label={`Useful life for ${i.name}`}
                      value={lifeDraft[i.id] ?? (i.default_useful_life_years ?? '')}
                      onChange={e => setLifeDraft(d => ({ ...d, [i.id]: e.target.value }))}
                      onBlur={() => saveLife(i)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                      className="input w-16 py-0.5 px-1.5 text-xs text-right" />
                    yrs
                  </label>
                )}
                <button onClick={() => remove(i.id)} className="text-xs text-danger underline">Remove</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SubCategoryPanel() {
  const [categories, setCategories] = useState([])
  const [subCategories, setSubCategories] = useState([])
  const [categoryId, setCategoryId] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const [c, s] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('sub_categories').select('*').order('name'),
    ])
    setCategories(c.data || [])
    setSubCategories(s.data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault()
    setError('')
    if (!categoryId || !name.trim()) return
    const { error } = await supabase.from('sub_categories').insert({ category_id: Number(categoryId), name: name.trim() })
    if (error) { setError(error.message); return }
    setName('')
    load()
  }

  const remove = async (id) => {
    await supabase.from('sub_categories').delete().eq('id', id)
    load()
  }

  const categoryName = (id) => categories.find(c => c.id === id)?.name || 'Unknown category'

  return (
    <div className="border border-hairline bg-surface rounded p-4">
      <h3 className="font-medium text-sm mb-3">Sub-Categories</h3>
      <form onSubmit={add} className="flex gap-2 mb-3 flex-wrap">
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="input flex-1 min-w-[140px]">
          <option value="">Select category…</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Add sub-category…" className="input flex-1 min-w-[140px]" />
        <button className="px-3 py-2 text-sm bg-theme-accent text-white rounded hover:bg-theme-accent/90 whitespace-nowrap">Add</button>
      </form>
      {error && <div className="text-xs text-danger mb-2">{error}</div>}
      {loading ? <div className="text-xs text-muted">Loading…</div> : (
        <ul className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
          {subCategories.map(s => (
            <li key={s.id} className="flex justify-between items-center text-sm px-2 py-1 rounded hover:bg-hairline/20">
              <span>{s.name} <span className="text-muted">— {categoryName(s.category_id)}</span></span>
              <button onClick={() => remove(s.id)} className="text-xs text-danger underline">Remove</button>
            </li>
          ))}
          {subCategories.length === 0 && <li className="text-xs text-muted px-2 py-2">No sub-categories yet.</li>}
        </ul>
      )}
    </div>
  )
}

function PropertiesPanel() {
  const { properties, reload } = useProperty()
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const add = async (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('properties').insert({ name: name.trim(), logo_url: logoUrl.trim() || null })
    setSaving(false)
    if (error) { setError(error.message); return }
    setName(''); setLogoUrl('')
    reload()
  }

  const [editingPrefix, setEditingPrefix] = useState(null) // { id, value }
  const savePrefix = async () => {
    const v = (editingPrefix.value || '').trim().toUpperCase()
    if (!/^[A-Z0-9]{1,8}$/.test(v)) { setError('A prefix is 1–8 letters or numbers, e.g. VBR.'); return }
    setError('')
    const { error } = await supabase.from('properties').update({ asset_prefix: v }).eq('id', editingPrefix.id)
    if (error) { setError(error.message); return }
    setEditingPrefix(null)
    reload()
  }

  const remove = async (p) => {
    if (!confirm(`Delete "${p.name}"? Assets assigned to it will become unassigned, not deleted.`)) return
    await supabase.from('properties').delete().eq('id', p.id)
    reload()
  }

  return (
    <div className="max-w-2xl">
      <div className="border border-hairline bg-surface rounded p-4 mb-6">
        <h3 className="font-medium text-sm mb-3">Add Property</h3>
        <form onSubmit={add} className="flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Property name" className="input" />
          <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="Logo URL (optional)" className="input" />
          <button disabled={saving} className="px-4 py-2 text-sm bg-theme-accent text-white rounded hover:bg-theme-accent/90 whitespace-nowrap disabled:opacity-50">
            Add
          </button>
        </form>
        {error && <div className="text-sm text-danger mt-2">{error}</div>}
      </div>

      <ul className="space-y-2">
        {properties.map(p => (
          <li key={p.id} className="flex items-center justify-between border border-hairline bg-surface rounded px-4 py-2.5">
            <div className="flex items-center gap-3">
              {p.logo_url ? (
                <img src={p.logo_url} alt="" className="h-8 w-8 rounded-full object-contain bg-white border border-hairline" />
              ) : (
                <span className="h-8 w-8 rounded-full bg-hairline" />
              )}
              <span className="text-sm">{p.name}</span>
            </div>
            <div className="flex items-center gap-4">
              {editingPrefix?.id === p.id ? (
                <span className="flex items-center gap-2">
                  <input autoFocus value={editingPrefix.value} maxLength={8}
                    onChange={e => setEditingPrefix({ id: p.id, value: e.target.value.toUpperCase() })}
                    onKeyDown={e => { if (e.key === 'Enter') savePrefix(); if (e.key === 'Escape') setEditingPrefix(null) }}
                    className="input w-24 py-1 text-xs uppercase" aria-label="Asset number prefix" />
                  <button onClick={savePrefix} className="text-xs text-theme-accent underline">Save</button>
                  <button onClick={() => setEditingPrefix(null)} className="text-xs text-muted underline">Cancel</button>
                </span>
              ) : p.asset_prefix ? (
                <button onClick={() => setEditingPrefix({ id: p.id, value: p.asset_prefix })} title="Change the prefix used for new asset numbers"
                  className="text-xs text-muted hover:text-ink">
                  Asset no. <span className="font-medium text-ink">{p.asset_prefix}-WC-001</span> <span className="underline">Edit</span>
                </button>
              ) : null}
              <button onClick={() => remove(p)} className="text-xs text-danger underline">Delete</button>
            </div>
          </li>
        ))}
        {properties.length === 0 && <li className="text-sm text-muted text-center py-6">No properties yet.</li>}
      </ul>
    </div>
  )
}

export default function Settings({ profile, onProfileChange }) {
  const isAdmin = profile?.role === 'admin'
  const canImportExport = profile?.role === 'admin' || profile?.role === 'manager'
  const TABS = [
    { key: 'account', label: 'My Account' },
    { key: 'users', label: 'Users', show: isAdmin },
    { key: 'properties', label: 'Properties', show: isAdmin },
    { key: 'lookups', label: 'Lookups', show: isAdmin },
    { key: 'data', label: 'Import / Export', show: canImportExport },
  ].filter(t => t.show === undefined || t.show)
  const [tab, setTab] = useState('account')

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Settings</h1>
      <p className="text-sm text-muted mb-6">Manage your account, user roles, properties, dropdown lists, and data import/export.</p>

      <div className="flex gap-2 mb-6 border-b border-hairline">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm -mb-px border-b-2 ${tab === t.key ? 'border-theme-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'account' && <AccountPanel profile={profile} onProfileChange={onProfileChange} />}
      {tab === 'users' && isAdmin && <UsersPanel currentUserId={profile?.id} />}
      {tab === 'properties' && isAdmin && <PropertiesPanel />}
      {tab === 'lookups' && isAdmin && (
        <div className="grid grid-cols-2 gap-4">
          {LOOKUP_TABLES.map(t => (
            <React.Fragment key={t.key}>
              <LookupPanel table={t.key} label={t.label} />
              {t.key === 'categories' && <SubCategoryPanel />}
            </React.Fragment>
          ))}
        </div>
      )}
      {tab === 'data' && canImportExport && (
        <div className="space-y-8">
          <ImportExportPanel />
          {isAdmin && <FullBackupPanel />}
        </div>
      )}
    </div>
  )
}
