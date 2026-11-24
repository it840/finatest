// Label image for download (PNG / PDF) and the black-only logo used on printed labels.
import QRCode from 'qrcode'
import { labelGeometry, labelFonts, qrText, qrSimpleText } from './assetQr'

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

// Draws the label at its real size (one pixel per printer dot at 203 dpi), same layout as the printed label:
// plain QR on the left; on the right, left-aligned, property line, logo (centred), Asset No., name and note,
// spread evenly from top to bottom. Pure black and white so a thermal printer prints it crisply.
export async function renderLabelCanvas(asset, { logo = null, size, content = 'full', pxPerMm = 8, mono = true, textScale = 1 }) {
  const { w, h } = size
  const g = labelGeometry(w, h)
  const fs = labelFonts(w, h, g, textScale)
  const k = pxPerMm
  const c = document.createElement('canvas')
  c.width = Math.round(w * k); c.height = Math.round(h * k)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)

  try { await Promise.all(['600', '700', '800'].map(wt => document.fonts.load(`${wt} 20px Inter`))) } catch { /* use fallback fonts */ }
  const font = (wt, mm, fam = 'Inter, Arial, sans-serif') => `${wt} ${mm * k}px ${fam}`

  // QR (plain, no frame), vertically centred
  const simple = content === 'simple'
  const qr = QRCode.create(simple ? qrSimpleText(asset) : qrText(asset), { errorCorrectionLevel: simple ? 'M' : 'L' })
  const n = qr.modules.size
  const qx = g.m * k, qy = ((h - g.qr) / 2) * k, Q = g.qr * k
  ctx.fillStyle = '#000'
  for (let r = 0; r < n; r++) {
    for (let col = 0; col < n; col++) {
      if (!qr.modules.get(r, col)) continue
      const x1 = Math.round(qx + (col * Q) / n), x2 = Math.round(qx + ((col + 1) * Q) / n)
      const y1 = Math.round(qy + (r * Q) / n), y2 = Math.round(qy + ((r + 1) * Q) / n)
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1)
    }
  }

  // text column, built for a given text scale; the largest version that fits is used
  const tx = (g.m + g.qr + g.gap) * k, tw = g.textW * k, cx = tx + tw / 2
  let logoImg = null
  if (logo) { try { logoImg = await loadImage(logo) } catch { logoImg = null } }
  if (logoImg) ctx.imageSmoothingEnabled = false
  const build = (sc, nameLines, withNote) => {
    const F = { prop: fs.prop * sc, logo: fs.logo * sc, id: fs.id * sc, num: fs.num * sc, name: fs.name * sc, note: fs.note * sc }
    const out = []
    ctx.font = font(700, F.prop)
    out.push({ kind: 'lines', lines: wrap(ctx, `Property of ${asset.property_name || 'Asset Registry System'}`, tw, 2), font: font(700, F.prop), lh: F.prop * 1.15 * k })
    if (logoImg) {
      const maxW = tw * 0.9, maxH = F.logo * k
      const r = Math.min(maxW / logoImg.naturalWidth, maxH / logoImg.naturalHeight)
      out.push({ kind: 'img', img: logoImg, w: logoImg.naturalWidth * r, h: logoImg.naturalHeight * r, box: maxH })
    } else {
      let idSize = F.id
      const idFont = (sz) => font(700, sz, 'Oswald, "Arial Narrow", Impact, sans-serif')
      ctx.font = idFont(idSize)
      while (ctx.measureText(asset.asset_code || '').width > tw && idSize > F.id * 0.4) { idSize *= 0.95; ctx.font = idFont(idSize) }
      out.push({ kind: 'lines', lines: [asset.asset_code || ''], font: idFont(idSize), lh: idSize * 1.05 * k })
    }
    if (asset.asset_number) {
      ctx.font = font(700, F.num)
      out.push({ kind: 'lines', lines: wrap(ctx, `Asset No. ${asset.asset_number}`, tw, 2), font: font(700, F.num), lh: F.num * 1.2 * k })
    }
    ctx.font = font(800, F.name)
    out.push({ kind: 'lines', lines: wrap(ctx, asset.asset_name || '', tw, nameLines), font: font(800, F.name), lh: F.name * 1.12 * k })
    if (withNote) {
      ctx.font = font(600, F.note)
      out.push({ kind: 'lines', lines: wrap(ctx, 'Scan to look up. Do not remove.', tw, 2), font: font(600, F.note), lh: F.note * 1.2 * k })
    }
    return out
  }
  const heightOf = (b) => (b.kind === 'img' ? b.box : b.lines.length * b.lh)
  const total = (bl) => bl.reduce((sum, b) => sum + heightOf(b), 0)
  const room = c.height - 2 * g.mv * k
  let blocks = null
  for (const [nameLines, withNote] of [[3, !fs.small], [3, false], [2, false]]) {
    const bl = build(1, nameLines, withNote)
    if (total(bl) <= room) { blocks = bl; break }
  }
  for (let sc = 0.95; !blocks && sc >= 0.6; sc -= 0.05) {
    const bl = build(sc, 2, false)
    if (total(bl) <= room || sc - 0.05 < 0.6) blocks = bl
  }

  // spread the lines evenly from top to bottom (like the label on the roll)
  const spare = Math.max(0, room - total(blocks))
  const step = blocks.length > 1 ? spare / (blocks.length - 1) : 0
  let y = g.mv * k + (blocks.length > 1 ? 0 : spare / 2)
  ctx.fillStyle = '#000'; ctx.textBaseline = 'middle'
  for (const b of blocks) {
    if (b.kind === 'img') {
      ctx.drawImage(b.img, cx - b.w / 2, y + (b.box - b.h) / 2, b.w, b.h)   // logo centred in the column
    } else {
      ctx.font = b.font; ctx.textAlign = 'left'
      let ly = y
      for (const line of b.lines) { ctx.fillText(line, tx, ly + b.lh / 2); ly += b.lh }
    }
    y += heightOf(b) + step
  }

  if (mono) {
    const d = ctx.getImageData(0, 0, c.width, c.height), px = d.data
    for (let i = 0; i < px.length; i += 4) {
      const v = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) < 150 ? 0 : 255
      px[i] = px[i + 1] = px[i + 2] = v; px[i + 3] = 255
    }
    ctx.putImageData(d, 0, 0)
  }
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
export async function downloadLabel(asset, { logo, size, content, textScale = 1 }, format = 'pdf') {
  const canvas = await renderLabelCanvas(asset, { logo, size, content, textScale })
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
