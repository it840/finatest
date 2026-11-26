import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// Opened by scanning an asset's QR label (…/?scan=Asset-001). No sign-in: the person enters their personal
// 4-digit scan code (set by an admin in Settings > Users). The code is checked in the database, the scan is
// recorded in Log History, and the asset's details and repair history are shown.
const REMEMBER_KEY = 'ars_scan_code'
const REMEMBER_MIN = 15

function rememberedPin() {
  try {
    const v = JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null')
    if (v && v.pin && v.exp > Date.now()) return v.pin
  } catch { /* ignore */ }
  return ''
}
const forget = () => { try { localStorage.removeItem(REMEMBER_KEY) } catch { /* ignore */ } }

const logoSrc = (url) => !url ? null : /^https?:\/\//.test(url) ? url : `${import.meta.env.BASE_URL}${url.replace(/^\//, '')}`
const peso = (n) => n == null ? '—' : '₱' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm border-b border-hairline last:border-0">
      <span className="text-muted shrink-0">{label}</span>
      <span className="text-right break-words min-w-0">{value || <span className="text-muted">—</span>}</span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="bg-surface border border-hairline rounded-xl px-4 py-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">{title}</h2>
      {children}
    </section>
  )
}

export default function ScanPage({ code }) {
  const [pin, setPin] = useState('')
  const [remember, setRemember] = useState(true)
  const [state, setState] = useState({ status: 'ask' })   // ask | checking | ok | wrong | locked | not_found | error
  const input = useRef(null)

  const check = async (p) => {
    setState({ status: 'checking' })
    const { data, error } = await supabase.rpc('scan_asset', { p_code: code, p_pin: p })
    if (error) { setState({ status: 'error', message: error.message }); return }
    if (data?.ok) {
      if (remember) { try { localStorage.setItem(REMEMBER_KEY, JSON.stringify({ pin: p, exp: Date.now() + REMEMBER_MIN * 60000 })) } catch { /* ignore */ } }
      setState({ status: 'ok', data, at: new Date() })
      return
    }
    if (data?.error === 'wrong_code') forget()
    setPin('')
    setState({ status: data?.error || 'error', triesLeft: data?.tries_left, retry: data?.retry_minutes })
    setTimeout(() => input.current?.focus(), 50)
  }

  // still unlocked on this phone: open straight away
  const started = useRef(false)   // run once (no double check / double log entry)
  useEffect(() => {
    if (started.current) return
    started.current = true
    const p = rememberedPin(); if (p) check(p); else input.current?.focus()
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(v)
    if (v.length === 4) check(v)
  }
  const lock = () => { forget(); setPin(''); setState({ status: 'ask' }); setTimeout(() => input.current?.focus(), 50) }

  if (state.status === 'ok') {
    const { asset: a, history, scanned_by, property_logo } = state.data
    return (
      <div className="min-h-screen bg-paper text-ink">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
          <header className="bg-surface border border-hairline rounded-xl p-4 flex gap-4 items-center">
            {logoSrc(property_logo) && <img src={logoSrc(property_logo)} alt="" className="w-14 h-14 object-contain shrink-0" />}
            <div className="min-w-0">
              <div className="text-xs text-muted">{a.property_name}</div>
              <h1 className="font-display text-xl leading-tight break-words">{a.asset_name}</h1>
              <div className="text-sm mt-0.5"><b>{a.asset_code}</b>{a.asset_number ? <> · Asset No. <b>{a.asset_number}</b></> : null}</div>
            </div>
          </header>

          {a.photo_url && <img src={a.photo_url} alt={a.asset_name} className="w-full max-h-72 object-cover rounded-xl border border-hairline" />}

          <Section title="Status">
            <Row label="Status" value={a.status} />
            <Row label="Condition" value={a.condition} />
          </Section>

          <Section title="Asset details">
            <Row label="Category" value={[a.category, a.sub_category].filter(Boolean).join(' / ')} />
            <Row label="Brand" value={a.brand} />
            <Row label="Model" value={a.model} />
            <Row label="Serial number" value={a.serial_number} />
            <Row label="Acquisition date" value={a.acquisition_date} />
            <Row label="Purchase cost" value={a.purchase_cost != null ? peso(a.purchase_cost) : null} />
            <Row label="Current value" value={a.current_asset_value != null ? peso(a.current_asset_value) : null} />
          </Section>

          <Section title="Location & assignment">
            <Row label="Location" value={a.location} />
            <Row label="Actual location" value={a.actual_location} />
            <Row label="Department" value={a.department} />
            <Row label="Assigned to" value={a.assigned_to} />
          </Section>

          <Section title="Maintenance">
            <Row label="Last maintenance" value={a.last_maintenance} />
            <Row label="Next PMS" value={a.next_pms_date} />
          </Section>

          <Section title={`Repair & maintenance history (${history.length})`}>
            {history.length === 0 && <div className="text-sm text-muted py-1.5">No repairs or maintenance recorded yet.</div>}
            <div className="divide-y divide-hairline">
              {history.map(m => (
                <div key={m.id} className="py-2.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <b>{m.maintenance_type || 'Maintenance'}</b>
                    <span className={`text-xs font-medium ${m.pms_status === 'COMPLETED' ? 'text-success' : m.pms_status === 'OVERDUE' ? 'text-danger' : 'text-muted'}`}>
                      {m.pms_status} · {m.completed_date || m.scheduled_date}
                    </span>
                  </div>
                  <div className="text-xs mt-1 space-y-0.5">
                    {m.breakdown_date && <div><span className="text-muted">Broke:</span> {m.breakdown_date}{m.downtime_days != null ? ` · down ${m.downtime_days} ${m.downtime_days === 1 ? 'day' : 'days'}` : ''}</div>}
                    {m.problem && <div><span className="text-muted">Problem:</span> {m.problem}</div>}
                    {m.findings && <div><span className="text-muted">Work done:</span> {m.findings}</div>}
                    {m.parts_replaced && <div><span className="text-muted">Parts:</span> {m.parts_replaced.split(/\n+/).filter(Boolean).join(', ')}{m.parts_cost != null ? ` (${peso(m.parts_cost)})` : ''}</div>}
                    {m.technician && <div><span className="text-muted">Person in charge:</span> {m.technician}</div>}
                    {m.maintenance_cost != null && <div><span className="text-muted">Cost:</span> {peso(m.maintenance_cost)}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <div className="flex items-center justify-between text-xs text-muted pt-1 pb-6">
            <span>Viewed by {scanned_by} · {state.at.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
            <button onClick={lock} className="underline hover:text-ink">Lock</button>
          </div>
        </div>
      </div>
    )
  }

  const msg = {
    wrong_code: `Wrong code.${state.triesLeft != null ? ` ${state.triesLeft} ${state.triesLeft === 1 ? 'try' : 'tries'} left.` : ''}`,
    locked: `Too many wrong codes. Please try again in ${state.retry || 15} minutes.`,
    not_found: 'This asset is not in the system (it may have been removed).',
    error: `Something went wrong: ${state.message || 'please try again.'}`,
  }[state.status]

  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface border border-hairline rounded-2xl shadow-sm p-6 text-center">
        <div className="text-xs text-muted">Asset Registry System</div>
        <h1 className="font-display text-xl mt-1">Asset {code}</h1>
        <p className="text-sm text-muted mt-3">Enter your 4-digit scan code to view this asset.</p>

        <label className="block mt-5 cursor-text" onClick={() => input.current?.focus()}>
          <input ref={input} value={pin} onChange={onChange} inputMode="numeric" autoComplete="one-time-code" maxLength={4}
            disabled={state.status === 'checking' || state.status === 'locked'} aria-label="4-digit scan code" className="sr-only" />
          <div className="flex justify-center gap-3" aria-hidden="true">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-semibold
                ${pin.length === i && state.status !== 'checking' ? 'border-theme-accent' : 'border-hairline'}`}>
                {pin[i] ? '•' : ''}
              </div>
            ))}
          </div>
        </label>

        {state.status === 'checking' && <p className="text-sm text-muted mt-4">Checking…</p>}
        {msg && <p className={`text-sm mt-4 ${state.status === 'not_found' ? 'text-muted' : 'text-danger'}`} role="alert">{msg}</p>}

        <label className="flex items-center justify-center gap-2 text-xs text-muted mt-5">
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
          Stay unlocked on this phone for {REMEMBER_MIN} minutes
        </label>
        <p className="text-[11px] text-muted mt-4">No code? Ask your administrator to set one for you in Settings › Users.</p>
      </div>
    </div>
  )
}
