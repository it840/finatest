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

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// Opens a print-ready window with just the QR code and the Asset ID
export function printAssetQr(asset) {
  const url = buildQrUrl(asset)
  const w = window.open('', '_blank', 'width=420,height=520')
  if (!w) return
  w.document.write(`
    <html><head><title>${esc(asset.asset_code)}</title></head>
    <body style="text-align:center;font-family:sans-serif;padding:24px;">
      <img src="${url}" style="width:300px;height:300px;" onload="window.print()" />
      <div style="margin-top:12px;font-size:14px;letter-spacing:1px;">${esc(asset.asset_code)}</div>
    </body></html>
  `)
  w.document.close()
}
