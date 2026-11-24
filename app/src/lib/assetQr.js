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

// Size and position of every part of the label, in mm, worked out from the label size.
// Layout (matches the label printed on the Clabel roll): a large plain QR on the left, filling most of the height;
// on the right, left-aligned: property line, logo (centred in the column), Asset No., name (largest) and note,
// spread evenly from top to bottom.
export function labelGeometry(w, h) {
  const m = Math.max(1.5, h * 0.085)                             // left margin before the QR
  const qr = Math.min(h * 0.8, w * 0.52, h - 3)                  // square QR
  const gap = Math.max(1.2, h * 0.04)                            // space between QR and text
  const mv = Math.max(1.5, h * 0.08)                             // top / bottom margin of the text column
  const mr = Math.max(1.5, h * 0.05)                             // right margin
  const textW = w - m - qr - gap - mr
  return { m, qr, frame: qr, border: 0, pad: 0, gap, mv, mr, textW }
}

export function propertyLogoUrl(properties, propertyId) {
  const raw = (properties || []).find(p => p.id === propertyId)?.logo_url
  if (!raw) return null
  if (/^https?:\/\//.test(raw)) return raw
  return new URL(`${import.meta.env.BASE_URL}${raw.replace(/^\//, '')}`, window.location.href).href
}

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// Text sizes (mm) for a label, shared by the printed label and the downloadable file
export function labelFonts(w, h, g = labelGeometry(w, h)) {
  const small = h < 30 || g.textW < 18           // very little room: leave out the "Scan to look up" note
  return {
    prop: Math.min(h * 0.058, g.textW * 0.085), logo: Math.min(h * 0.34, g.textW * 0.62), id: Math.min(h * 0.2, g.textW / 4.4),
    num: Math.min(h * 0.063, g.textW * 0.09), name: Math.min(h * 0.089, g.textW * 0.13), note: Math.min(h * 0.042, g.textW * 0.065),
    small,
  }
}

// Label: QR on the left; property, logo (or Asset ID), Asset No., name and note on the right.
// size = { w, h } in mm (a4: true prints a 170 x 96 mm label on an A4 sheet for office printers).
// content = 'full' (all details as text) or 'simple' (Asset ID, Asset No., name).
export function labelHtml(asset, { autoPrint = true, logo = null, size = { w: 170, h: 96, a4: true }, content = 'full' } = {}) {
  const qr = buildLabelQrUrl(asset, content)
  const name = asset.asset_name || ''
  const { w, h } = size
  const a4 = !!size.a4
  const g = labelGeometry(w, h)
  const fs = labelFonts(w, h, g)
  const f = (n) => `${(Math.round(n * 100) / 100)}mm`
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(asset.asset_code)} label</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@600;700;800&display=swap" rel="stylesheet">
<style>
  @page { ${a4 ? 'size: A4; margin: 12mm;' : `size: ${f(w)} ${f(h)}; margin: 0;`} }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: Inter, Arial, sans-serif; color: #000; ${a4 ? 'padding: 14mm; display: flex; flex-direction: column; align-items: center; gap: 6mm;' : ''} }
  .label { position: relative; width: ${f(w)}; height: ${f(h)}; overflow: hidden; background: #fff;
    display: flex; align-items: center; gap: ${f(g.gap)}; padding: 0 ${f(g.mr)} 0 ${f(g.m)};
    ${a4 ? 'border: 0.3mm solid #c4c8cc; border-radius: 5mm;' : ''} }
  .qr { flex: 0 0 auto; width: ${f(g.qr)}; height: ${f(g.qr)}; display: block; image-rendering: pixelated; }
  .txt { min-width: 0; flex: 1; height: ${f(h - 2 * g.mv)}; display: flex; flex-direction: column; justify-content: space-between;
    align-items: flex-start; text-align: left; }
  .prop { max-width: 100%; font-size: ${f(fs.prop)}; font-weight: 700; line-height: 1.15; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .logo { align-self: center; height: ${f(fs.logo)}; display: flex; align-items: center; justify-content: center; }
  .logo img { max-height: ${f(fs.logo)}; max-width: ${f(g.textW * 0.9)}; object-fit: contain; display: block; image-rendering: pixelated; }
  .id { font-family: Oswald, "Arial Narrow", Impact, sans-serif; font-weight: 700; font-size: ${f(fs.id)}; line-height: 1.02; white-space: nowrap; }
  .num { max-width: 100%; font-size: ${f(fs.num)}; font-weight: 700; line-height: 1.2; overflow-wrap: anywhere; }
  .name { max-width: 100%; font-size: ${f(fs.name)}; font-weight: 800; line-height: 1.12; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; word-break: break-word; }
  .note { max-width: 100%; font-size: ${f(fs.note)}; font-weight: 600; line-height: 1.2; ${fs.small ? 'display: none;' : ''} }
  .hint { font: 12px Inter, Arial, sans-serif; color: #666; }
  @media print { .hint { display: none; } body { padding: 0 !important; } }
</style></head>
<body>
  <div class="label">
    <img class="qr" id="qr" src="${qr}" alt="QR code">
    <div class="txt">
      <div class="prop">Property of ${esc(asset.property_name || 'Asset Registry System')}</div>
      ${logo
        ? `<div class="logo"><img id="logo" src="${esc(logo)}" alt="${esc(asset.property_name || '')}"></div>`
        : `<div class="id">${esc(asset.asset_code)}</div>`}
      ${asset.asset_number ? `<div class="num">Asset No. ${esc(asset.asset_number)}</div>` : ''}
      <div class="name" title="${esc(name)}">${esc(name)}</div>
      <div class="note">Scan to look up. Do not remove.</div>
    </div>
  </div>
  ${a4 ? `<div class="hint">Actual size ${w} × ${h} mm on A4.</div>` : ''}
  <script>
    // fit the text to the label: drop the note, then 2-line name, then shrink a little until nothing overflows
    (function () {
      var t = document.querySelector('.txt'); if (!t) return
      var over = function () {
        var kids = [].slice.call(t.children).filter(function (e) { return getComputedStyle(e).display !== 'none' })
        var sum = kids.reduce(function (s, e) { return s + e.getBoundingClientRect().height }, 0)
        return sum > t.clientHeight + 1 || kids.some(function (e) { return e.scrollWidth > t.clientWidth + 1 })
      }
      var fit = function () {
        var note = document.querySelector('.note'), name = document.querySelector('.name')
        if (over() && note) note.style.display = 'none'
        if (over() && name) name.style.webkitLineClamp = '2'
        for (var s = 0.95; over() && s >= 0.6; s -= 0.05) t.style.zoom = s
      }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit); else fit()
      window.addEventListener('load', fit)
    })();
  </script>
  ${autoPrint ? `<script>
    (function () {
      var done = false, go = function () { if (!done) { done = true; setTimeout(function () { window.print() }, 150) } };
      var imgs = [document.getElementById('qr'), document.getElementById('logo')].filter(Boolean), left = imgs.length;
      var ready = function () { (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go) };
      var one = function () { if (--left <= 0) ready() };
      imgs.forEach(function (i) { if (i.complete) one(); else { i.onload = one; i.onerror = one; } });
      setTimeout(go, 4000);
    })();
  </script>` : ''}
</body></html>`
}

// Opens the label in a new window and prints it
export function printAssetQr(asset, logo = null, opts = {}) {
  const w = window.open('', '_blank', 'width=640,height=480')
  if (!w) return
  w.document.write(labelHtml(asset, { logo, ...opts }))
  w.document.close()
}
