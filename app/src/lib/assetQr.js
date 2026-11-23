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

export function buildQrUrl(a) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&format=svg&qzone=2&data=${encodeURIComponent(qrText(a))}`
}

// The printed label carries the SAME full details. Full details make a dense code, so the label prints it
// large (68 mm) as a sharp vector image - tested to scan on 100, 150, 200 and 300 dpi printers.
export function buildLabelQrUrl(a) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&ecc=L&margin=0&format=svg&data=${encodeURIComponent(qrText(a))}`
}

export function propertyLogoUrl(properties, propertyId) {
  const raw = (properties || []).find(p => p.id === propertyId)?.logo_url
  if (!raw) return null
  if (/^https?:\/\//.test(raw)) return raw
  return new URL(`${import.meta.env.BASE_URL}${raw.replace(/^\//, '')}`, window.location.href).href
}

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// Label: the earlier layout (QR on the left; property, logo, Asset No., name and note on the right, 150 x 76 mm)
// with the framed QR design - a bold rounded frame around the QR, which holds the full asset details as text.
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
  body { margin: 0; padding: 14mm; font-family: Inter, Arial, sans-serif; background: #fff; display: flex; flex-direction: column; align-items: center; gap: 6mm; }
  .label {
    position: relative; width: 150mm; height: 76mm; border-radius: 5mm;
    display: flex; align-items: center; gap: 5mm; padding: 0 9mm 0 7.5mm;
    border: 0.3mm solid #c4c8cc;
    background: #ffffff;
    box-shadow: 0 0.4mm 1.2mm rgba(0,0,0,.14);
  }
  .rivet { position: absolute; top: 50%; width: 2.4mm; height: 2.4mm; margin-top: -1.2mm; border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #ffffff 0%, #d5d8db 55%, #a4a8ad 100%); border: 0.2mm solid #9a9ea3; }
  .rivet.l { left: 2.3mm; } .rivet.r { right: 2.3mm; }
  .qrbox { flex: 0 0 auto; width: 64mm; display: flex; flex-direction: column; align-items: center; }
  .frame { width: 64mm; height: 64mm; border: 2.4mm solid #111; border-radius: 3.6mm; background: #fff; padding: 3.4mm; }
  .frame img { width: 100%; height: 100%; display: block; image-rendering: pixelated; }
  .txt { min-width: 0; flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; color: #1c1e21; }
  .prop { max-width: 100%; font-size: 4.6mm; font-weight: 600; color: #34373b; line-height: 1.2; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .id { font-family: Oswald, "Arial Narrow", "Roboto Condensed", Impact, sans-serif; font-weight: 700; font-size: 13mm; line-height: 1.02; letter-spacing: 0.1mm; margin-top: 1mm; white-space: nowrap; }
  .logo { margin-top: 2mm; height: 24mm; display: flex; align-items: center; justify-content: center; }
  .logo img { max-height: 24mm; max-width: 56mm; object-fit: contain; display: block; }
  .num { max-width: 100%; font-size: 5mm; font-weight: 600; color: #3a3d42; margin-top: 1.2mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .num b { font-weight: 700; color: #1c1e21; letter-spacing: 0.08mm; }
  .name { max-width: 100%; font-size: 6.2mm; font-weight: 700; margin-top: 1.2mm; line-height: 1.18; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; word-break: break-word; }
  .note { max-width: 100%; font-size: 3.6mm; color: #555a60; margin-top: 1.4mm; line-height: 1.25; }
  .hint { font: 12px Inter, Arial, sans-serif; color: #666; }
  @media print { .hint { display: none; } body { padding: 0; } }
</style></head>
<body>
  <div class="label">
    <span class="rivet l"></span><span class="rivet r"></span>
    <div class="qrbox">
      <div class="frame"><img id="qr" src="${qr}" alt="QR code"></div>
    </div>
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
  <div class="hint">Actual size 150 × 76 mm.</div>
  ${autoPrint ? `<script>
    (function () {
      var done = false, go = function () { if (!done) { done = true; setTimeout(function () { window.print() }, 150) } };
      var imgs = [document.getElementById('qr'), document.getElementById('logo')].filter(Boolean), left = imgs.length;
      var ready = function () { (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go) };
      var one = function () { if (--left <= 0) ready() };
      imgs.forEach(function (i) { if (i.complete) one(); else { i.onload = one; i.onerror = one; } });
      setTimeout(go, 4000);   // print anyway if the QR image or fonts are slow
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
