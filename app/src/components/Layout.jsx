import React, { useState, useEffect, useRef } from 'react'
import PropertySwitcher from './PropertySwitcher'
import { useSidebarBadges } from '../lib/useSidebarBadges'
import { DashboardIcon, AssetsIcon, PhysicalIcon, MovementIcon, ReportsIcon, LogHistoryIcon, SettingsIcon, PurchaseIcon, DisposalIcon, MaintenanceIcon } from './NavIcons'

const NAV = {
  dashboard: { label: 'Dashboard', Icon: DashboardIcon },
  purchase: { label: 'Purchase Log', Icon: PurchaseIcon },
  physical: { label: 'Physical Inventory', Icon: PhysicalIcon },
  movement: { label: 'Movement Log', Icon: MovementIcon },
  disposal: { label: 'Disposal Log', Icon: DisposalIcon },
  assets: { label: 'Asset Database', Icon: AssetsIcon },
  maintenance: { label: 'Maintenance (PMS)', Icon: MaintenanceIcon },
  reports: { label: 'Reports', Icon: ReportsIcon },
  log: { label: 'Log History', Icon: LogHistoryIcon, managerUp: true },
  settings: { label: 'Settings', Icon: SettingsIcon },
}

const GROUPS = [
  { title: 'Overview', items: ['dashboard'] },
  { title: 'Operations', items: ['purchase', 'physical', 'movement', 'disposal', 'maintenance'] },
  { title: 'Records', items: ['assets', 'reports', 'log'] },
  { title: 'Admin', items: ['settings'] },
]

const COLLAPSE_KEY = 'ars_sidebar_collapsed'

function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="6.5" r="3" /><path d="M3.5 17c1-3.2 3.7-5 6.5-5s5.5 1.8 6.5 5" />
    </svg>
  )
}
function SignOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3.5H5a1.5 1.5 0 00-1.5 1.5v10A1.5 1.5 0 005 16.5h3" /><path d="M12.5 6.5L16 10l-3.5 3.5M16 10H8" />
    </svg>
  )
}
function CollapseIcon({ collapsed }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}>
      <path d="M11.5 5.5L7 10l4.5 4.5" /><path d="M16 4v12" />
    </svg>
  )
}

