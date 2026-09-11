import React, { useState } from 'react'
import { useAuthContext } from '../lib/AuthContext'

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  )
}

export default function Login() {
  const { signIn, signUp } = useAuthContext()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setInfo(''); setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) throw error
      } else {
        const { error } = await signUp(email, password, fullName)
        if (error) throw error
        setInfo('Account created. If email confirmation is required, check your inbox, then sign in.')
        setMode('signin')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="top-loading-bar">
        {busy && <div className="top-loading-bar-sweep" />}
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img src={`${import.meta.env.BASE_URL}virgin-logo.png`} alt="Virgin Beach Resort" className="h-16 w-16 rounded-full bg-surface object-contain p-1.5 border border-hairline" />
            <img src={`${import.meta.env.BASE_URL}zhostel-logo.png`} alt="Z Hostel" className="h-16 w-16 rounded-full object-contain" />
          </div>
          <div className="font-display text-2xl text-ink">Asset Registry System</div>
          <div className="text-sm text-muted mt-1">Sign in to manage property assets</div>
        </div>
        <form onSubmit={submit} className="bg-surface border border-hairline rounded p-6 space-y-4">
          <fieldset disabled={busy} className="space-y-4 contents">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs text-muted mb-1">Full name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} required
                  className="w-full border border-hairline rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold disabled:bg-hairline/20" />
              </div>
            )}
            <div>
              <label className="block text-xs text-muted mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full border border-hairline rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold disabled:bg-hairline/20" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                className="w-full border border-hairline rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold disabled:bg-hairline/20" />
            </div>
          </fieldset>

          {error && <div className="text-sm text-danger">{error}</div>}
          {info && <div className="text-sm text-success">{info}</div>}

          <div>
            <button disabled={busy} type="submit"
              className="w-full flex items-center justify-center gap-2 bg-ink text-paper rounded py-2.5 text-sm font-medium
                         transition-all duration-150 hover:bg-ink/90 active:scale-[0.98]
                         disabled:opacity-90 disabled:cursor-not-allowed
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-paper">
              {busy && <Spinner />}
              <span>{busy ? (mode === 'signin' ? 'Signing in…' : 'Creating account…') : mode === 'signin' ? 'Sign in' : 'Create account'}</span>
            </button>
          </div>

          <button type="button" disabled={busy}
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo('') }}
            className="w-full text-xs text-muted hover:text-ink underline disabled:opacity-50">
            {mode === 'signin' ? "Need an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </form>
        {mode === 'signup' && (
          <p className="text-xs text-muted mt-3 text-center">The first person to sign up becomes the admin. Everyone after that starts as staff — an admin can change roles in Settings.</p>
        )}
      </div>
    </div>
  )
}
