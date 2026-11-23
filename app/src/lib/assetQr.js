// The QR code on every asset: a text summary that includes an "Asset ID:" line (read by the transfer scanner).
// What a scan shows: the detailed layout with section headings (restored), plus the Acquisition Date.
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

// The QR holds a short link that opens this asset in the app (sign-in required to see it).
// A short link makes a big, simple pattern that phones read instantly.
export function assetLink(a) {
  const base = window.location.origin + window.location.pathname.replace(/index\.html$/, '')
  return `${base}?asset=${encodeURIComponent(a.asset_code || '')}`
}

export function buildQrUrl(a) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&format=svg&ecc=M&qzone=2&data=${encodeURIComponent(assetLink(a))}`
}

export function buildLabelQrUrl(a) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&format=svg&ecc=M&margin=0&data=${encodeURIComponent(assetLink(a))}`
}

export function propertyLogoUrl(properties, propertyId) {
  const raw = (properties || []).find(p => p.id === propertyId)?.logo_url
  if (!raw) return null
  if (/^https?:\/\//.test(raw)) return raw
  return new URL(`${import.meta.env.BASE_URL}${raw.replace(/^\//, '')}`, window.location.href).href
}

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// "SCAN ME" tag: speech bubble over a bold-framed QR (a short link, so a big simple pattern),
// then the property logo (or the Asset ID), Asset No., name and property. Printed at real size (70 mm wide).
export function labelHtml(asset, { autoPrint = true, logo = null } = {}) {
  const qr = buildLabelQrUrl(asset)
  const name = asset.asset_name || ''
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(asset.asset_code)} label</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; padding: 14mm; font-family: Inter, Arial, sans-serif; background: #fff; display: flex; flex-direction: column; align-items: center; gap: 6mm; color: #141414; }
  .tag { width: 70mm; border: 0.3mm solid #c4c8cc; border-radius: 5mm; background: #fff; padding: 6mm 6mm 5mm;
         display: flex; flex-direction: column; align-items: center; box-shadow: 0 0.4mm 1.2mm rgba(0,0,0,.14); }
  .bubble { position: relative; background: #111; color: #fff; border-radius: 3mm; padding: 2.2mm 6mm 2.4mm;
            font-weight: 800; font-size: 8.5mm; letter-spacing: 0.4mm; line-height: 1; margin-bottom: 4.5mm; }
  .bubble::after { content: ""; position: absolute; right: 7mm; bottom: -3.4mm; border-left: 3.4mm solid transparent;
                   border-right: 3.4mm solid transparent; border-top: 3.6mm solid #111; }
  .frame { width: 58mm; height: 58mm; border: 2.4mm solid #111; border-radius: 3.5mm; background: #fff; padding: 3.6mm; }
  .frame img { width: 100%; height: 100%; display: block; image-rendering: pixelated; }
  .info { width: 100%; margin-top: 4mm; display: flex; flex-direction: column; align-items: center; text-align: center; }
  .logo { height: 15mm; display: flex; align-items: center; justify-content: center; }
  .logo img { max-height: 15mm; max-width: 40mm; object-fit: contain; display: block; }
  .id { font-family: Oswald, "Arial Narrow", Impact, sans-serif; font-weight: 700; font-size: 10mm; line-height: 1.05; }
  .num { margin-top: 1.6mm; font-size: 4.4mm; font-weight: 600; color: #3a3d42; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .num b { font-weight: 700; color: #141414; }
  .name { margin-top: 0.8mm; font-size: 5mm; font-weight: 700; line-height: 1.18; max-width: 100%; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; word-break: break-word; }
  .prop { margin-top: 1.2mm; font-size: 3.1mm; color: #555a60; line-height: 1.25; max-width: 100%; }
  .hint { font: 12px Inter, Arial, sans-serif; color: #666; }
  @media print { .hint { display: none; } body { padding: 0; } }
</style></head>
<body>
  <div class="tag">
    <div class="bubble">SCAN ME</div>
    <div class="frame"><img id="qr" src="${qr}" alt="QR code"></div>
    <div class="info">
      ${logo
        ? `<div class="logo"><img id="logo" src="${esc(logo)}" alt="${esc(asset.property_name || '')}"></div>`
        : `<div class="id">${esc(asset.asset_code)}</div>`}
      ${asset.asset_number ? `<div class="num">Asset No. <b>${esc(asset.asset_number)}</b></div>` : ''}
      <div class="name" title="${esc(name)}">${esc(name)}</div>
      <div class="prop">Property of ${esc(asset.property_name || 'Asset Registry System')} · Do not remove</div>
    </div>
  </div>
  <div class="hint">Actual size 70 mm wide.</div>
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
export function printAssetQr(asset, logo = null) {
  const w = window.open('', '_blank', 'width=560,height=420')
  if (!w) return
  w.document.write(labelHtml(asset, { logo }))
  w.document.close()
}