export default function Layout({ page, setPage, profile, onSignOut, children }) {
  const canSeeLog = profile?.role === 'admin' || profile?.role === 'manager'
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const badges = useSidebarBadges(page)

  const toggleCollapsed = () => {
    setCollapsed(c => {
      localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1')
      return !c
    })
    setMenuOpen(false)
  }

  useEffect(() => {
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const badgeFor = {
    physical: { count: badges.physical, tone: 'red', hint: 'count discrepancies in the last 30 days' },
    maintenance: { count: badges.maintenance, tone: 'amber', hint: 'overdue maintenance entries' },
  }

  return (
    <div className="h-screen flex bg-paper text-ink font-body overflow-hidden">
      <aside className={`relative z-20 shrink-0 h-full flex flex-col bg-theme-bg border-r border-theme-line text-theme-text transition-[width] duration-200 ${collapsed ? 'w-[72px]' : 'w-64'}`}>
        <div className={collapsed ? 'px-3 pt-5 pb-3 flex justify-center' : 'px-5 pt-5 pb-3'}>
          {collapsed ? (
            <img src={`${import.meta.env.BASE_URL}virgin-logo.png`} alt="Asset Registry System" className="h-9 w-9 rounded-full bg-white object-contain p-1 border border-theme-line" />
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <img src={`${import.meta.env.BASE_URL}virgin-logo.png`} alt="Virgin Beach Resort" className="h-9 w-9 rounded-full bg-white object-contain p-1 border border-theme-line" />
                <img src={`${import.meta.env.BASE_URL}zhostel-logo.png`} alt="Z Hostel" className="h-9 w-9 rounded-full object-contain" />
              </div>
              <div className="font-display text-xl leading-tight">Asset Registry<br />System</div>
            </>
          )}
        </div>

        <div className="px-3 pb-3">
          <PropertySwitcher collapsed={collapsed} />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-2" aria-label="Main">
          {GROUPS.map(group => {
            const keys = group.items.filter(k => !NAV[k].managerUp || canSeeLog)
            if (keys.length === 0) return null
            return (
              <div key={group.title}>
                {collapsed
                  ? <div className="mx-2 mt-3 mb-2 border-t border-theme-line" />
                  : <div className="px-3 pt-4 pb-1.5 text-xs font-medium text-theme-muted">{group.title}</div>}
                {keys.map(k => {
                  const n = NAV[k]
                  const active = page === k
                  const b = badgeFor[k]
                  const show = b && b.count > 0
                  return (
                    <button
                      key={k}
                      onClick={() => setPage(k)}
                      title={show ? `${n.label} — ${b.count} ${b.hint}` : n.label}
                      aria-current={active ? 'page' : undefined}
                      className={`relative w-full flex items-center gap-3 rounded-lg py-2.5 my-0.5 text-[15px] transition-colors ${collapsed ? 'justify-center px-0' : 'px-3'} ${
                        active ? 'bg-theme-active text-theme-text font-medium' : 'text-theme-text hover:bg-theme-hover'
                      }`}
                    >
                      <span className={`[&_svg]:w-5 [&_svg]:h-5 flex-shrink-0 ${active ? 'text-theme-accent' : 'text-theme-muted'}`}><n.Icon /></span>
                      {!collapsed && <span className="flex-1 truncate">{n.label}</span>}
                      {show && !collapsed && (
                        <span className={`text-xs font-medium rounded-full px-2 border ${b.tone === 'red' ? 'bg-[#FCEBEB] text-[#791F1F] border-[#E24B4A]' : 'bg-[#FAEEDA] text-[#633806] border-[#EF9F27]'}`}>
                          {b.count > 99 ? '99+' : b.count}
                        </span>
                      )}
                      {show && collapsed && (
                        <span className={`absolute top-1.5 right-3 h-2.5 w-2.5 rounded-full border-2 border-theme-bg ${b.tone === 'red' ? 'bg-[#E24B4A]' : 'bg-[#BA7517]'}`} />
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        <div className="px-3 pt-2 pb-3 border-t border-theme-line">
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-full flex items-center gap-3 rounded-lg py-2 mb-1 text-sm text-theme-muted hover:bg-theme-hover hover:text-theme-text transition-colors ${collapsed ? 'justify-center px-0' : 'px-3'}`}
          >
            <CollapseIcon collapsed={collapsed} />
            {!collapsed && <span>Collapse sidebar</span>}
          </button>

          <div className="relative" ref={menuRef}>
            {menuOpen && (
              <div className={`absolute z-30 w-56 bg-surface border border-hairline rounded-lg shadow-lg p-1 ${collapsed ? 'left-full bottom-0 ml-2' : 'left-0 bottom-full mb-2'}`}>
                <button onClick={() => { setMenuOpen(false); setPage('settings') }} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink hover:bg-theme-hover text-left">
                  <UserIcon /> My account
                </button>
                <button onClick={() => { setMenuOpen(false); setConfirmingSignOut(true) }} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink hover:bg-theme-hover text-left">
                  <SignOutIcon /> Sign out
                </button>
              </div>
            )}
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title={collapsed ? `${profile?.full_name || 'Profile'} — ${profile?.role || ''}` : undefined}
              className={`w-full flex items-center gap-3 rounded-lg py-2 hover:bg-theme-hover transition-colors text-left ${collapsed ? 'justify-center px-0' : 'px-2'}`}
            >
              <span className="h-9 w-9 rounded-full bg-theme-accent text-white flex items-center justify-center text-xs font-medium flex-shrink-0">{initials(profile?.full_name)}</span>
              {!collapsed && (
                <span className="flex-1 min-w-0 leading-tight">
                  <span className="block text-sm font-medium truncate">{profile?.full_name}</span>
                  <span className="block text-xs text-theme-muted capitalize">{profile?.role}</span>
                </span>
              )}
              {!collapsed && (
                <svg className="w-4 h-4 text-theme-muted flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12l4-4 4 4" /></svg>
              )}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>

      {confirmingSignOut && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-sm p-6">
            <h2 className="font-display text-lg mb-2">Sign out?</h2>
            <p className="text-sm text-muted mb-6">
              You'll need to sign in again to access the Asset Registry System.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmingSignOut(false)} className="px-4 py-2 text-sm text-muted hover:text-ink">
                Cancel
              </button>
              <button
                onClick={() => { setConfirmingSignOut(false); onSignOut() }}
                className="px-4 py-2 text-sm bg-danger text-paper rounded hover:bg-danger/90"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
