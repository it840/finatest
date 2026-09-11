import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../lib/AuthContext'

export default function AccountPanel({ profile, onProfileChange }) {
  const { session } = useAuthContext()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const saveName = async (e) => {
    e.preventDefault()
    setBusy(true); setError(''); setSuccess('')
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile.id)
    setBusy(false)
    if (error) { setError(error.message); return }
    setSuccess('Name updated.')
    onProfileChange?.()
  }

  const savePassword = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) { setError(error.message); return }
    setPassword(''); setConfirmPassword('')
    setSuccess('Password updated.')
  }

  return (
    <div className="grid grid-cols-2 gap-6 max-w-3xl">
      <form onSubmit={saveName} className="border border-hairline bg-surface rounded p-5 space-y-3">
        <h3 className="font-medium text-sm">Profile</h3>
        <div className="text-xs text-muted">Email: {session?.user?.email}</div>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Full name</span>
          <input value={fullName} onChange={e => setFullName(e.target.value)} className="input" />
        </label>
        <button disabled={busy} className="px-4 py-2 text-sm bg-ink text-paper rounded hover:bg-ink/90 disabled:opacity-50">
          Save Name
        </button>
      </form>

      <form onSubmit={savePassword} className="border border-hairline bg-surface rounded p-5 space-y-3">
        <h3 className="font-medium text-sm">Change Password</h3>
        <label className="block">
          <span className="block text-xs text-muted mb-1">New password</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" minLength={6} />
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Confirm new password</span>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input" minLength={6} />
        </label>
        <button disabled={busy} className="px-4 py-2 text-sm bg-ink text-paper rounded hover:bg-ink/90 disabled:opacity-50">
          Update Password
        </button>
      </form>

      {(error || success) && (
        <div className={`col-span-2 text-sm ${error ? 'text-danger' : 'text-success'}`}>{error || success}</div>
      )}
    </div>
  )
}
