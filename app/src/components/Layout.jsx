import React from 'react'
import PropertySwitcher from './PropertySwitcher'
import { DashboardIcon, AssetsIcon, PhysicalIcon, MovementIcon, ReportsIcon, LogHistoryIcon, SettingsIcon } from './NavIcons'

const NAV = [
  { key: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { key: 'assets', label: 'Asset Database', Icon: AssetsIcon },
  { key: 'physical', label: 'Physical Inventory', Icon: PhysicalIcon },
  { key: 'movement', label: 'Movement Log', Icon: MovementIcon },
  { key: 'reports', label: 'Reports', Icon: ReportsIcon },
  { key: 'log', label: 'Log History', Icon: LogHistoryIcon, managerUp: true },
  { key: 'settings', label: 'Settings', Icon: SettingsIcon },
]

export default function Layout({ page, setPage, profile, onSignOut, children }) {
  const canSeeLog = profile?.role === 'admin' || profile?.role === 'manager'
  return (
    <div className="h-screen flex bg-paper text-ink font-body overflow-hidden">
      <aside className="w-60 shrink-0 bg-ink text-paper flex flex-col h-full overflow-y-auto">
        <div className="px-5 py-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <img src={`${import.meta.env.BASE_URL}virgin-logo.png`} alt="Virgin Beach Resort" className="h-9 w-9 rounded-full bg-white object-contain p-1" />
            <img src={`${import.meta.env.BASE_URL}zhostel-logo.png`} alt="Z Hostel" className="h-9 w-9 rounded-full object-contain" />
          </div>
          <div className="font-display text-xl leading-tight">Asset Registry<br/>System</div>
        </div>
        <div className="px-5 py-3 border-b border-white/10">
          <PropertySwitcher />
        </div>
        <nav className="flex-1 py-4">
          {NAV.filter(n => !n.managerUp || canSeeLog).map(n => (
            <button
              key={n.key}
              onClick={() => setPage(n.key)}
              className={`w-full flex items-center gap-3 text-left px-5 py-2.5 text-sm transition-colors border-l-2 ${
                page === n.key
                  ? 'border-gold bg-white/5 text-white'
                  : 'border-transparent text-paper/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <n.Icon />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-white/10 text-xs text-paper/60">
          <div className="text-paper/90">{profile?.full_name}</div>
          <div className="capitalize mb-3">{profile?.role}</div>
          <button onClick={onSignOut} className="underline hover:text-white">Sign out</button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
