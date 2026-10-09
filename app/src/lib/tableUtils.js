export function num(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
}
export function peso2(n) {
  return '₱' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
export function peso0(n) {
  return n === null || n === undefined ? '' : '₱' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

// True when the typed text appears in ANY of the given column values.
// Numbers are matched both raw and with thousands separators (15129 / 15,129).
export function matchesQuery(query, values) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return true
  return values
    .filter(v => v !== null && v !== undefined && v !== '')
    .some(v => {
      const raw = String(v).toLowerCase()
      if (raw.includes(q)) return true
      const n = Number(v)
      return typeof v !== 'object' && !Number.isNaN(n) && n.toLocaleString(undefined, { maximumFractionDigits: 2 }).toLowerCase().includes(q)
    })
}
