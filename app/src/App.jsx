import React, { useState } from 'react'
import { useAuthContext } from './lib/AuthContext'
import Login from './components/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import PhysicalInventory from './pages/PhysicalInventory'
import MovementLog from './pages/MovementLog'
import Reports from './pages/Reports'
import LogHistory from './pages/LogHistory'
import Settings from './pages/Settings'

export default function App() {
  const { session, profile, loading, signOut, refreshProfile } = useAuthContext()
  const [page, setPage] = useState('dashboard')

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm bg-paper">Loading…</div>
  }

  if (!session) return <Login />

  if (session && !profile) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm bg-paper">Setting up your account…</div>
  }

  return (
    <Layout page={page} setPage={setPage} profile={profile} onSignOut={signOut}>
      {page === 'dashboard' && <Dashboard setPage={setPage} profile={profile} />}
      {page === 'assets' && <Assets profile={profile} />}
      {page === 'physical' && <PhysicalInventory profile={profile} />}
      {page === 'movement' && <MovementLog profile={profile} />}
      {page === 'reports' && <Reports />}
      {page === 'log' && (profile?.role === 'admin' || profile?.role === 'manager') && <LogHistory />}
      {page === 'settings' && <Settings profile={profile} onProfileChange={refreshProfile} />}
    </Layout>
  )
}
