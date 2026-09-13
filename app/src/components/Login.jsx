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

function ArrowIcon() {
  return (
    <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h11M10.5 5.5L15 10l-4.5 4.5" />
    </svg>
  )
}

function BrandPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-[44%] flex-col justify-between bg-ink text-paper px-12 py-14 overflow-hidden">
      {/* decorative concentric arcs, echoing the sunburst mark */}
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
    <div className="min-h-screen flex bg-paper">
      <div className="top-loading-bar">
        {busy && <div className="top-loading-bar-sweep" />}
      </div>

      <BrandPanel />

      <div className="flex-1 flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          {/* mobile-only brand mark, since the side panel is hidden below lg */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <img src={`${import.meta.env.BASE_URL}virgin-logo.png`} alt="Virgin Beach Resort" className="h-11 w-11 rounded-full bg-surface object-contain p-1 border border-hairline" />
            <img src={`${import.meta.env.BASE_URL}zhostel-logo.png`} alt="Z Hostel" className="h-11 w-11 rounded-full object-contain" />
          </div>

          <div className="mb-8">
            <div className="font-display text-2xl text-ink">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </div>
            <div className="text-sm text-muted mt-1.5">
              {mode === 'signin' ? 'Sign in to the Asset Registry System.' : 'Set up access to the Asset Registry System.'}
            </div>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <fieldset disabled={busy} className="space-y-5 contents">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5 tracking-wide">FULL NAME</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} required
                    className="w-full border-0 border-b border-hairline bg-transparent px-0 py-2 text-sm
                               focus:outline-none focus:border-gold transition-colors disabled:opacity-50" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5 tracking-wide">EMAIL</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full border-0 border-b border-hairline bg-transparent px-0 py-2 text-sm
                             focus:outline-none focus:border-gold transition-colors disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5 tracking-wide">PASSWORD</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                  className="w-full border-0 border-b border-hairline bg-transparent px-0 py-2 text-sm
                             focus:outline-none focus:border-gold transition-colors disabled:opacity-50" />
              </div>
            </fieldset>

            {error && <div className="text-sm text-danger">{error}</div>}
            {info && <div className="text-sm text-success">{info}</div>}

            <div className="pt-1">
              <button disabled={busy} type="submit"
                className="group w-full flex items-center justify-center gap-2 rounded py-3 text-sm font-medium text-paper
                           bg-gradient-to-b from-ink to-[#0F211D]
                           transition-all duration-200 ease-out
                           shadow-[0_1px_2px_rgba(20,43,39,0.15)]
                           hover:shadow-[0_6px_16px_rgba(20,43,39,0.28)] hover:-translate-y-0.5
                           active:translate-y-0 active:scale-[0.98] active:shadow-[0_1px_2px_rgba(20,43,39,0.2)]
                           disabled:opacity-90 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_1px_2px_rgba(20,43,39,0.15)]
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-paper">
                {busy ? <Spinner /> : null}
                <span>{busy ? (mode === 'signin' ? 'Signing in…' : 'Creating account…') : mode === 'signin' ? 'Sign in' : 'Create account'}</span>
                {!busy && <ArrowIcon />}
              </button>
            </div>

            <button type="button" disabled={busy}
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo('') }}
              className="w-full text-center text-sm text-muted hover:text-ink disabled:opacity-50">
              {mode === 'signin' ? (
                <>Need an account? <span className="text-ink font-medium underline">Sign up</span></>
              ) : (
                <>Already have an account? <span className="text-ink font-medium underline">Sign in</span></>
              )}
            </button>
          </form>

          {mode === 'signup' && (
            <p className="text-xs text-muted mt-6 border-t border-hairline pt-4 leading-relaxed">
              The first person to sign up becomes the admin. Everyone after that starts as staff —
              an admin can change roles later in Settings.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
