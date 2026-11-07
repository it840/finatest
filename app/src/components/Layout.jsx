import React, { useState, useEffect, useRef } from 'react'
import PropertySwitcher from './PropertySwitcher'
import SignOutDialog from './SignOutDialog'
import { useSidebarBadges } from '../lib/useSidebarBadges'
import { DashboardIcon, AssetsIcon, PhysicalIcon, MovementIcon, ReportsIcon, LogHistoryIcon, SettingsIcon, PurchaseIcon, DisposalIcon, MaintenanceIcon, TransferIcon } from './NavIcons'

const NAV = {
  dashboard: { label: 'Dashboard', Icon: DashboardIcon },
  purchase: { label: 'Purchase Log', Icon: PurchaseIcon },
  physical: { label: 'Physical Inventory', Icon: PhysicalIcon },
  movement: { label: 'Movement Log', Icon: MovementIcon },
  transfers: { label: 'Asset Transfer', Icon: TransferIcon },
  disposal: { label: 'Disposal Log', Icon: DisposalIcon },
  assets: { label: 'Asset Database', Icon: AssetsIcon },
  maintenance: { label: 'Maintenance (PMS)', Icon: MaintenanceIcon },
  reports: { label: 'Reports', Icon: ReportsIcon },
  log: { label: 'Log History', Icon: LogHistoryIcon, managerUp: true },
  settings: { label: 'Settings', Icon: SettingsIcon },
}

const GROUPS = [
  { title: 'Overview', items: ['dashboard'] },
  { title: 'Operations', items: ['purchase', 'physical', 'movement', 'transfers', 'disposal', 'maintenance'] },
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
  // phones: the sidebar becomes a slide-out drawer opened from a top bar
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const [drawerOpen, setDrawerOpen] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const on = () => { setIsMobile(mq.matches); if (!mq.matches) setDrawerOpen(false) }
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  useEffect(() => {
    if (!drawerOpen) return
    const k = (e) => { if (e.key === 'Escape') setDrawerOpen(false) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [drawerOpen])
  const go = (k) => { setPage(k); setDrawerOpen(false) }
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
    transfers: { count: badges.transfers, tone: 'amber', hint: 'transfers waiting to be received' },
  }

  const rail = collapsed && !isMobile

  return (
    <div className="h-screen flex bg-paper text-ink font-body overflow-hidden">
      {drawerOpen && <div className="fixed inset-0 z-30 bg-ink/40 md:hidden" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}
      <aside className={`fixed md:relative inset-y-0 left-0 z-40 md:z-20 shrink-0 h-full flex flex-col bg-theme-bg border-r border-theme-line text-theme-text
                         transition-[width,transform] duration-200 ${rail ? 'w-[72px]' : 'w-64'} ${drawerOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        aria-label="Sidebar">
        <div className={rail ? 'px-3 pt-5 pb-3 flex justify-center' : 'px-5 pt-5 pb-3'}>
          {rail ? (
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
          <PropertySwitcher collapsed={rail} />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-2" aria-label="Main">
          {GROUPS.map(group => {
            const keys = group.items.filter(k => !NAV[k].managerUp || canSeeLog)
            if (keys.length === 0) return null
            return (
              <div key={group.title}>
                {rail
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
                      onClick={() => go(k)}
                      title={show ? `${n.label} — ${b.count} ${b.hint}` : n.label}
                      aria-current={active ? 'page' : undefined}
                      className={`relative w-full flex items-center gap-3 rounded-lg py-2.5 my-0.5 text-[15px] text-left transition-colors ${rail ? 'justify-center px-0' : 'px-3'} ${
                        active ? 'bg-theme-active text-theme-text font-medium' : 'text-theme-text hover:bg-theme-hover'
                      }`}
                    >
                      <span className={`[&_svg]:w-5 [&_svg]:h-5 flex-shrink-0 ${active ? 'text-theme-accent' : 'text-theme-muted'}`}><n.Icon /></span>
                      {!rail && <span className="flex-1 truncate">{n.label}</span>}
                      {show && !rail && (
                        <span className={`text-xs font-medium rounded-full px-2 border ${b.tone === 'red' ? 'bg-[#FCEBEB] text-[#791F1F] border-[#E24B4A]' : 'bg-[#FAEEDA] text-[#633806] border-[#EF9F27]'}`}>
                          {b.count > 99 ? '99+' : b.count}
                        </span>
                      )}
                      {show && rail && (
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
            style={isMobile ? { display: 'none' } : undefined}
            title={rail ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-full flex items-center gap-3 rounded-lg py-2 mb-1 text-sm text-theme-muted hover:bg-theme-hover hover:text-theme-text transition-colors ${rail ? 'justify-center px-0' : 'px-3'}`}
          >
            <CollapseIcon collapsed={collapsed} />
            {!rail && <span>Collapse sidebar</span>}
          </button>

          <div className="relative" ref={menuRef}>
            {menuOpen && (
              <div className={`absolute z-30 w-56 bg-surface border border-hairline rounded-lg shadow-lg p-1 ${rail ? 'left-full bottom-0 ml-2' : 'left-0 bottom-full mb-2'}`}>
                <button onClick={() => { setMenuOpen(false); go('settings') }} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink hover:bg-theme-hover text-left">
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
              title={rail ? `${profile?.full_name || 'Profile'} — ${profile?.role || ''}` : undefined}
              className={`w-full flex items-center gap-3 rounded-lg py-2 hover:bg-theme-hover transition-colors text-left ${rail ? 'justify-center px-0' : 'px-2'}`}
            >
              <span className="h-9 w-9 rounded-full bg-theme-accent text-white flex items-center justify-center text-xs font-medium flex-shrink-0">{initials(profile?.full_name)}</span>
              {!rail && (
                <span className="flex-1 min-w-0 leading-tight">
                  <span className="block text-sm font-medium truncate">{profile?.full_name}</span>
                  <span className="block text-xs text-theme-muted capitalize">{profile?.role}</span>
                </span>
              )}
              {!rail && (
                <svg className="w-4 h-4 text-theme-muted flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12l4-4 4 4" /></svg>
              )}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 h-full overflow-y-auto">
        <div className="md:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-theme-bg border-b border-theme-line no-print">
          <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" aria-expanded={drawerOpen}
            className="h-9 w-9 -ml-1 flex items-center justify-center rounded-lg hover:bg-theme-hover text-theme-text">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3.5 6h13M3.5 10h13M3.5 14h13" /></svg>
          </button>
          <img src={`${import.meta.env.BASE_URL}virgin-logo.png`} alt="" className="h-7 w-7 rounded-full bg-white object-contain p-0.5 border border-theme-line" />
          <span className="font-display text-base text-theme-text truncate">{NAV[page]?.label || 'Asset Registry System'}</span>
        </div>
        <div className="app-enter max-w-6xl mx-auto px-4 py-5 md:px-8 md:py-8">
          {children}
        </div>
      </main>

      {confirmingSignOut && (
        <SignOutDialog
          onCancel={() => setConfirmingSignOut(false)}
          onConfirm={() => { setConfirmingSignOut(false); onSignOut() }}
        />
      )}
    </div>
  )
}
