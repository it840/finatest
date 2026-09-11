import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AccountPanel from './AccountPanel'
import ImportExportPanel from './ImportExportPanel'
import { useProperty } from '../lib/PropertyContext'

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
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'staff', department: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    const { data, error } = await supabase.functions.invoke('admin-create-user', { body: form })
    setSaving(false)
    if (error) { setError(error.message || 'Failed to create user.'); return }
    if (data?.error) { setError(data.error); return }
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
          <input value={form.department} onChange={set('department')} className="input" />
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
          <button disabled={saving} type="submit" className="px-4 py-2 text-sm bg-ink text-paper rounded hover:bg-ink/90 disabled:opacity-50">
            {saving ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  )
}

function EditUserForm({ user, onCancel, onSaved }) {
  const [fullName, setFullName] = useState(user.full_name || '')
  const [department, setDepartment] = useState(user.department || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    const { error } = await supabase.from('profiles')
      .update({ full_name: fullName, department })
      .eq('id', user.id)
    setSaving(false)
    if (error) { setError(error.message); return }
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
          <input value={department} onChange={e => setDepartment(e.target.value)} className="input" />
        </label>
        {error && <div className="text-sm text-danger">{error}</div>}
        <div className="flex justify-end gap-3 pt-2 border-t border-hairline">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-muted hover:text-ink">Cancel</button>
          <button disabled={saving} type="submit" className="px-4 py-2 text-sm bg-ink text-paper rounded hover:bg-ink/90 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

function UsersPanel({ currentUserId }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setUsers(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

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
    if (error) { setError(error.message || 'Failed to delete user.'); return }
    if (data?.error) { setError(data.error); return }
    load()
  }

  if (loading) return <div className="text-muted text-sm">Loading users…</div>

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-ink text-paper rounded hover:bg-ink/90">
          Add User
        </button>
      </div>
      {error && <div className="text-sm text-danger mb-3">{error}</div>}
      <div className="overflow-x-auto border border-hairline rounded">
        <table className="w-full text-sm">
          <thead className="bg-ink text-paper text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Department</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-left px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-hairline">
                <td className="px-3 py-2">{u.full_name}</td>
                <td className="px-3 py-2">{u.department}</td>
                <td className="px-3 py-2">
                  <select value={u.role} onChange={e => setRole(u.id, e.target.value)} className="input max-w-[10rem]">
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                  </select>
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
    const { error } = await supabase.from(table).insert({ name: value.trim() })
    if (error) { setError(error.message); return }
    setValue('')
    load()
  }

  const remove = async (id) => {
    await supabase.from(table).delete().eq('id', id)
    load()
  }

  return (
    <div className="border border-hairline bg-surface rounded p-4">
      <h3 className="font-medium text-sm mb-3">{label}</h3>
      <form onSubmit={add} className="flex gap-2 mb-3">
        <input value={value} onChange={e => setValue(e.target.value)} placeholder={`Add ${label.toLowerCase().replace(/s$/, '')}…`} className="input" />
        <button className="px-3 py-2 text-sm bg-ink text-paper rounded hover:bg-ink/90 whitespace-nowrap">Add</button>
      </form>
      {error && <div className="text-xs text-danger mb-2">{error}</div>}
      {loading ? <div className="text-xs text-muted">Loading…</div> : (
        <ul className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
          {items.map(i => (
            <li key={i.id} className="flex justify-between items-center text-sm px-2 py-1 rounded hover:bg-hairline/20">
              <span>{i.name}</span>
              <button onClick={() => remove(i.id)} className="text-xs text-danger underline">Remove</button>
            </li>
          ))}
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
          <button disabled={saving} className="px-4 py-2 text-sm bg-ink text-paper rounded hover:bg-ink/90 whitespace-nowrap disabled:opacity-50">
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
            <button onClick={() => remove(p)} className="text-xs text-danger underline">Delete</button>
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
            className={`px-4 py-2 text-sm -mb-px border-b-2 ${tab === t.key ? 'border-gold text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'account' && <AccountPanel profile={profile} onProfileChange={onProfileChange} />}
      {tab === 'users' && isAdmin && <UsersPanel currentUserId={profile?.id} />}
      {tab === 'properties' && isAdmin && <PropertiesPanel />}
      {tab === 'lookups' && isAdmin && (
        <div className="grid grid-cols-2 gap-4">
          {LOOKUP_TABLES.map(t => <LookupPanel key={t.key} table={t.key} label={t.label} />)}
        </div>
      )}
      {tab === 'data' && canImportExport && <ImportExportPanel />}
    </div>
  )
}
