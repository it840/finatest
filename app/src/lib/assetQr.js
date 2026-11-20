// The QR code on every asset: a text summary that includes an "Asset ID:" line (read by the transfer scanner).
export function buildQrUrl(a) {
  const lines = [
    'IDENTIFICATION',
    `Asset ID: ${a.asset_code || ''}`,
    `Asset Name: ${a.asset_name || ''}`,
    `Category: ${a.category || '—'}`,
    `Sub-Category: ${a.sub_category || '—'}`,
    '',
    'ASSET DETAILS',
    `Brand: ${a.brand || '—'}`,
    `Model: ${a.model || '—'}`,
    `Serial Number: ${a.serial_number || '—'}`,
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
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(lines)}`
}

// Short QR for the printed label: few enough characters that the code stays large and easy to scan
// at 28 mm. Keeps the "Asset ID:" line the Transfer scanner reads.
export function labelQrText(a) {
  return [
    `Asset ID: ${a.asset_code || ''}`,
    a.asset_number ? `Asset No.: ${a.asset_number}` : null,
    a.asset_name ? `Name: ${a.asset_name}` : null,
    a.property_name ? `Property: ${a.property_name}` : null,
  ].filter(Boolean).join('\n')
}
export function buildLabelQrUrl(a) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=600x600&ecc=M&margin=0&data=${encodeURIComponent(labelQrText(a))}`
}

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// Brushed-metal asset tag: QR on the left; Property, Asset ID (large), Asset Number, Asset Name on the right.
// Printed at real size (90 x 36 mm) so it can go on a label sheet or be cut out.
export function labelHtml(asset, { autoPrint = true } = {}) {
  const qr = buildLabelQrUrl(asset)
  const name = asset.asset_name || ''
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(asset.asset_code)} label</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; padding: 14mm; font-family: Inter, Arial, sans-serif; background: #fff; display: flex; flex-direction: column; align-items: center; gap: 6mm; }
  .label {
    position: relative; width: 90mm; height: 36mm; border-radius: 3.6mm;
    display: flex; align-items: center; gap: 4mm; padding: 0 8mm 0 7mm;
    border: 0.3mm solid #c4c8cc;
    background: #ffffff;
    box-shadow: 0 0.4mm 1.2mm rgba(0,0,0,.14);
  }
  .rivet { position: absolute; top: 50%; width: 2.4mm; height: 2.4mm; margin-top: -1.2mm; border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #ffffff 0%, #d5d8db 55%, #a4a8ad 100%); border: 0.2mm solid #9a9ea3; }
  .rivet.l { left: 2.3mm; } .rivet.r { right: 2.3mm; }
  .qr { flex: 0 0 auto; width: 28mm; height: 28mm; background: #fff; padding: 0.6mm; }
  .qr img { width: 100%; height: 100%; display: block; image-rendering: pixelated; }
  .txt { min-width: 0; flex: 1; display: flex; flex-direction: column; color: #1c1e21; }
  .prop { font-size: 2.6mm; font-weight: 600; color: #34373b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .id { font-family: Oswald, "Arial Narrow", "Roboto Condensed", Impact, sans-serif; font-weight: 700; font-size: 10mm; line-height: 1.02; letter-spacing: 0.1mm; margin-top: 0.6mm; white-space: nowrap; }
  .num { font-size: 2.6mm; font-weight: 600; color: #3a3d42; margin-top: 0.3mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .num b { font-weight: 700; color: #1c1e21; letter-spacing: 0.08mm; }
  .name { font-size: 3.2mm; font-weight: 700; margin-top: 0.9mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .note { font-size: 2.15mm; color: #555a60; margin-top: 0.5mm; white-space: nowrap; }
  .hint { font: 12px Inter, Arial, sans-serif; color: #666; }
  @media print { .hint { display: none; } body { padding: 0; } }
</style></head>
<body>
  <div class="label">
    <span class="rivet l"></span><span class="rivet r"></span>
    <div class="qr"><img id="qr" src="${qr}" alt="QR code"></div>
    <div class="txt">
      <div class="prop">Property of ${esc(asset.property_name || 'Asset Registry System')}</div>
      <div class="id">${esc(asset.asset_code)}</div>
      ${asset.asset_number ? `<div class="num">Asset No. <b>${esc(asset.asset_number)}</b></div>` : ''}
      <div class="name" title="${esc(name)}">${esc(name)}</div>
      <div class="note">Scan to look up. Do not remove.</div>
    </div>
  </div>
  <div class="hint">Actual size 90 × 36 mm.</div>
  ${autoPrint ? `<script>
    (function () {
      var done = false, go = function () { if (!done) { done = true; setTimeout(function () { window.print() }, 150) } };
      var img = document.getElementById('qr');
      var ready = function () { (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go) };
      if (img.complete) ready(); else { img.onload = ready; img.onerror = ready; }
      setTimeout(go, 4000);   // print anyway if the QR image or fonts are slow
    })();
  </script>` : ''}
</body></html>`
}

// Opens the label in a new window and prints it
export function printAssetQr(asset) {
  const w = window.open('', '_blank', 'width=560,height=420')
  if (!w) return
  w.document.write(labelHtml(asset))
  w.document.close()
}
