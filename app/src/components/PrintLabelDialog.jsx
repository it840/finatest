import React, { useEffect, useMemo, useState } from 'react'
import { LABEL_SIZES, labelGeometry, labelLayout, printLabelImage, qrModules } from '../lib/assetQr'
import { blackLogo, downloadLabel, renderLabelCanvas, thermalLogo } from '../lib/labelImage'

// Print QR Label: choose the label size (thermal label printers such as the Clabel CT320B print at exactly
// this size) and what the QR holds. Shows a true-proportion preview and warns when the QR squares would be too
// small for a 203 dpi thermal printer. Choices are remembered on this computer.
const PREF_KEY = 'ars_label_print'
const DOTS_PER_MM = 8 // 203 dpi thermal printers

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || 'null') || {} } catch { return {} }
}

export default function PrintLabelDialog({ asset, logo, onClose }) {
  const saved = loadPrefs()
  const [key, setKey] = useState(saved.key || '70x40')
  const [cw, setCw] = useState(saved.w || 75)
  const [ch, setCh] = useState(saved.h || 40)
  const preset = LABEL_SIZES.find(s => s.key === key)
  const size = key === 'custom'
    ? { w: Math.min(Math.max(Number(cw) || 0, 20), 200), h: Math.min(Math.max(Number(ch) || 0, 15), 150) }
    : { w: preset.w, h: preset.h, a4: !!preset.a4 }

  const geo = labelGeometry(size.w, size.h)
  const squares = (content) => geo.qr / qrModules(asset, content)
  const dots = (content) => squares(content) * DOTS_PER_MM
  // default content: full details when they print cleanly at this size, otherwise simple
  const [textScale, setTextScale] = useState(saved.textScale || 1)   // text size, 0.7 - 1.6
  const content = 'link'   // the QR always holds the link to the protected scan page

  // the property logo in black only (thermal printers print black); used for the preview, print and downloads
  const [logoBlack, setLogoBlack] = useState(null)
  const [logoReady, setLogoReady] = useState(!logo)
  useEffect(() => {
    let alive = true
    if (!logo) return
    blackLogo(logo).then(url => { if (alive) { setLogoBlack(url); setLogoReady(true) } })
    return () => { alive = false }
  }, [logo])
  const [busy, setBusy] = useState('')
  // logo at the exact printer-dot size for this label (crisp black strokes); falls back to the black logo
  const [logoThermal, setLogoThermal] = useState(null)
  useEffect(() => {
    let alive = true
    setLogoThermal(null)
    const src = logoBlack || logo
    if (!src || !logoReady) return
    const L = labelLayout(size.w, size.h)
    thermalLogo(src, L.logo.maxW, L.logo.size, size.a4 ? 12 : 8).then(url => { if (alive) setLogoThermal(url) })
    return () => { alive = false }
  }, [logoBlack, logoReady, size.w, size.h])
  const logoUse = logoThermal || logoBlack || logo

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const sq = squares(content)
  const d = dots(content)
  const level = size.a4 ? 'ok' : d < 4 ? 'bad' : d < 6 ? 'warn' : 'ok'
  // the finished label image: shown as the preview and used as-is for Print, so they match exactly
  const pxPerMm = size.a4 ? 12 : 8
  const [labelImg, setLabelImg] = useState(null)
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    let alive = true
    if (!logoReady) return
    renderLabelCanvas(asset, { logo: logoUse, size, content, textScale, pxPerMm }).then(cv => {
      if (!alive) return
      setLabelImg(cv.toDataURL('image/png'))
      setReduced(!!cv.reduced)
    })
    return () => { alive = false }
  }, [asset, logoUse, logoReady, size.w, size.h, size.a4, content, textScale])
  const stepText = (d) => setTextScale(v => Math.round(Math.min(1.6, Math.max(0.7, v + d)) * 10) / 10)

  // preview at true proportions, scaled to fit the window
  const pxW = size.w * 3.7795, pxH = size.h * 3.7795
  const scale = Math.min(460 / pxW, 260 / pxH)

  const remember = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify({ key, w: size.w, h: size.h, textScale })) } catch { /* ignore */ } }
  const print = () => {
    remember()
    if (labelImg) printLabelImage(labelImg, size, `${asset.asset_code} label`)
    onClose()
  }
  const download = async (format) => {
    remember()
    setBusy(format)
    try { await downloadLabel(asset, { logo: logoUse, size, content, textScale, pxPerMm }, format) } finally { setBusy('') }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-ink/40 flex items-start justify-center overflow-y-auto py-10 px-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 py-5 border-b border-hairline">
          <div>
            <h2 className="font-display text-xl">Print QR Label</h2>
            <div className="text-xs text-muted mt-0.5">{asset.asset_code} · {asset.asset_name}</div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl leading-none" aria-label="Close">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-xs text-muted mb-1">Label size</span>
              <select value={key} onChange={e => setKey(e.target.value)} className="input" aria-label="Label size">
                {LABEL_SIZES.filter(s => !s.a4).map(s => <option key={s.key} value={s.key}>{s.w} × {s.h} mm</option>)}
                <option value="custom">Custom size…</option>
                <option value="a4">Office printer — A4 sheet (170 × 96 mm label)</option>
              </select>
              {key === 'custom' && (
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <input type="number" min="20" max="200" value={cw} onChange={e => setCw(e.target.value)} className="input w-20" aria-label="Label width (mm)" />
                  <span className="text-muted">×</span>
                  <input type="number" min="15" max="150" value={ch} onChange={e => setCh(e.target.value)} className="input w-20" aria-label="Label height (mm)" />
                  <span className="text-muted">mm (width × height)</span>
                </div>
              )}
            </label>

            <div>
              <span className="block text-xs text-muted mb-1">QR code</span>
              <p className="text-sm leading-snug">
                Opens a protected page. Whoever scans must enter their <b>4-digit scan code</b> to see the asset’s details and repair history.
              </p>
            </div>
          </div>

          <div className={`text-sm rounded border px-3 py-2 ${level === 'bad' ? 'border-danger/40 bg-danger/5 text-danger' : level === 'warn' ? 'border-gold/50 bg-gold/5 text-[#7a5a12]' : 'border-[#97C459] bg-[#F4FAEC] text-[#27500A]'}`}>
            QR squares on this label: <b>{sq.toFixed(2)} mm</b>
            {!size.a4 && <> (about {Math.round(d)} printer dots at 203 dpi)</>}
            {level === 'bad' && <> — too small to print sharply on a 203 dpi thermal printer. Choose a bigger label.</>}
            {level === 'warn' && <> — prints, but may be slow to scan. A bigger label scans faster.</>}
            {level === 'ok' && <> — prints sharply and scans well.</>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted">Text size</span>
            <div className="flex items-center rounded border border-hairline overflow-hidden">
              <button onClick={() => stepText(-0.1)} disabled={textScale <= 0.7} aria-label="Smaller text"
                className="w-9 h-9 text-lg leading-none hover:bg-theme-hover disabled:opacity-40">−</button>
              <span className="w-16 text-center text-sm tabular-nums" aria-live="polite" aria-label="Text size">{Math.round(textScale * 100)}%</span>
              <button onClick={() => stepText(0.1)} disabled={textScale >= 1.6} aria-label="Bigger text"
                className="w-9 h-9 text-lg leading-none hover:bg-theme-hover disabled:opacity-40">+</button>
            </div>
            {textScale !== 1 && <button onClick={() => setTextScale(1)} className="text-xs text-muted underline hover:text-ink">Reset</button>}
            {reduced && textScale > 1 && (
              <span className="text-xs text-[#7a5a12]">Reduced a little so nothing overlaps on this label — choose a bigger label for larger text.</span>
            )}
          </div>

          <div>
            <div className="text-xs text-muted mb-1">Preview ({size.w} × {size.h} mm)</div>
            <div className="border border-hairline rounded bg-[#e9e7e2] p-3 flex justify-center">
              <div style={{ width: pxW * scale, height: pxH * scale, overflow: 'hidden', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }}>
                {labelImg
                  ? <img src={labelImg} alt="Label preview" style={{ width: pxW * scale, height: pxH * scale, display: 'block' }} />
                  : <div className="w-full h-full flex items-center justify-center text-xs text-muted">Preparing…</div>}
              </div>
            </div>
          </div>

          {!size.a4 && (
            <p className="text-xs text-muted">
              In the print window: choose your label printer (e.g. Clabel CT320B), set <b>Paper size</b> to {size.w} × {size.h} mm
              (add it as a custom size in the printer settings if it isn’t listed), <b>Margins: None</b>, <b>Scale: 100%</b>, and turn off headers and footers.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-ink mr-auto">Cancel</button>
          <button onClick={() => download('pdf')} disabled={!!busy || !logoReady} title={`Save the label as a PDF, page size ${size.w} × ${size.h} mm`}
            className="px-4 py-2 text-sm border border-hairline rounded hover:bg-theme-hover disabled:opacity-50">
            {busy === 'pdf' ? 'Saving…' : 'Download PDF'}
          </button>
          <button onClick={() => download('png')} disabled={!!busy || !logoReady} title="Save the label as an image (203 dpi, black and white), e.g. for the Clabel phone app"
            className="px-4 py-2 text-sm border border-hairline rounded hover:bg-theme-hover disabled:opacity-50">
            {busy === 'png' ? 'Saving…' : 'Download PNG'}
          </button>
          <button onClick={print} disabled={!logoReady || !labelImg} className="px-4 py-2 text-sm bg-theme-accent text-white rounded hover:bg-theme-accent/90 disabled:opacity-50">Print</button>
        </div>
      </div>
    </div>
  )
}
