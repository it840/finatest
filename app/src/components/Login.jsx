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

function MailIcon() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" /><path d="M3 6l7 5 7-5" />
    </svg>
  )
}

function EyeIcon({ off }) {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.8 10S5 4.5 10 4.5 18.2 10 18.2 10 15 15.5 10 15.5 1.8 10 1.8 10z" />
      <circle cx="10" cy="10" r="2.6" />
      {off && <path d="M3.5 16.5l13-13" />}
    </svg>
  )
}

function Logos({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src={`${import.meta.env.BASE_URL}virgin-logo.png`} alt="Virgin Beach Resort" className="h-10 w-10 rounded-full bg-white object-contain p-1" />
      <img src={`${import.meta.env.BASE_URL}zhostel-logo.png`} alt="Z Hostel" className="h-10 w-10 rounded-full object-contain" />
    </div>
  )
}

function Heading({ children }) {
  return (
    <div className="mb-7">
      <div className="font-display text-[28px] leading-tight text-ink">{children}</div>
      <div className="w-9 h-[2px] bg-gold mt-2.5" />
    </div>
  )
}

export default function Login() {
  const { signIn } = useAuthContext()
  const [view, setView] = useState('signin') // 'signin' | 'help' - the blade slides between them
  const [ready, setReady] = useState(false)   // false until the first switch, so the load animation plays
  const go = (v) => { setError(''); setReady(true); setView(v) }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const { error } = await signIn(email, password)
      if (error) throw error
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const fieldClass = `w-full border-0 border-b border-theme-line bg-transparent pl-0 pr-8 py-2.5 text-sm text-ink placeholder:text-muted
                      focus:outline-none focus:border-theme-accent transition-colors disabled:opacity-50`

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-hover px-4 py-10 relative overflow-hidden">
      <div className="top-loading-bar">
        {busy && <div className="top-loading-bar-sweep" />}
      </div>

      {/* faint dot grid behind the card */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
        <defs>
          <pattern id="login-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.5" fill="#24221E" fillOpacity="0.07" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#login-dots)" />
      </svg>

      <div className="auth-card relative w-full max-w-[920px] md:h-[540px] rounded-3xl overflow-hidden bg-paper border border-theme-line shadow-xl" data-view={view} data-ready={ready ? 'true' : undefined}>

        {/* phones: a simple brand band instead of the blade */}
        <div className="md:hidden bg-theme-accent text-white px-8 py-7">
          <Logos className="mb-4" />
          <div className="font-display text-3xl leading-tight">
            {view === 'signin' ? <>Welcome <em className="text-gold">back.</em></> : <>Forgot <em className="text-gold">password?</em></>}
          </div>
        </div>

        {/* the blade: a slanted graphite panel that glides across the card, carrying its text with it */}
        <div className="auth-blade hidden md:block" aria-hidden="true">
          <div className="auth-blade-shape" />

          <div className="auth-copy auth-copy--signin">
            <Logos className="mb-8" />
            <div className="text-[11px] tracking-[0.28em] text-gold font-medium mb-3">ASSET REGISTRY</div>
            <h2 className="font-display text-[44px] leading-[1.05] text-paper">Welcome<br /><em className="text-gold">back.</em></h2>
            <p className="text-sm text-[#CFCCC4] leading-relaxed mt-4 max-w-[240px]">
              Your assets, counts and transfers are exactly where you left them.
            </p>
          </div>
          <div className="auth-copy auth-copy--help">
            <Logos className="mb-8" />
            <div className="text-[11px] tracking-[0.28em] text-gold font-medium mb-3">NEED A HAND?</div>
            <h2 className="font-display text-[44px] leading-[1.05] text-paper">Forgot<br /><em className="text-gold">password?</em></h2>
            <p className="text-sm text-[#CFCCC4] leading-relaxed mt-4 max-w-[230px]">
              It happens. Your administrator can reset it in a minute.
            </p>
          </div>
        </div>

        {/* sign-in form */}
        <div className="auth-pane auth-pane--signin" inert={view !== 'signin'}>
          <div className="w-full max-w-[300px]">
            <Heading>Sign in</Heading>
            <form onSubmit={submit}>
              <fieldset disabled={busy} className="contents">
                <div className="relative mb-5">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username"
                    placeholder="Email" aria-label="Email" className={fieldClass} />
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><MailIcon /></span>
                </div>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                    autoComplete="current-password" placeholder="Password" aria-label="Password" className={fieldClass} />
                  <button type="button" onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors">
                    <EyeIcon off={showPw} />
                  </button>
                </div>
              </fieldset>

              <div className="flex justify-end mt-3 mb-6">
                <button type="button" onClick={() => go('help')}
                  className="text-xs text-ink underline decoration-gold decoration-2 underline-offset-4 hover:text-theme-accent">
                  Forgot password?
                </button>
              </div>

              {error && <div className="text-sm text-danger mb-4" role="alert">{error}</div>}

              <button disabled={busy} type="submit"
                className="group w-full flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium text-white
                           bg-theme-accent hover:bg-[#2B2926] transition-all duration-200 ease-out
                           shadow-[0_1px_2px_rgba(36,34,30,0.18)] hover:shadow-[0_8px_18px_rgba(36,34,30,0.28)] hover:-translate-y-0.5
                           active:translate-y-0 active:scale-[0.98]
                           disabled:opacity-90 disabled:cursor-not-allowed disabled:hover:translate-y-0
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper">
                {busy ? <Spinner /> : null}
                <span>{busy ? 'Signing in…' : 'Sign in'}</span>
                {!busy && <ArrowIcon />}
              </button>
            </form>
            <p className="text-xs text-muted mt-5">Accounts are created by your administrator.</p>
          </div>
        </div>

        {/* help (forgot password) */}
        <div className="auth-pane auth-pane--help" inert={view !== 'help'}>
          <div className="w-full max-w-[300px]">
            <Heading>Reset your password</Heading>
            <ol className="space-y-4 text-sm text-ink">
              {[
                ['1', 'Ask your property administrator to reset your password.'],
                ['2', 'Sign in with the temporary password they give you.'],
                ['3', <>Choose your own in <b>Settings → My account</b>.</>],
              ].map(([n, text]) => (
                <li key={n} className="flex gap-3">
                  <span className="h-6 w-6 rounded-full border border-gold text-xs flex items-center justify-center flex-shrink-0 text-ink">{n}</span>
                  <span className="pt-0.5 leading-snug">{text}</span>
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => go('signin')}
              className="mt-8 text-sm text-ink underline decoration-gold decoration-2 underline-offset-4 hover:text-theme-accent">
              ← Back to sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
