// What a scan shows: the full asset details as plain text (no website link), with the Acquisition Date.
export function qrText(a) {
  return [
    'IDENTIFICATION',
    `Asset ID: ${a.asset_code || ''}`,
    `Asset Number: ${a.asset_number || '—'}`,
    `Asset Name: ${a.asset_name || ''}`,
    `Category: ${a.category || '—'}`,
    `Sub-Category: ${a.sub_category || '—'}`,
    '',
    'ASSET DETAILS',
    `Brand: ${a.brand || '—'}`,
    `Model: ${a.model || '—'}`,
    `Serial Number: ${a.serial_number || '—'}`,
    `Acquisition Date: ${a.acquisition_date || '—'}`,
    '',
    'LOCATION & ASSIGNMENT',
    `Property: ${a.property_name || '—'}`,
    `Location: ${a.location || '—'}`,
    `Actual Location: ${a.actual_location || '—'}`,
    `Department: ${a.department || '—'}`,
    `Assigned To: ${a.assigned_to || '—'}`,
    '',
    'STATUS',
    `Status: ${a.status || '—'}`,
    `Condition: ${a.condition || '—'}`,
    '',
    'MAINTENANCE',
    `Last Maintenance: ${a.last_maintenance || '—'}`,
    `Next PMS: ${a.next_pms_date || '—'}`,
    ...(a.maint_history ? ['Repair History (latest first):', ...String(a.maint_history).split('\n').map(l => `- ${l}`)] : ['Repair History: none yet']),
    ...(a.photo_url ? ['', 'PHOTO', a.photo_url] : []),
  ].join('\n')
}

