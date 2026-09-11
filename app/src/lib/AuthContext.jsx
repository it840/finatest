import React, { createContext, useContext } from 'react'
import { useAuth } from './useAuth'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const auth = useAuth()
  return <Ctx.Provider value={auth}>{children}</Ctx.Provider>
}

export function useAuthContext() {
  return useContext(Ctx)
}
