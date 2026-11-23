import React, { useEffect, useState } from 'react'
import { openWithFilter } from './lib/navFilter'

// A scanned asset QR opens the app at  …/?asset=Asset-001 . Remember the asset (through the sign-in if needed),
// tidy the address bar, and open that asset once the user is signed in.
const OPEN_KEY = 'ars_open_asset'
try {
  const u = new URL(window.location.href)
  const code = u.searchParams.get('asset')
  if (code) {
    sessionStorage.setItem(OPEN_KEY, code)
    u.searchParams.delete('asset')
    window.history.replaceState(null, '', u.pathname + u.search + u.hash)
  }
} catch { /* ignore */ }
import { useAuthContext } from './lib/AuthContext'
import Login from './components/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import PhysicalInventory from './pages/PhysicalInventory'
import MovementLog from './pages/MovementLog'
import Transfers from './pages/Transfers'
import PurchaseLog from './pages/PurchaseLog'
import DisposalLog from './pages/DisposalLog'
import MaintenanceLog from './pages/MaintenanceLog'
import Reports from './pages/Reports'
import LogHistory from './pages/LogHistory'
import Settings from './pages/Settings'

export default function App() {
  const { session, profile, loading, signOut, refreshProfile } = useAuthContext()
  const [page, setPage] = useState('dashboard')
  const [holdLogin, setHoldLogin] = useState(false) // true while the login's sign-in sweep is playing
  useEffect(() => {
    if (!session || !profile || holdLogin) return
    let code = null
    try { code = sessionStorage.getItem(OPEN_KEY); sessionStorage.removeItem(OPEN_KEY) } catch { /* ignore */ }
    if (code) openWithFilter(setPage, 'assets', { query: code, open: code })
  }, [session, profile, holdLogin])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm bg-paper">Loading…</div>
  }

  if (!session || holdLogin) {
    return <Login onSigningIn={() => setHoldLogin(true)} onSignedIn={() => setHoldLogin(false)} onFailed={() => setHoldLogin(false)} />
  }

  if (session && !profile) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm bg-paper">Setting up your account…</div>
  }

  return (
    <Layout page={page} setPage={setPage} profile={profile} onSignOut={signOut}>
      {page === 'dashboard' && <Dashboard setPage={setPage} profile={profile} />}
      {page === 'assets' && <Assets profile={profile} />}
      {page === 'physical' && <PhysicalInventory profile={profile} />}
      {page === 'movement' && <MovementLog profile={profile} />}
      {page === 'transfers' && <Transfers profile={profile} />}
      {page === 'purchase' && <PurchaseLog profile={profile} />}
      {page === 'disposal' && <DisposalLog profile={profile} />}
      {page === 'maintenance' && <MaintenanceLog profile={profile} />}
      {page === 'reports' && <Reports />}
      {page === 'log' && (profile?.role === 'admin' || profile?.role === 'manager') && <LogHistory />}
      {page === 'settings' && <Settings profile={profile} onProfileChange={refreshProfile} />}
    </Layout>
  )
}
