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

function MailIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" />
      <path d="M3 5.5l7 5.5 7-5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="9" width="12" height="8" rx="1.5" />
      <path d="M6.5 9V6.5a3.5 3.5 0 017 0V9" strokeLinecap="round" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="6.5" r="3" />
      <path d="M3.5 17c1-3.2 3.7-5 6.5-5s5.5 1.8 6.5 5" strokeLinecap="round" />
    </svg>
  )
}

function EyeIcon({ off }) {
  return off ? (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2.5 2.5l15 15" strokeLinecap="round" />
      <path d="M9 4.6c.33-.03.66-.05 1-.05 4.2 0 7.4 2.9 8.5 5.45-.47 1.1-1.24 2.28-2.3 3.3M11.6 12.4a2.5 2.5 0 01-3.5-3.5M5.9 6.1C4.1 7.2 2.9 8.8 2 10c1.1 2.55 4.3 5.45 8.5 5.45.9 0 1.75-.13 2.55-.36" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M1.5 10c1.1-2.55 4.3-5.45 8.5-5.45S17.4 7.45 18.5 10c-1.1 2.55-4.3 5.45-8.5 5.45S2.6 12.55 1.5 10z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  )
}

function BrandPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-[44%] flex-col justify-between bg-ink text-paper px-12 py-14 overflow-hidden">
      <svg className="absolute -right-32 -top-32 w-[520px] h-[520px] opacity-[0.08]" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="40" stroke="#B8902E" strokeWidth="1" />
        <circle cx="100" cy="100" r="70" stroke="#B8902E" strokeWidth="1" />
        <circle cx="100" cy="100" r="100" stroke="#B8902E" strokeWidth="1" />
      </svg>
      <svg className="absolute -left-24 bottom-0 w-96 h-96 opacity-[0.06]" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="60" stroke="#F6F4EE" strokeWidth="1" />
        <circle cx="100" cy="100" r="90" stroke="#F6F4EE" strokeWidth="1" />
      </svg>

      <div className="relative flex items-center gap-3">
        <img src={`${import.meta.env.BASE_URL}virgin-logo.png`} alt="Virgin Beach Resort" className="h-10 w-10 rounded-full bg-paper object-contain p-1" />
        <img src={`${import.meta.env.BASE_URL}zhostel-logo.png`} alt="Z Hostel" className="h-10 w-10 rounded-full object-contain" />
      </div>

      <div className="relative">
        <div className="font-display text-4xl leading-[1.15] mb-5 max-w-sm">
          Every asset,<br/>accounted for.
        </div>
        <p className="text-paper/70 text-sm max-w-xs leading-relaxed">
          One registry for every property — track what you own, where it lives,
          and what condition it's in, from acquisition to disposal.
        </p>
      </div>

      <div className="relative flex items-center gap-2 text-xs text-paper/50">
        <span>Virgin Beach Resort</span>
        <span className="w-1 h-1 rounded-full bg-paper/30" />
        <span>Z Hostel</span>
      </div>
    </div>
  )
}

export default function Login() {
  const { signIn, signUp } = useAuthContext()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const switchMode = (next) => {
    if (next === mode) return
    setMode(next); setError(''); setInfo('')
  }

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
    <div className="min-h-screen flex bg-paper">
      <div className="top-loading-bar">
        {busy && <div className="top-loading-bar-sweep" />}
      </div>

      <BrandPanel />

      <div className="flex-1 flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <img src={`${import.meta.env.BASE_URL}virgin-logo.png`} alt="Virgin Beach Resort" className="h-11 w-11 rounded-full bg-surface object-contain p-1 border border-hairline" />
            <img src={`${import.meta.env.BASE_URL}zhostel-logo.png`} alt="Z Hostel" className="h-11 w-11 rounded-full object-contain" />
          </div>

          <div className="bg-surface rounded-xl shadow-[0_1px_2px_rgba(20,43,39,0.04),0_12px_32px_rgba(20,43,39,0.08)] border border-hairline overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-gold via-gold/60 to-gold" />

            <div className="p-7">
              {/* segmented mode toggle */}
              <div className="flex bg-paper rounded-lg p-1 mb-7 text-sm">
                <button type="button" onClick={() => switchMode('signin')}
                  className={`flex-1 py-2 rounded-md font-medium transition-colors ${mode === 'signin' ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}>
                  Sign In
                </button>
                <button type="button" onClick={() => switchMode('signup')}
                  className={`flex-1 py-2 rounded-md font-medium transition-colors ${mode === 'signup' ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}>
                  Create Account
                </button>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <fieldset disabled={busy} className="space-y-4 contents">
                  {mode === 'signup' && (
                    <div className="flex items-center gap-2.5 border border-hairline rounded-lg px-3.5 py-2.5 focus-within:border-gold transition-colors">
                      <span className="text-muted"><UserIcon /></span>
                      <input value={fullName} onChange={e => setFullName(e.target.value)} required
                        placeholder="Full name"
                        className="w-full bg-transparent text-sm focus:outline-none disabled:opacity-50" />
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 border border-hairline rounded-lg px-3.5 py-2.5 focus-within:border-gold transition-colors">
                    <span className="text-muted"><MailIcon /></span>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder="Email address"
                      className="w-full bg-transparent text-sm focus:outline-none disabled:opacity-50" />
                  </div>
                  <div className="flex items-center gap-2.5 border border-hairline rounded-lg px-3.5 py-2.5 focus-within:border-gold transition-colors">
                    <span className="text-muted"><LockIcon /></span>
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                      placeholder="Password"
                      className="w-full bg-transparent text-sm focus:outline-none disabled:opacity-50" />
                    <button type="button" onClick={() => setShowPassword(s => !s)} className="text-muted hover:text-ink flex-shrink-0" tabIndex={-1}>
                      <EyeIcon off={showPassword} />
                    </button>
                  </div>
                </fieldset>

                {error && <div className="text-sm text-danger">{error}</div>}
                {info && <div className="text-sm text-success">{info}</div>}

                <button disabled={busy} type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-ink text-paper rounded-lg py-3 text-sm font-medium
                             transition-all duration-150 hover:bg-ink/90 active:scale-[0.98]
                             disabled:opacity-90 disabled:cursor-not-allowed
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
                  {busy && <Spinner />}
                  <span>{busy ? (mode === 'signin' ? 'Signing in…' : 'Creating account…') : mode === 'signin' ? 'Sign in' : 'Create account'}</span>
                </button>
              </form>

              {mode === 'signup' && (
                <p className="text-xs text-muted mt-5 border-t border-hairline pt-4 leading-relaxed">
                  The first person to sign up becomes the admin. Everyone after that starts as staff —
                  an admin can change roles later in Settings.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
