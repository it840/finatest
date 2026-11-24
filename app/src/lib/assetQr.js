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
  { key: '60x40', w: 60, h: 40 }, { key: '70x40', w: 70, h: 40 }, { key: '75x40', w: 75, h: 40 },
  { key: '75x50', w: 75, h: 50 }, { key: '80x40', w: 80, h: 40 }, { key: '80x50', w: 80, h: 50 },
  { key: '80x60', w: 80, h: 60 },
  { key: 'a4', w: 170, h: 96, a4: true },
]

// Size and position of every part of the label, in mm, worked out from the label size
export function labelGeometry(w, h) {
  const m = Math.max(1.5, Math.min(4, h * 0.05))                // edge margin (thermal printers can't print the very edge)
  const frame = Math.min(h - 2 * m, w * 0.55)                    // framed QR: as big as the height allows
  const border = Math.max(0.7, frame * 0.03)
  const pad = Math.max(0.7, frame * 0.025)
  const qr = frame - 2 * border - 2 * pad                        // the code itself
  const textW = w - frame - 3 * m
  return { m, frame, border, pad, qr, textW }
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
  const small = h < 35
  return {
    prop: Math.min(h * 0.062, g.textW * 0.085), logo: h * (small ? 0.24 : 0.28), id: Math.min(h * 0.19, g.textW / 4.4),
    num: Math.min(h * 0.068, g.textW * 0.08), name: Math.min(h * 0.088, g.textW * 0.1), note: Math.min(h * 0.045, g.textW * 0.06),
    small,
  }
}

// Label: framed QR on the left; property, logo (or Asset ID), Asset No., name and note on the right.
// size = { w, h } in mm (a4: true prints a 170 x 96 mm label on an A4 sheet for office printers).
// content = 'full' (all details as text) or 'simple' (Asset ID, Asset No., name).
export function labelHtml(asset, { autoPrint = true, logo = null, size = { w: 170, h: 96, a4: true }, content = 'full' } = {}) {
  const qr = buildLabelQrUrl(asset, content)
  const name = asset.asset_name || ''
  const { w, h } = size
  const a4 = !!size.a4
  const g = labelGeometry(w, h)
  const f = (n) => `${(Math.round(n * 100) / 100)}mm`
  const small = h < 35
  const fs = labelFonts(w, h, g)
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(asset.asset_code)} label</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  @page { ${a4 ? 'size: A4; margin: 12mm;' : `size: ${f(w)} ${f(h)}; margin: 0;`} }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: Inter, Arial, sans-serif; ${a4 ? 'padding: 14mm; display: flex; flex-direction: column; align-items: center; gap: 6mm;' : ''} }
  .label { position: relative; width: ${f(w)}; height: ${f(h)}; overflow: hidden; background: #fff;
    display: flex; align-items: center; gap: ${f(g.m)}; padding: 0 ${f(g.m)};
    ${a4 ? 'border: 0.3mm solid #c4c8cc; border-radius: 5mm; padding: 0 9mm 0 7.5mm;' : ''} }
  .rivet { position: absolute; top: 50%; width: 2.4mm; height: 2.4mm; margin-top: -1.2mm; border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #ffffff 0%, #d5d8db 55%, #a4a8ad 100%); border: 0.2mm solid #9a9ea3; }
  .rivet.l { left: 2.3mm; } .rivet.r { right: 2.3mm; }
  .frame { flex: 0 0 auto; width: ${f(g.frame)}; height: ${f(g.frame)}; border: ${f(g.border)} solid #000; border-radius: ${f(g.frame * 0.05)};
    background: #fff; padding: ${f(g.pad)}; }
  .frame img { width: 100%; height: 100%; display: block; image-rendering: pixelated; }
  .txt { min-width: 0; flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; color: #000; }
  .prop { max-width: 100%; font-size: ${f(fs.prop)}; font-weight: 600; line-height: 1.2; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .logo { margin-top: ${f(h * 0.02)}; height: ${f(fs.logo)}; display: flex; align-items: center; justify-content: center; }
  .logo img { max-height: ${f(fs.logo)}; max-width: ${f(g.textW * 0.9)}; object-fit: contain; display: block; filter: grayscale(1); }
  .id { font-family: Oswald, "Arial Narrow", Impact, sans-serif; font-weight: 700; font-size: ${f(fs.id)}; line-height: 1.02; margin-top: ${f(h * 0.01)}; white-space: nowrap; }
  .num { max-width: 100%; font-size: ${f(fs.num)}; font-weight: 600; margin-top: ${f(h * 0.015)}; line-height: 1.2; overflow-wrap: anywhere; }
  .name { max-width: 100%; font-size: ${f(fs.name)}; font-weight: 700; margin-top: ${f(h * 0.012)}; line-height: 1.15; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; word-break: break-word; }
  .note { max-width: 100%; font-size: ${f(fs.note)}; margin-top: ${f(h * 0.015)}; line-height: 1.2; color: #222; ${small ? 'display: none;' : ''} }
  .hint { font: 12px Inter, Arial, sans-serif; color: #666; }
  @media print { .hint { display: none; } body { padding: 0 !important; } }
</style></head>
<body>
  <div class="label">
    ${a4 ? '<span class="rivet l"></span><span class="rivet r"></span>' : ''}
    <div class="frame"><img id="qr" src="${qr}" alt="QR code"></div>
    <div class="txt">
      <div class="prop">Property of ${esc(asset.property_name || 'Asset Registry System')}</div>
      ${logo
        ? `<div class="logo"><img id="logo" src="${esc(logo)}" alt="${esc(asset.property_name || '')}"></div>`
        : `<div class="id">${esc(asset.asset_code)}</div>`}
      ${asset.asset_number ? `<div class="num">Asset No. <b>${esc(asset.asset_number)}</b></div>` : ''}
      <div class="name" title="${esc(name)}">${esc(name)}</div>
      <div class="note">Scan to look up. Do not remove.</div>
    </div>
  </div>
  ${a4 ? `<div class="hint">Actual size ${w} × ${h} mm on A4.</div>` : ''}
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
