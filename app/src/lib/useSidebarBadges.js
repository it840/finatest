import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useProperty } from './PropertyContext'

// Live counters for the sidebar. Follows the selected property and refreshes
// whenever refreshKey changes (the Layout passes the current page).
export function useSidebarBadges(refreshKey) {
  const { currentPropertyId } = useProperty()
  const [badges, setBadges] = useState({ maintenance: 0, physical: 0 })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
      let pms = supabase.from('maintenance_log_computed').select('id', { count: 'exact', head: true }).eq('pms_status', 'OVERDUE')
      let counts = supabase.from('physical_inventory_computed').select('id', { count: 'exact', head: true })
        .neq('discrepancy', 'No Discrepancy').gte('inventory_date', since)
      if (currentPropertyId !== 'all') {
        pms = pms.eq('property_id', currentPropertyId)
        counts = counts.eq('property_id', currentPropertyId)
      }
      const [a, b] = await Promise.all([pms, counts])
      if (!cancelled) setBadges({ maintenance: a.count || 0, physical: b.count || 0 })
    })()
    return () => { cancelled = true }
  }, [currentPropertyId, refreshKey])

  return badges
}
