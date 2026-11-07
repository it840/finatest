import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuthContext } from './AuthContext'

const Ctx = createContext(null)
const STORAGE_KEY = 'ars_current_property_id'

function savedSelection() {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'all' ? 'all' : saved ? Number(saved) : 'all'
}

export function PropertyProvider({ children }) {
  const { session, profile } = useAuthContext()
  const userId = session?.user?.id || null
  const [properties, setProperties] = useState([])
  const [currentPropertyId, setCurrentPropertyId] = useState(savedSelection)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('properties').select('*').order('name')
    setProperties(data || [])
    setLoading(false)
  }, [])

  // This provider sits above the login screen, so it first runs before anyone is signed in - when the
  // database (correctly) returns no properties. Reload whenever the signed-in user changes, so the list is
  // there right after signing in without a page refresh; clear it on sign-out.
  useEffect(() => {
    if (userId) {
      setCurrentPropertyId(savedSelection()) // don't carry the previous user's selection over
      load()
    } else {
      setProperties([])
      setLoading(false)
    }
  }, [load, userId])

  // Staff and managers with a property assigned to their account are locked
  // to that property — they never see or choose among other properties.
  // Admins, and anyone without a property assignment, keep full access.
  const isLocked = !!profile && profile.role !== 'admin' && profile.property_id != null

  useEffect(() => {
    if (isLocked) setCurrentPropertyId(profile.property_id)
  }, [isLocked, profile?.property_id])

  const selectProperty = (id) => {
    if (isLocked) return // locked accounts can't switch
    setCurrentPropertyId(id)
    localStorage.setItem(STORAGE_KEY, String(id))
  }

  const currentProperty = properties.find(p => p.id === currentPropertyId) || null

  return (
    <Ctx.Provider value={{ properties, currentPropertyId, currentProperty, selectProperty, loading, reload: load, isLocked }}>
      {children}
    </Ctx.Provider>
  )
}

export function useProperty() {
  return useContext(Ctx)
}
