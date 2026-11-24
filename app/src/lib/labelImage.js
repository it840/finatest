// Label image for download (PNG / PDF) and the black-only logo used on printed labels.
import QRCode from 'qrcode'
import { labelLayout, qrText, qrSimpleText } from './assetQr'

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => resolve(img)
  img.onerror = reject
  img.src = src
})

// Logo in black only (thermal label printers print black): every coloured or dark part becomes solid black,
// white and transparent parts become see-through (the white of the label). Returns a PNG data URL,
// or null if the image can't be read (then the printed label falls back to grey tones).
export async function blackLogo(url) {
  if (!url) return null
  try {
    const img = await loadImage(url)
    const c = document.createElement('canvas')
    c.width = img.naturalWidth; c.height = img.naturalHeight
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, c.width, c.height)
    const px = d.data
    for (let i = 0; i < px.length; i += 4) {
      const a = px[i + 3]
      if (a < 10) continue
      const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
      if (lum >= 235) px[i + 3] = 0                       // white -> paper
      else { px[i] = 0; px[i + 1] = 0; px[i + 2] = 0 }    // any colour -> black
    }
    ctx.putImageData(d, 0, 0)
    return c.toDataURL('image/png')
  } catch {
    return null
  }
}

// The property's own logo, exactly as designed, only turned black: shrunk once to the exact number of
// printer dots it will occupy at 203 dpi (fits a box of wmm x hmm), and each dot is black where the original
// logo is dark and white where it isn't. No thickening or other changes to the design.
export async function thermalLogo(url, wmm, hmm, k = 8) {
  if (!url) return null
  try {
    const img = await loadImage(url)
    const r = Math.min((wmm * k) / img.naturalWidth, (hmm * k) / img.naturalHeight)
    const W = Math.max(1, Math.round(img.naturalWidth * r)), H = Math.max(1, Math.round(img.naturalHeight * r))
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const ctx = c.getContext('2d')
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, W, H)
    const d = ctx.getImageData(0, 0, W, H), px = d.data
    for (let i = 0; i < px.length; i += 4) {
      const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
      const cover = (px[i + 3] / 255) * (1 - lum / 255)      // how dark the original logo is at this dot
      px[i] = px[i + 1] = px[i + 2] = 0
      px[i + 3] = cover >= 0.5 ? 255 : 0
    }
    ctx.putImageData(d, 0, 0)
    return c.toDataURL('image/png')
  } catch {
    return null
  }
}

// --- drawing helpers -----------------------------------------------------------------------------------
// Split text into at most maxLines lines that fit maxW; a line that is cut ends with …
function wrap(ctx, text, maxW, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  let cut = false
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i]
    if (!line || ctx.measureText(test).width <= maxW) { line = test; continue }
    lines.push(line)
    line = words[i]
    if (lines.length === maxLines) { cut = true; line = ''; break }
  }
  if (line) lines.push(line)
  const fit = (s, ellipsis) => {
    let t = s
    while (t.length > 1 && ctx.measureText(t + (ellipsis ? '…' : '')).width > maxW) t = t.slice(0, -1)
    return t + (ellipsis ? '…' : '')
  }
  return lines.map((l, i) => {
    const tooWide = ctx.measureText(l).width > maxW
    const last = i === lines.length - 1
    return tooWide || (last && cut) ? fit(l, true) : l
  })
}

