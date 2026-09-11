import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

const Ctx = createContext(null)
const STORAGE_KEY = 'ars_current_property_id'

export function PropertyProvider({ children }) {
  const [properties, setProperties] = useState([])
  const [currentPropertyId, setCurrentPropertyId] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'all' ? 'all' : saved ? Number(saved) : 'all'
  })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('properties').select('*').order('name')
    setProperties(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const selectProperty = (id) => {
    setCurrentPropertyId(id)
    localStorage.setItem(STORAGE_KEY, String(id))
  }

  const currentProperty = properties.find(p => p.id === currentPropertyId) || null

  return (
    <Ctx.Provider value={{ properties, currentPropertyId, currentProperty, selectProperty, loading, reload: load }}>
      {children}
    </Ctx.Provider>
  )
}

export function useProperty() {
  return useContext(Ctx)
}
