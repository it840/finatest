import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const TABLES = [
  'categories', 'sub_categories', 'locations', 'departments', 'statuses',
  'conditions', 'acquisition_types', 'disposal_reasons', 'movement_types', 'movement_reasons', 'assignees'
]

export function useLookups() {
  const [lookups, setLookups] = useState(null)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    setLoading(true)
    const results = await Promise.all(TABLES.map(t => supabase.from(t).select('*').order('name')))
    const next = {}
    TABLES.forEach((t, i) => { next[t] = results[i].data || [] })
    setLookups(next)
    setLoading(false)
  }

  useEffect(() => { reload() }, [])

  return { lookups, loading, reload }
}
