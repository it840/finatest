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

// --- drawing helpers -----------------------------------------------------------------------------------
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

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

// Draws the label at its real size (about 300 dpi): framed QR on the left; property, black logo (or Asset ID),
// Asset No., name and note on the right - the same layout as the printed label.
export async function renderLabelCanvas(asset, { logo = null, size, content = 'full', pxPerMm = 8, mono = true }) {
  const { w, h } = size
  const g = labelGeometry(w, h)
  const fs = labelFonts(w, h, g)
  const k = pxPerMm
  const c = document.createElement('canvas')
  c.width = Math.round(w * k); c.height = Math.round(h * k)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)

  try { await Promise.all(['600', '700', '800'].map(wt => document.fonts.load(`${wt} 20px Inter`))) } catch { /* use fallback fonts */ }
  const font = (wt, mm, fam = 'Inter, Arial, sans-serif') => `${wt} ${mm * k}px ${fam}`

  // framed QR
  const fx = g.m * k, fy = ((h - g.frame) / 2) * k, F = g.frame * k, B = g.border * k, R = g.frame * 0.05 * k
  ctx.fillStyle = '#000'; roundRect(ctx, fx, fy, F, F, R); ctx.fill()
  ctx.fillStyle = '#fff'; roundRect(ctx, fx + B, fy + B, F - 2 * B, F - 2 * B, Math.max(R - B, 0)); ctx.fill()
  const simple = content === 'simple'
  const qr = QRCode.create(simple ? qrSimpleText(asset) : qrText(asset), { errorCorrectionLevel: simple ? 'M' : 'L' })
  const n = qr.modules.size
  const q0x = fx + B + g.pad * k, q0y = fy + B + g.pad * k, Q = g.qr * k
  ctx.fillStyle = '#000'
  for (let r = 0; r < n; r++) {
    for (let col = 0; col < n; col++) {
      if (!qr.modules.get(r, col)) continue
      const x1 = Math.round(q0x + (col * Q) / n), x2 = Math.round(q0x + ((col + 1) * Q) / n)
      const y1 = Math.round(q0y + (r * Q) / n), y2 = Math.round(q0y + ((r + 1) * Q) / n)
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1)
    }
  }

  // text column - built for a given text scale; the layout below picks the largest version that fits
  const tx = (g.m + g.frame + g.m) * k, tw = (w - g.frame - 3 * g.m) * k, cx = tx + tw / 2
  let logoImg = null
  if (logo) { try { logoImg = await loadImage(logo) } catch { logoImg = null } }
  const build = (sc, nameLines, withNote) => {
    const F = { prop: fs.prop * sc, logo: fs.logo * sc, id: fs.id * sc, num: fs.num * sc, name: fs.name * sc, note: fs.note * sc }
    const out = []
    ctx.font = font(700, F.prop)
    out.push({ kind: 'lines', lines: wrap(ctx, `Property of ${asset.property_name || 'Asset Registry System'}`, tw, 2), font: font(700, F.prop), lh: F.prop * 1.2 * k, gap: 0 })
    if (logoImg) {
      const maxW = tw * 0.9, maxH = F.logo * k
      const r = Math.min(maxW / logoImg.naturalWidth, maxH / logoImg.naturalHeight)
      out.push({ kind: 'img', img: logoImg, w: logoImg.naturalWidth * r, h: logoImg.naturalHeight * r, box: maxH, gap: h * 0.02 * k })
    } else {
      // big Asset ID (no logo): as large as the column width allows
      let idSize = F.id
      const idFont = (sz) => font(700, sz, 'Oswald, "Arial Narrow", Impact, sans-serif')
      ctx.font = idFont(idSize)
      while (ctx.measureText(asset.asset_code || '').width > tw && idSize > F.id * 0.4) { idSize *= 0.95; ctx.font = idFont(idSize) }
      out.push({ kind: 'lines', lines: [asset.asset_code || ''], font: idFont(idSize), lh: idSize * 1.05 * k, gap: h * 0.01 * k })
    }
    if (asset.asset_number) out.push({ kind: 'num', label: 'Asset No. ', value: asset.asset_number, size: F.num, lh: F.num * 1.2 * k, gap: h * 0.015 * k })
    ctx.font = font(800, F.name)
    out.push({ kind: 'lines', lines: wrap(ctx, asset.asset_name || '', tw, nameLines), font: font(800, F.name), lh: F.name * 1.15 * k, gap: h * 0.012 * k })
    if (withNote) { ctx.font = font(600, F.note); out.push({ kind: 'lines', lines: wrap(ctx, 'Scan to look up. Do not remove.', tw, 2), font: font(600, F.note), lh: F.note * 1.2 * k, gap: h * 0.015 * k }) }
    return out
  }
  const numFits = (b) => {
    ctx.font = font(700, b.size); const w1 = ctx.measureText(b.label).width
    ctx.font = font(800, b.size); const w2 = ctx.measureText(b.value).width
    return w1 + w2 <= tw
  }
  const heightOf = (b) => b.gap + (b.kind === 'img' ? b.box : b.kind === 'num' ? b.lh * (numFits(b) ? 1 : 2) : b.lines.length * b.lh)
  const total = (bl) => bl.reduce((sum, b) => sum + heightOf(b), 0)
  // largest text that fits the label height: drop the note first, then use 2 lines for the name, then shrink a little
  const room = c.height - 2 * g.m * k
  let blocks = null
  for (const [nameLines, withNote] of [[3, !fs.small], [3, false], [2, false]]) {
    const bl = build(1, nameLines, withNote)
    if (total(bl) <= room) { blocks = bl; break }
  }
  for (let sc = 0.95; !blocks && sc >= 0.6; sc -= 0.05) {
    const bl = build(sc, 2, false)
    if (total(bl) <= room || sc - 0.05 < 0.6) blocks = bl
  }

  let y = (c.height - total(blocks)) / 2
  ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  for (const b of blocks) {
    y += b.gap
    if (b.kind === 'img') {
      ctx.drawImage(b.img, cx - b.w / 2, y + (b.box - b.h) / 2, b.w, b.h)
      y += b.box
    } else if (b.kind === 'num') {
      // "Asset No." in semi-bold, the number in bold, centred together
      ctx.font = font(700, b.size); const w1 = ctx.measureText(b.label).width
      ctx.font = font(800, b.size); const w2 = ctx.measureText(b.value).width
      if (w1 + w2 <= tw) {
        ctx.textAlign = 'left'
        const x0 = cx - (w1 + w2) / 2
        ctx.font = font(700, b.size); ctx.fillText(b.label, x0, y + b.lh / 2)
        ctx.font = font(800, b.size); ctx.fillText(b.value, x0 + w1, y + b.lh / 2)
        ctx.textAlign = 'center'
        y += b.lh
      } else {
        ctx.font = font(700, b.size); ctx.fillText(b.label.trim(), cx, y + b.lh / 2); y += b.lh
        let size = b.size; ctx.font = font(800, size)
        while (ctx.measureText(b.value).width > tw && size > b.size * 0.6) { size *= 0.95; ctx.font = font(800, size) }
        ctx.fillText(b.value, cx, y + b.lh / 2); y += b.lh
      }
    } else {
      ctx.font = b.font
      for (const line of b.lines) { ctx.fillText(line, cx, y + b.lh / 2); y += b.lh }
    }
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
export async function downloadLabel(asset, { logo, size, content }, format = 'pdf') {
  const canvas = await renderLabelCanvas(asset, { logo, size, content })
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
