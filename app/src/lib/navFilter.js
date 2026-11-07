// Lets one page open another with a filter already applied (e.g. Dashboard -> PMS showing only Overdue).
const KEY = 'ars_nav_filter'
export function openWithFilter(setPage, page, filter) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ page, filter })) } catch { /* storage unavailable */ }
  setPage(page)
}
export function takeNavFilter(page) {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    if (v.page !== page) return null
    sessionStorage.removeItem(KEY)
    return v.filter || null
  } catch { return null }
}
