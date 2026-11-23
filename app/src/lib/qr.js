// Pulls the Asset ID out of a scanned asset QR code (the QR holds a text summary with an "Asset ID:" line).
// A plain code such as "Asset-007" typed by hand works too.
export function parseAssetCode(text) {
  const t = String(text || '').trim()
  const link = t.match(/[?&]asset=([^&#\s]+)/i)            // new labels: a link that opens the asset
  if (link) return decodeURIComponent(link[1])
  const m = t.match(/Asset ID:\s*([^\s]+)/i)              // older labels: a text summary
  return m ? m[1] : t.split(/\s+/)[0] || ''
}
