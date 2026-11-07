import React, { useEffect, useRef, useState } from 'react'

function Logos({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src={`${import.meta.env.BASE_URL}virgin-logo.png`} alt="Virgin Beach Resort" className="h-10 w-10 rounded-full bg-white object-contain p-1" />
      <img src={`${import.meta.env.BASE_URL}zhostel-logo.png`} alt="Z Hostel" className="h-10 w-10 rounded-full object-contain" />
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h11M10.5 5.5L15 10l-4.5 4.5" />
    </svg>
  )
}

// Same window as the login: the blade glides in from the left on open, and sweeps out to the right on
// Sign out - where the login's own entrance picks it up again from the left (one continuous motion).
export default function SignOutDialog({ onCancel, onConfirm }) {
  const [leaving, setLeaving] = useState(false)
  const cardRef = useRef(null)
  useEffect(() => { cardRef.current?.focus() }, []) // keyboard focus moves into the dialog

  const confirm = () => {
    if (leaving) return
    setLeaving(true)
    setTimeout(onConfirm, 850)
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !leaving) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [leaving, onCancel])

  return (
    <div className="signout-backdrop fixed inset-0 bg-ink/45 flex items-center justify-center z-50 px-4" onClick={() => !leaving && onCancel()}>
      <div ref={cardRef} tabIndex={-1} className="auth-card relative w-full max-w-[780px] md:h-[360px] rounded-3xl overflow-hidden bg-paper border border-theme-line shadow-xl outline-none"
        data-view="signin" data-leaving={leaving ? 'true' : undefined} role="dialog" aria-modal="true" aria-label="Sign out"
        onClick={e => e.stopPropagation()}>

        {/* phones: simple brand band, no sweep */}
        <div className="md:hidden bg-theme-accent text-white px-8 py-6">
          <Logos className="mb-3" />
          <div className="font-display text-3xl leading-tight">See you <em className="text-gold">soon.</em></div>
        </div>

        <div className="auth-blade hidden md:block" aria-hidden="true">
          <div className="auth-blade-shape" />
          <div className="auth-copy auth-copy--signin">
            <Logos className="mb-6" />
            <div className="text-[11px] tracking-[0.28em] text-gold font-medium mb-3">ASSET REGISTRY</div>
            <h2 className="font-display text-[44px] leading-[1.05] text-paper">See you<br /><em className="text-gold">soon.</em></h2>
            <p className="text-sm text-[#CFCCC4] leading-relaxed mt-3 max-w-[220px]">Everything is saved exactly where you left it.</p>
          </div>
        </div>

        <div className="auth-pane auth-pane--signin">
          <div className="w-full max-w-[290px]">
            <div className="mb-6">
              <div className="font-display text-[28px] leading-tight text-ink">Sign out?</div>
              <div className="w-9 h-[2px] bg-gold mt-2.5" />
            </div>
            <p className="text-sm text-muted leading-relaxed mb-7">
              You'll need to sign in again to use the Asset Registry System.
            </p>
            <div className="flex items-center gap-5">
              <button type="button" onClick={onCancel} disabled={leaving}
                className="text-sm text-ink underline decoration-gold decoration-2 underline-offset-4 hover:text-theme-accent disabled:opacity-40">
                Cancel
              </button>
              <button type="button" onClick={confirm} disabled={leaving}
                className="group flex-1 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium text-white
                           bg-theme-accent hover:bg-[#2B2926] transition-all duration-200 ease-out
                           shadow-[0_1px_2px_rgba(36,34,30,0.18)] hover:shadow-[0_8px_18px_rgba(36,34,30,0.28)] hover:-translate-y-0.5
                           active:translate-y-0 active:scale-[0.98] disabled:opacity-90 disabled:hover:translate-y-0
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper">
                <span>{leaving ? 'Signing out…' : 'Sign out'}</span>
                {!leaving && <ArrowIcon />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
