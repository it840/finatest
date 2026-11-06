// Pulls the Asset ID out of a scanned asset QR code (the QR holds a text summary with an "Asset ID:" line).
// A plain code such as "Asset-007" typed by hand works too.
export function parseAssetCode(text) {
  const t = String(text || '').trim()
  const m = t.match(/Asset ID:\s*([^\s]+)/i)
  return m ? m[1] : t.split(/\s+/)[0] || ''
}