export function buildQrUrl(a) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&format=svg&qzone=2&data=${encodeURIComponent(qrText(a))}`
}

// Short QR text for small labels: Asset ID, Asset No. and name (big squares, prints cleanly on 203 dpi thermal printers)
export function qrSimpleText(a) {
  return [a.asset_code, a.asset_number, a.asset_name].map(v => String(v ?? '').trim()).filter(Boolean).join('\n')
}

export function buildLabelQrUrl(a, content = 'full') {
  const simple = content === 'simple'
  const text = simple ? qrSimpleText(a) : qrText(a)
  return `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&ecc=${simple ? 'M' : 'L'}&margin=0&format=svg&data=${encodeURIComponent(text)}`
}

// How many squares across a QR code needs for this text (byte mode), so the print window can warn when
// the squares would be too small for the printer.
const CAP = {
  L: [17,32,53,78,106,134,154,192,230,271,321,367,425,458,520,586,644,718,792,858,929,1003,1091,1171,1273,1367,1465,1528,1628,1732,1840,1952,2068,2188,2303,2431,2563,2699,2809,2953],
  M: [14,26,42,62,84,106,122,152,180,213,251,287,331,362,412,450,504,560,624,666,711,779,857,911,997,1059,1125,1190,1264,1370,1452,1538,1628,1722,1809,1911,1989,2099,2213,2331],
}
export function qrModules(asset, content = 'full') {
  const text = content === 'simple' ? qrSimpleText(asset) : qrText(asset)
  const bytes = new TextEncoder().encode(text).length
  const caps = CAP[content === 'simple' ? 'M' : 'L']
  const v = caps.findIndex(c => c >= bytes) + 1 || 40
  return 17 + 4 * v
}

// Label sizes. Thermal labels print at exactly the label size (no page shrinking).
export const LABEL_SIZES = [
  { key: '40x30', w: 40, h: 30 }, { key: '50x30', w: 50, h: 30 }, { key: '50x40', w: 50, h: 40 },
  { key: '60x40', w: 60, h: 40 }, { key: '61x48', w: 61, h: 48 }, { key: '70x40', w: 70, h: 40 }, { key: '75x40', w: 75, h: 40 },
  { key: '75x50', w: 75, h: 50 }, { key: '80x40', w: 80, h: 40 }, { key: '80x50', w: 80, h: 50 },
  { key: '80x60', w: 80, h: 60 },
  { key: 'a4', w: 170, h: 96, a4: true },
]

// The label design, measured from the label laid out in the Clabel app (70 x 40 mm, positions from the
// label's top-left corner, font sizes in points as shown in the app). Other label sizes scale from this.
export const LABEL_TEMPLATE = {
  w: 70, h: 40,
  qr: { x: 6.4, y: 3.7, size: 30.7 },
  cx: 55.9,                                            // centre line of the text column
  prop: { y: 4.7, pt: 6, bold: true },                 // "Property of …"
  logo: { y: 14.1, size: 14.6 },                       // logo, centred on cx
  num: { y: 24.1, pt: 6, bold: true },                 // "Asset No. …"
  name: { y: 27.5, pt: 9, bold: false },               // asset name
  note: { y: 31.9, pt: 5, bold: true },                // "Scan to look up. Do not remove."
}
const PT = 25.4 / 72                                   // 1 point in mm

// Every part of the label in mm for a given label size (y values are centres)
export function labelLayout(w, h) {
  const T = LABEL_TEMPLATE
  const sx = w / T.w, sy = h / T.h, sf = Math.min(sx, sy)
  const qr = T.qr.size * sf
  const qx = T.qr.x * sx
  const qy = Math.min(T.qr.y * sy, h - qr - 1)
  const cx = T.cx * sx
  const left = qx + qr + 1.2 * sf, right = w - 1.2 * sf
  const maxW = 2 * Math.max(4, Math.min(cx - left, right - cx))      // widest a text line may be
  const item = (t) => ({ y: t.y * sy, size: t.pt * PT * sf, bold: t.bold })
  return {
    sx, sy, sf, qr, qx, qy, cx, maxW,
    logo: { y: T.logo.y * sy, size: T.logo.size * sf, maxW: maxW * 0.95 },
    prop: item(T.prop), num: item(T.num), name: item(T.name), note: item(T.note),
  }
}

// QR size (mm) for the square-size check in the print window
export function labelGeometry(w, h) {
  const L = labelLayout(w, h)
  return { qr: L.qr }
}

export function propertyLogoUrl(properties, propertyId) {
  const raw = (properties || []).find(p => p.id === propertyId)?.logo_url
  if (!raw) return null
  if (/^https?:\/\//.test(raw)) return raw
  return new URL(`${import.meta.env.BASE_URL}${raw.replace(/^\//, '')}`, window.location.href).href
}

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))


// Print page: the finished label image at exactly the label size (the same image the preview and the
// downloads use, so what you see is exactly what prints). size.a4 prints it on an A4 sheet.
export function labelPrintHtml(imageUrl, size, title = 'Label') {
  const f = (n) => `${Math.round(n * 100) / 100}mm`
  const a4 = !!size.a4
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { ${a4 ? 'size: A4; margin: 12mm;' : `size: ${f(size.w)} ${f(size.h)}; margin: 0;`} }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; }
  ${a4 ? 'body { padding: 14mm; display: flex; justify-content: center; }' : ''}
  img { display: block; width: ${f(size.w)}; height: ${f(size.h)}; image-rendering: pixelated; }
  @media print { body { padding: 0 !important; } }
</style></head>
<body>
  <img id="label" src="${imageUrl}" alt="${esc(title)}">
  <script>
    (function () {
      var done = false, go = function () { if (!done) { done = true; setTimeout(function () { window.print() }, 150) } };
      var i = document.getElementById('label');
      if (i.complete) go(); else { i.onload = go; i.onerror = go; }
      setTimeout(go, 3000);
    })();
  </script>
</body></html>`
}

// Opens the finished label image in a new window and prints it
export function printLabelImage(imageUrl, size, title) {
  const w = window.open('', '_blank', 'width=640,height=480')
  if (!w) return
  w.document.write(labelPrintHtml(imageUrl, size, title))
  w.document.close()
}