// Draws the finished label (one pixel per printer dot at 203 dpi) following the design measured in the Clabel
// app (see LABEL_TEMPLATE): QR at its measured place and size; text centred on the text column at the measured
// heights, in the measured point sizes (bold where the design is bold). Long lines shrink a little; a long name
// may use two lines (the note moves down). If text would overlap, it is reduced until nothing overlaps.
// The preview, Print and both downloads all use this one image, so they match exactly.
export async function renderLabelCanvas(asset, { logo = null, size, content = 'full', pxPerMm = 8, mono = true, textScale = 1 }) {
  const { w, h } = size
  const L = labelLayout(w, h)
  const k = pxPerMm
  const c = document.createElement('canvas')
  c.width = Math.round(w * k); c.height = Math.round(h * k)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
  const FAM = 'Roboto, Arial, sans-serif'
  try { await Promise.all(['400', '700'].map(wt => document.fonts.load(`${wt} 20px Roboto`))) } catch { /* fallback fonts */ }
  const font = (bold, mm, fam = FAM) => `${bold ? 700 : 400} ${mm * k}px ${fam}`
  const width = (text, bold, mm, fam) => { ctx.font = font(bold, mm, fam); return ctx.measureText(text).width / k }

  // QR at its measured place and size
  const simple = content === 'simple'
  const qr = QRCode.create(simple ? qrSimpleText(asset) : qrText(asset), { errorCorrectionLevel: simple ? 'M' : 'L' })
  const n = qr.modules.size
  const qx = L.qx * k, qy = L.qy * k, Q = L.qr * k
  ctx.fillStyle = '#000'
  for (let r = 0; r < n; r++) {
    for (let col = 0; col < n; col++) {
      if (!qr.modules.get(r, col)) continue
      const x1 = Math.round(qx + (col * Q) / n), x2 = Math.round(qx + ((col + 1) * Q) / n)
      const y1 = Math.round(qy + (r * Q) / n), y2 = Math.round(qy + ((r + 1) * Q) / n)
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1)
    }
  }

  let logoImg = null
  if (logo) { try { logoImg = await loadImage(logo) } catch { logoImg = null } }

  // one line that fits the column: shrink a little if needed (down to minF), then trim with … as a last resort
  const oneLine = (text, base, bold, minF = 0.6) => {
    let sz = base
    while (width(text, bold, sz) > L.maxW && sz > base * minF) sz *= 0.97
    let t = text
    if (width(t, bold, sz) > L.maxW) { while (t.length > 1 && width(t + '…', bold, sz) > L.maxW) t = t.slice(0, -1); t += '…' }
    return { lines: [t], size: sz, bold, lh: sz * 1.15 }
  }

  const build = (sc, withNote) => {
    const items = []
    const prop = oneLine(`Property of ${asset.property_name || 'Asset Registry System'}`, L.prop.size * sc, L.prop.bold)
    items.push({ ...prop, y: L.prop.y })
    if (logoImg) {
      const box = L.logo.size * Math.min(1, sc)
      const r = Math.min(L.logo.maxW / logoImg.naturalWidth, box / logoImg.naturalHeight)
      items.push({ img: logoImg, w: logoImg.naturalWidth * r, h: logoImg.naturalHeight * r, y: L.logo.y, lh: logoImg.naturalHeight * r })
    } else {
      // no logo: the Asset ID in large letters where the logo would be
      const fam = 'Oswald, "Arial Narrow", Impact, sans-serif'
      let sz = L.logo.size * 0.5 * sc
      while (width(asset.asset_code || '', true, sz, fam) > L.maxW && sz > 1) sz *= 0.95
      items.push({ lines: [asset.asset_code || ''], size: sz, bold: true, fam, lh: sz * 1.1, y: L.logo.y })
    }
    if (asset.asset_number) items.push({ ...oneLine(`Asset No. ${asset.asset_number}`, L.num.size * sc, L.num.bold), y: L.num.y })
    // name: one line if it fits at 75% or more, otherwise two lines
    const nb = L.name.size * sc
    let name = oneLine(asset.asset_name || '', nb, L.name.bold, 0.75)
    if (name.lines[0].endsWith('…')) {
      let sz = nb * 0.85, lines
      for (;;) {
        ctx.font = font(L.name.bold, sz); lines = wrap(ctx, asset.asset_name || '', L.maxW * k, 2)
        if (sz <= nb * 0.55 || !lines.some(l => l.endsWith('…'))) break
        sz *= 0.95
      }
      name = { lines, size: sz, bold: L.name.bold, lh: sz * 1.15 }
    }
    const nameTop = L.name.y - name.lh / 2
    items.push({ ...name, y: nameTop + (name.lines.length * name.lh) / 2 })
    if (withNote) {
      const note = oneLine('Scan to look up. Do not remove.', L.note.size * sc, L.note.bold)
      const nameBottom = nameTop + name.lines.length * name.lh
      items.push({ ...note, y: Math.max(L.note.y, nameBottom + 0.3 + note.lh / 2) })
    }
    return items
  }
  const span = (it) => {
    const hgt = it.img ? it.h : it.lines.length * it.lh
    return [it.y - hgt / 2, it.y + hgt / 2]
  }
  const fits = (items) => {
    for (let i = 0; i < items.length; i++) {
      const [t, b] = span(items[i])
      if (t < 0.4 || b > h - 0.4) return false
      if (i > 0 && t < span(items[i - 1])[1] + 0.15) return false
    }
    return true
  }
  // the chosen text size if everything fits; otherwise drop the note, then reduce the text a little at a time
  let items = null, reduced = false
  for (let sc = textScale; sc >= 0.5 && !items; sc = Math.round((sc - 0.05) * 100) / 100) {
    for (const withNote of [true, false]) {
      const it = build(sc, withNote)
      if (fits(it)) { items = it; reduced = sc < textScale || !withNote; break }
    }
  }
  if (!items) { items = build(0.5, false); reduced = true }

  // draw, centred on the text column
  ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  for (const it of items) {
    if (it.img) {
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(it.img, (L.cx - it.w / 2) * k, (it.y - it.h / 2) * k, it.w * k, it.h * k)
      ctx.imageSmoothingEnabled = true
      continue
    }
    ctx.font = font(it.bold, it.size, it.fam)
    let y = it.y - (it.lines.length * it.lh) / 2 + it.lh / 2
    for (const line of it.lines) { ctx.fillText(line, L.cx * k, y * k); y += it.lh }
  }

  if (mono) {
    const d = ctx.getImageData(0, 0, c.width, c.height), px = d.data
    for (let i = 0; i < px.length; i += 4) {
      const v = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) < 150 ? 0 : 255
      px[i] = px[i + 1] = px[i + 2] = v; px[i + 3] = 255
    }
    ctx.putImageData(d, 0, 0)
  }
  c.reduced = reduced
  return c
}

const fileBase = (asset, size) => `${(asset.asset_code || 'asset').replace(/[^\w-]+/g, '_')}_label_${size.w}x${size.h}mm`

function saveBlob(blob, name) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

// Downloads the label as a PNG image (203 dpi, pure black and white, one pixel per printer dot) or a PDF
// whose page is exactly the label size
export async function downloadLabel(asset, { logo, size, content, textScale = 1, pxPerMm = 8 }, format = 'pdf') {
  const canvas = await renderLabelCanvas(asset, { logo, size, content, textScale, pxPerMm })
  if (format === 'png') {
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
    saveBlob(blob, `${fileBase(asset, size)}.png`)
    return
  }
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: size.w >= size.h ? 'landscape' : 'portrait', unit: 'mm', format: [size.w, size.h] })
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, size.w, size.h)
  saveBlob(pdf.output('blob'), `${fileBase(asset, size)}.pdf`)
}
