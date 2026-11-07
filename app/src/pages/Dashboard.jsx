import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProperty } from '../lib/PropertyContext'
import { openWithFilter } from '../lib/navFilter'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const PALETTE = ['#3A3733', '#B8902E', '#3E6B8A', '#A83B32', '#9D9890', '#8A6D9E', '#3E6B8A', '#C77E3A']

function peso(n) {
  if (n === null || n === undefined) return '—'
  return '₱' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}
function todayISO() { return iso(new Date()) }
function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000) }
function startOfWeek(d) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

const icon = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }

const ICONS = {
  transfer: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><path d="M2.5 5.5h8v8h-8z" /><path d="M10.5 8.5H14l2.5 2.5v2.5h-6" /><circle cx="6" cy="15" r="1.5" /><circle cx="13.5" cy="15" r="1.5" /></svg>),
  book: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><path d="M3 15.5l4-4.5 3 2.5 6-7" /><path d="M12.5 6.5H16V10" /></svg>),
  eol: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><circle cx="10" cy="10.5" r="6.5" /><path d="M10 7v3.7l2.4 1.6M8 2.5h4" /></svg>),
  count: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><rect x="4" y="3.5" width="12" height="14" rx="1.5" /><path d="M7 10.5l1.8 1.8L13 8.3" /></svg>),
  purchase: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><rect x="3" y="6" width="14" height="10" rx="1.5" /><path d="M3 9h14M7 13h2" /></svg>),
  disposed: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><path d="M4.5 6h11l-.8 10.2a1.5 1.5 0 01-1.5 1.3H6.8a1.5 1.5 0 01-1.5-1.3L4.5 6z" /><path d="M7.5 3.5h5a1 1 0 011 1V6h-7V4.5a1 1 0 011-1z" /><path d="M8.3 9v5M11.7 9v5" /></svg>),
  ending: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><path d="M4 5.5h9M4 10h12M4 14.5h6" /></svg>),
  assets: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><path d="M10 2.5l7 3.75v7.5L10 17.5l-7-3.75v-7.5L10 2.5z" /><path d="M3 6.25L10 10l7-3.75M10 10v7.5" /></svg>),
  operational: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><circle cx="10" cy="10" r="7.2" /><path d="M7 10.2l2 2 4-4.4" /></svg>),
  maintenance: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><path d="M13.2 3.8a3 3 0 00-4 3.6L3.8 13a1.6 1.6 0 002.3 2.3l5.6-5.4a3 3 0 003.6-4l-2 2-1.7-.5-.5-1.7 2.1-2.1z" /></svg>),
  damaged: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><path d="M10 2.5l7.5 13.5H2.5L10 2.5z" /><path d="M10 8v3.2M10 14v.1" /></svg>),
  deployed: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><path d="M3 6.5h11.5M14.5 6.5L11.5 3.5M14.5 6.5l-3 3" /><path d="M17 13.5H5.5M5.5 13.5l3-3M5.5 13.5l3 3" /></svg>),
  standby: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><rect x="3" y="4" width="14" height="9" rx="1.5" /><path d="M7 17h6M10 13v4" /></svg>),
  warranty: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><path d="M10 2.5l6 2.2v4.6c0 4-2.5 6.6-6 8-3.5-1.4-6-4-6-8V4.7L10 2.5z" /></svg>),
  due: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><circle cx="10" cy="10.5" r="7" /><path d="M10 6.5v4l2.8 1.6" /></svg>),
  plus: (<svg width="15" height="15" viewBox="0 0 20 20" {...icon}><path d="M10 4v12M4 10h12" /></svg>),
  swap: (<svg width="15" height="15" viewBox="0 0 20 20" {...icon}><path d="M3 6.5h11.5M14.5 6.5L11.5 3.5M14.5 6.5l-3 3" /><path d="M17 13.5H5.5M5.5 13.5l3-3M5.5 13.5l3 3" /></svg>),
  check: (<svg width="15" height="15" viewBox="0 0 20 20" {...icon}><rect x="4" y="3.5" width="12" height="14" rx="1.5" /><path d="M7 10.5l1.8 1.8L13 8.3" /></svg>),
}

function Stat({ label, value, sub, tone, iconKey, onClick, hint }) {
  const inner = (
    <>
      <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${tone ? tone.bg : 'bg-theme-bg'} ${tone ? tone.text : 'text-theme-muted'}`}>
        {ICONS[iconKey]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted truncate">{label}</div>
        <div className={`font-display text-xl mt-0.5 ${tone ? tone.text : 'text-ink'}`}>{value}</div>
        {sub && <div className="text-xs text-muted mt-0.5 truncate">{sub}</div>}
      </div>
      {onClick && <span className="text-muted group-hover:text-ink transition-colors self-center" aria-hidden="true">›</span>}
    </>
  )
  const cls = 'border border-hairline bg-surface rounded-lg px-5 py-4 flex gap-3 text-left w-full'
  return onClick
    ? <button type="button" onClick={onClick} title={hint || `Show ${label.toLowerCase()}`} className={`${cls} group hover:border-theme-accent/40 hover:shadow-sm transition-all`}>{inner}</button>
    : <div className={cls}>{inner}</div>
}

const TONE = {
  success: { bg: 'bg-success/10', text: 'text-success' },
  gold: { bg: 'bg-gold/10', text: 'text-gold' },
  danger: { bg: 'bg-danger/10', text: 'text-danger' },
}

function Panel({ title, action, children }) {
  return (
    <div className="border border-hairline bg-surface rounded-lg p-5 shadow-[0_1px_2px_rgba(20,43,39,0.03)]">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="font-display text-base">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function EmptyRow({ children }) {
  return <div className="text-xs text-muted py-4 text-center">{children}</div>
}

// List behind a clickable card
function DrillModal({ drill, onClose, onOpenPage }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  const list = drill.rows.slice(0, 300)
  return (
    <div className="fixed inset-0 bg-ink/40 flex items-start justify-center overflow-y-auto py-10 z-50 px-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-4xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 py-5 border-b border-hairline">
          <div>
            <h2 className="font-display text-xl">{drill.title}</h2>
            <div className="text-xs text-muted mt-0.5">{drill.rows.length} {drill.rows.length === 1 ? 'asset' : 'assets'}{drill.note ? ` · ${drill.note}` : ''}</div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-4">
          {list.length === 0 ? <EmptyRow>Nothing here.</EmptyRow> : (
            <div className="overflow-x-auto border border-hairline rounded max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-theme-active text-theme-text text-xs uppercase tracking-wide sticky top-0">
                  <tr>{['Asset ID', 'Name', 'Property', 'Category', 'Status', 'Condition', 'Location', drill.extraLabel || 'On hand'].map(h => <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {list.map(r => (
                    <tr key={r.id} className="border-t border-hairline">
                      <td className="px-3 py-2 whitespace-nowrap font-medium">{r.asset_code}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.asset_name}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted">{r.property_name}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.category}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.status}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.condition}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.actual_location || r.location}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{drill.extra ? drill.extra(r) : Number(r.registered_qty || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-hairline rounded hover:bg-hairline/20">Close</button>
          <button onClick={() => onOpenPage(drill.page || 'assets')} className="px-4 py-2 text-sm bg-theme-accent text-white rounded hover:bg-theme-accent/90">
            Open {drill.pageLabel || 'Asset Database'}
          </button>
        </div>
      </div>
    </div>
  )
}

const REFRESH_MS = 5 * 60 * 1000
const OPEN_PMS = ['SCHEDULED', 'DUE', 'OVERDUE', 'IN PROGRESS']

export default function Dashboard({ setPage, profile }) {
  const { currentPropertyId, currentProperty, properties } = useProperty()
  const [rows, setRows] = useState([])
  const [activity, setActivity] = useState([])
  const [pmsLog, setPmsLog] = useState([])
  const [transfers, setTransfers] = useState([])
  const [counts, setCounts] = useState([])
  const [purchases, setPurchases] = useState([])
  const [disposals, setDisposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [months, setMonths] = useState(6)
  const [drill, setDrill] = useState(null)

  const load = useCallback(async () => {
    setRefreshing(true)
    const [a, log, pms, tr, pi, pl, dl] = await Promise.all([
      supabase.from('assets_computed').select('*'),
      supabase.from('activity_log_computed').select('*').order('created_at', { ascending: false }).limit(6),
      supabase.from('maintenance_log_computed').select('*'),
      supabase.from('asset_transfers_computed').select('id, status, sent_at, from_property_id, to_property_id'),
      supabase.from('physical_inventory_computed').select('asset_id, inventory_date, discrepancy, property_id'),
      supabase.from('purchase_log_computed').select('purchase_date, amount, property_id'),
      supabase.from('disposal_log_computed').select('disposal_date, amount, property_id'),
    ])
    setRows(a.data || [])
    setActivity(log.data || [])
    setPmsLog(pms.data || [])
    setTransfers(tr.data || [])
    setCounts(pi.data || [])
    setPurchases(pl.data || [])
    setDisposals(dl.data || [])
    setUpdatedAt(new Date())
    setLoading(false)
    setRefreshing(false)
  }, [])

  // load now, then keep the numbers fresh every few minutes
  useEffect(() => {
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [load])

  if (loading) return <div className="text-muted text-sm">Loading dashboard…</div>

  const all = currentPropertyId === 'all'
  const inScope = (pid) => all || pid === currentPropertyId
  const today = todayISO()
  const monthStart = today.slice(0, 7) + '-01'

  const scoped = rows.filter(r => inScope(r.property_id))
  // disposed records stay in the history but are not part of what you own today
  const active = scoped.filter(r => r.status !== 'Disposed')
  const disposedRecords = scoped.filter(r => r.status === 'Disposed')
  const inTransitAssets = active.filter(r => r.status === 'In Transit')

  const scopedPms = pmsLog.filter(r => inScope(r.property_id))
  const pmsOverdue = scopedPms.filter(r => r.pms_status === 'OVERDUE')
  const pmsOpen = scopedPms.filter(r => ['SCHEDULED', 'DUE', 'IN PROGRESS'].includes(r.pms_status))
  const pmsTotalCost = scopedPms.filter(r => r.pms_status === 'COMPLETED').reduce((s, r) => s + Number(r.maintenance_cost || 0), 0)
  const pmsPlannedCost = scopedPms.filter(r => OPEN_PMS.includes(r.pms_status)).reduce((s, r) => s + Number(r.maintenance_cost || 0), 0)

  // money (all records: purchases and disposals are history)
  const totalPurchase = scoped.reduce((s, r) => s + Number(r.registered_amount || 0), 0)
  const totalDisposed = scoped.reduce((s, r) => s + Number(r.disposal_amount || 0), 0)
  const disposedCount = scoped.filter(r => Number(r.disposal_qty) > 0).length
  const valueOnHand = active.reduce((s, r) => s + Number(r.remaining_amount || 0), 0)
  const qtyOnHand = active.reduce((s, r) => s + Number(r.registered_qty || 0), 0)

  // status cards (active assets only)
  const operational = active.filter(r => r.status === 'Active')
  const underMaintenance = active.filter(r => r.status === 'Under Maintenance')
  const damaged = active.filter(r => r.condition === 'Damaged')
  const deployed = active.filter(r => r.status === 'In Use')
  const standby = active.filter(r => r.status === 'Available')
  const warrantyOverdue = active.filter(r => r.warranty_expiry && r.warranty_expiry < today)
  const maintenanceDueToday = active.filter(r => r.maintenance_due === today)

  // transfers waiting to be received here (or anywhere, for All Properties)
  const waiting = transfers.filter(t => t.status === 'In Transit' && (all || t.to_property_id === currentPropertyId))
  const staleWaiting = waiting.filter(t => (Date.now() - new Date(t.sent_at)) / 86400000 > 3)

  // physical counts this month
  const countedIds = new Set(counts.filter(c => c.inventory_date >= monthStart && inScope(c.property_id)).map(c => c.asset_id))
  const counted = active.filter(r => countedIds.has(r.id))
  const notCounted = active.filter(r => !countedIds.has(r.id))
  const countPct = active.length ? Math.round((counted.length / active.length) * 100) : 0
  const since30 = iso(addDays(new Date(), -30))
  const discrepancies30 = counts.filter(c => inScope(c.property_id) && c.inventory_date >= since30 && c.discrepancy && c.discrepancy !== 'No Discrepancy').length

  // book value and end of life
  const bookValue = active.reduce((s, r) => s + Number(r.current_asset_value || 0) * Number(r.registered_qty || 0), 0)
  const costOnHand = active.reduce((s, r) => s + Number(r.purchase_cost || 0) * Number(r.registered_qty || 0), 0)
  const deprPct = costOnHand ? Math.round((1 - bookValue / costOnHand) * 100) : 0
  const in90 = iso(addDays(new Date(), 90))
  const endOfLife = active.filter(r => r.end_of_life && r.end_of_life <= in90).sort((a, b) => a.end_of_life.localeCompare(b.end_of_life))

  // charts and lists (active assets)
  const catMap = {}
  active.forEach(r => {
    const k = r.category || 'Uncategorized'
    if (!catMap[k]) catMap[k] = { name: k.replace(/^\W+\s*/, ''), count: 0, value: 0 }
    catMap[k].count += 1
    catMap[k].value += Number(r.current_asset_value || 0)
  })
  const categoryData = Object.values(catMap).sort((a, b) => b.count - a.count)
  const statusMap = {}
  active.forEach(r => { statusMap[r.status] = (statusMap[r.status] || 0) + 1 })
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }))
  const conditionMap = {}
  active.forEach(r => { const k = r.condition || 'Unspecified'; conditionMap[k] = (conditionMap[k] || 0) + 1 })
  const deptMap = {}
  active.forEach(r => {
    const k = r.department || 'Unassigned'
    if (!deptMap[k]) deptMap[k] = { count: 0, value: 0 }
    deptMap[k].count += 1
    deptMap[k].value += Number(r.remaining_amount || 0)
  })
  const upcomingMaintenance = active.filter(r => r.maintenance_due && daysBetween(today, r.maintenance_due) <= 30)
    .sort((a, b) => a.maintenance_due.localeCompare(b.maintenance_due)).slice(0, 8)
  const warrantyWatch = active.filter(r => r.warranty_expiry && daysBetween(today, r.warranty_expiry) <= 30)
    .sort((a, b) => a.warranty_expiry.localeCompare(b.warranty_expiry)).slice(0, 8)
  const recentlyAdded = [...scoped].filter(r => r.acquisition_date)
    .sort((a, b) => b.acquisition_date.localeCompare(a.acquisition_date) || (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 6)

  // purchases vs disposals per month (pesos)
  const now = new Date()
  const trend = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    trend.push({
      name: d.toLocaleString(undefined, { month: 'short' }) + (d.getMonth() === 0 || i === months - 1 ? ` ${String(d.getFullYear()).slice(2)}` : ''),
      Purchases: purchases.filter(p => inScope(p.property_id) && (p.purchase_date || '').startsWith(key)).reduce((s, p) => s + Number(p.amount || 0), 0),
      Disposals: disposals.filter(p => inScope(p.property_id) && (p.disposal_date || '').startsWith(key)).reduce((s, p) => s + Number(p.amount || 0), 0),
    })
  }

  // side-by-side comparison when viewing all properties
  const comparison = all ? properties.map(p => {
    const pr = rows.filter(r => r.property_id === p.id)
    const pa = pr.filter(r => r.status !== 'Disposed')
    const pCounted = pa.filter(r => counts.some(c => c.asset_id === r.id && c.inventory_date >= monthStart)).length
    return {
      id: p.id, name: p.name, active: pa.length, value: pa.reduce((s, r) => s + Number(r.remaining_amount || 0), 0),
      disposed: pr.filter(r => r.status === 'Disposed').length,
      pmsOverdue: pmsLog.filter(m => m.property_id === p.id && m.pms_status === 'OVERDUE').length,
      waiting: transfers.filter(t => t.status === 'In Transit' && t.to_property_id === p.id).length,
      countPct: pa.length ? Math.round((pCounted / pa.length) * 100) : 0,
    }
  }) : []

  const show = (title, list, extra) => setDrill({ title, rows: list, ...extra })
  const valueEach = (r) => peso(Number(r.current_asset_value || 0) * Number(r.registered_qty || 0))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl mb-1">Asset Dashboard</h1>
          <p className="text-sm text-muted">
            {all ? 'All properties' : currentProperty?.name} · Updated {updatedAt ? updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'} · refreshes every 5 minutes
          </p>
        </div>
        <button onClick={load} disabled={refreshing} className="px-3 py-2 text-sm border border-hairline rounded hover:bg-theme-hover disabled:opacity-60 flex items-center gap-2">
          <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M16 10a6 6 0 11-1.8-4.3M16 3.5v3.2h-3.2" /></svg>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat iconKey="purchase" label="Total Purchase Value" value={peso(totalPurchase)} sub={`${scoped.length} asset records (incl. disposed)`} />
        <Stat iconKey="disposed" label="Total Disposed" value={peso(totalDisposed)} sub={`${disposedCount} asset${disposedCount === 1 ? '' : 's'}`} tone={TONE.danger}
          onClick={() => show('Disposed assets', scoped.filter(r => Number(r.disposal_qty) > 0), { extraLabel: 'Disposed qty', extra: r => Number(r.disposal_qty || 0).toLocaleString() })} />
        <Stat iconKey="ending" label="Value on Hand" value={peso(valueOnHand)} sub={`${qtyOnHand.toLocaleString()} ${qtyOnHand === 1 ? 'piece' : 'pieces'} on hand`} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Stat iconKey="assets" label="Active Assets" value={active.length}
          sub={`${disposedRecords.length} disposed${inTransitAssets.length ? ` · ${inTransitAssets.length} in transit` : ''}`}
          onClick={() => show('Active assets', active)} />
        <Stat iconKey="operational" label="Operational" value={operational.length} tone={TONE.success} onClick={() => show('Operational assets', operational)} />
        <Stat iconKey="maintenance" label="Under Maintenance" value={underMaintenance.length} tone={TONE.gold} onClick={() => show('Under maintenance', underMaintenance)} />
        <Stat iconKey="damaged" label="Damaged" value={damaged.length} tone={TONE.danger} onClick={() => show('Damaged assets', damaged)} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Stat iconKey="deployed" label="Deployed" value={deployed.length} onClick={() => show('Deployed (in use)', deployed)} />
        <Stat iconKey="standby" label="Standby / Spare" value={standby.length} onClick={() => show('Standby / spare', standby)} />
        <Stat iconKey="warranty" label="Warranty Overdue" value={warrantyOverdue.length} tone={warrantyOverdue.length ? TONE.danger : undefined}
          onClick={() => show('Warranty overdue', warrantyOverdue, { extraLabel: 'Warranty expired', extra: r => r.warranty_expiry })} />
        <Stat iconKey="due" label="Maintenance Due Today" value={maintenanceDueToday.length} tone={maintenanceDueToday.length ? TONE.gold : undefined}
          onClick={() => show('Maintenance due today', maintenanceDueToday, { extraLabel: 'Due', extra: r => r.maintenance_due })} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Stat iconKey="maintenance" label="PMS Open Visits" value={pmsOpen.length} sub="scheduled or in progress" tone={pmsOpen.length ? TONE.gold : undefined}
          onClick={() => setPage('maintenance')} hint="Open Maintenance (PMS)" />
        <Stat iconKey="maintenance" label="PMS Overdue" value={pmsOverdue.length} tone={pmsOverdue.length ? TONE.danger : undefined}
          onClick={() => openWithFilter(setPage, 'maintenance', { status: 'OVERDUE' })} hint="Open Maintenance (PMS) showing overdue visits" />
        <Stat iconKey="maintenance" label="PMS Cost (completed)" value={peso(pmsTotalCost)} sub={pmsPlannedCost > 0 ? `${peso(pmsPlannedCost)} planned` : undefined} />
        <Stat iconKey="transfer" label="Transfers Waiting" value={waiting.length}
          sub={staleWaiting.length ? `${staleWaiting.length} waiting over 3 days` : waiting.length ? 'to be received' : 'nothing in transit'}
          tone={staleWaiting.length ? TONE.danger : waiting.length ? TONE.gold : undefined}
          onClick={() => setPage('transfers')} hint="Open Asset Transfer (Incoming)" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat iconKey="count" label="Counted This Month" value={`${counted.length} / ${active.length}`}
          sub={`${countPct}% counted${discrepancies30 ? ` · ${discrepancies30} discrepanc${discrepancies30 === 1 ? 'y' : 'ies'} (30 days)` : ''}`}
          tone={discrepancies30 ? TONE.danger : countPct === 100 ? TONE.success : undefined}
          onClick={() => show('Not yet counted this month', notCounted, { page: 'physical', pageLabel: 'Physical Inventory', note: `${counted.length} already counted since ${monthStart}` })} />
        <Stat iconKey="book" label="Book Value (after depreciation)" value={peso(bookValue)}
          sub={costOnHand ? `of ${peso(costOnHand)} cost · ${deprPct}% depreciated` : 'no cost data yet'} />
        <Stat iconKey="eol" label="Reaching End of Life" value={endOfLife.length} sub="within 90 days (or already past)"
          tone={endOfLife.length ? TONE.gold : undefined}
          onClick={() => show('Reaching end of useful life', endOfLife, { extraLabel: 'End of life', extra: r => r.end_of_life })} />
      </div>

      {all && comparison.length > 1 && (
        <Panel title="Property Comparison">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted border-b border-hairline">
                  {['Property', 'Active assets', 'Value on hand', 'Disposed', 'PMS overdue', 'Transfers waiting', 'Counted this month'].map(h => <th key={h} className="py-2 pr-4 font-medium whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {comparison.map(c => (
                  <tr key={c.id} className="border-b border-hairline last:border-0">
                    <td className="py-2 pr-4 font-medium whitespace-nowrap">{c.name}</td>
                    <td className="py-2 pr-4">{c.active}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{peso(c.value)}</td>
                    <td className="py-2 pr-4 text-muted">{c.disposed}</td>
                    <td className={`py-2 pr-4 ${c.pmsOverdue ? 'text-danger font-medium' : ''}`}>{c.pmsOverdue}</td>
                    <td className={`py-2 pr-4 ${c.waiting ? 'text-gold font-medium' : ''}`}>{c.waiting}</td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 bg-hairline rounded-full overflow-hidden"><div className="h-full bg-theme-accent" style={{ width: `${c.countPct}%` }} /></div>
                        <span className="text-xs text-muted">{c.countPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Panel title="Purchases vs Disposals"
        action={
          <div className="flex rounded border border-hairline overflow-hidden text-xs">
            {[3, 6, 12].map(m => (
              <button key={m} onClick={() => setMonths(m)} className={`px-2.5 py-1 ${months === m ? 'bg-theme-accent text-white' : 'hover:bg-theme-hover'}`}>{m} mo</button>
            ))}
          </div>
        }>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={trend} margin={{ left: 4, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DAD8D2" vertical={false} />
            <XAxis dataKey="name" interval={0} tick={{ fontSize: 11, fill: '#66625A' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#66625A' }} axisLine={false} tickLine={false} width={56}
              tickFormatter={v => v >= 1000000 ? `₱${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `₱${Math.round(v / 1000)}k` : `₱${v}`} />
            <Tooltip formatter={(v, n) => [peso(v), n]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Purchases" fill="#3A3733" radius={[3, 3, 0, 0]} maxBarSize={26} />
            <Bar dataKey="Disposals" fill="#A83B32" radius={[3, 3, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <div className="grid grid-cols-2 gap-6">
        <Panel title="Assets by Category">
          {categoryData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DAD8D2" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#66625A' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#24221E' }} />
                <Tooltip formatter={(v, n) => n === 'count' ? [v, 'Assets'] : [peso(v), 'Current Value']} />
                <Bar dataKey="count" fill="#3A3733" radius={[0, 3, 3, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyRow>No assets yet.</EmptyRow>}
        </Panel>

        <Panel title="Status Breakdown">
          {statusData.length ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {statusData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <ul className="text-sm space-y-1.5 flex-1">
                {statusData.map((s, i) => (
                  <li key={s.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: PALETTE[i % PALETTE.length] }} />
                      {s.name}
                    </span>
                    <span className="font-medium">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : <EmptyRow>No assets yet.</EmptyRow>}
        </Panel>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Panel title="Upcoming Maintenance" action={<span className="text-xs text-muted">next 30 days</span>}>
          {upcomingMaintenance.length ? (
            <ul className="space-y-2">
              {upcomingMaintenance.map(r => {
                const overdue = r.maintenance_due < today
                return (
                  <li key={r.id} className="flex items-center justify-between text-sm">
                    <span className="truncate pr-2">{r.asset_code} — {r.asset_name}</span>
                    <span className={`whitespace-nowrap ${overdue ? 'text-danger' : 'text-muted'}`}>{r.maintenance_due}{overdue ? ' (overdue)' : ''}</span>
                  </li>
                )
              })}
            </ul>
          ) : <EmptyRow>Nothing due soon.</EmptyRow>}
        </Panel>

        <Panel title="Warranty Watch" action={<span className="text-xs text-muted">next 30 days</span>}>
          {warrantyWatch.length ? (
            <ul className="space-y-2">
              {warrantyWatch.map(r => {
                const expired = r.warranty_expiry < today
                return (
                  <li key={r.id} className="flex items-center justify-between text-sm">
                    <span className="truncate pr-2">{r.asset_code} — {r.asset_name}</span>
                    <span className={`whitespace-nowrap ${expired ? 'text-danger' : 'text-muted'}`}>{r.warranty_expiry}{expired ? ' (expired)' : ''}</span>
                  </li>
                )
              })}
            </ul>
          ) : <EmptyRow>Nothing expiring soon.</EmptyRow>}
        </Panel>

        <Panel title="Recent Activity">
          {activity.length ? (
            <ul className="space-y-2">
              {activity.map(a => {
                const d = a.new_data || a.old_data || {}
                const label = a.table_name === 'assets' ? (d.asset_code || d.asset_name)
                  : a.table_name === 'profiles' ? d.full_name
                  : a.table_name.replace('_', ' ')
                return (
                  <li key={`${a.table_name}-${a.id}`} className="text-sm">
                    <span className="capitalize text-muted">{a.action}</span> {label}
                    <div className="text-xs text-muted">{new Date(a.created_at).toLocaleString()} · {a.actor_name || 'Unknown'}</div>
                  </li>
                )
              })}
            </ul>
          ) : <EmptyRow>No activity yet.</EmptyRow>}
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Panel title="Recently Added Assets">
          {recentlyAdded.length ? (
            <ul className="space-y-2">
              {recentlyAdded.map(r => (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2">{r.asset_code} — {r.asset_name}</span>
                  <span className="text-muted whitespace-nowrap">{r.acquisition_date}</span>
                </li>
              ))}
            </ul>
          ) : <EmptyRow>No assets added yet.</EmptyRow>}
        </Panel>

        <Panel title="Condition Breakdown">
          <ul className="space-y-2">
            {Object.entries(conditionMap).sort((a, b) => b[1] - a[1]).map(([cond, count]) => {
              const pct = active.length ? Math.round((count / active.length) * 100) : 0
              return (
                <li key={cond}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{cond}</span>
                    <span className="text-muted">{count} · {pct}%</span>
                  </div>
                  <div className="h-1.5 bg-hairline rounded-full overflow-hidden">
                    <div className="h-full bg-theme-accent rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      <Panel title="Value by Department">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted border-b border-hairline">
                <th className="py-2 font-medium">Department</th>
                <th className="py-2 font-medium">Assets</th>
                <th className="py-2 font-medium">Remaining Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(deptMap).sort((a, b) => b[1].value - a[1].value).map(([dept, v]) => (
                <tr key={dept} className="border-b border-hairline last:border-0">
                  <td className="py-2">{dept}</td>
                  <td className="py-2">{v.count}</td>
                  <td className="py-2">{peso(v.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {drill && <DrillModal drill={drill} onClose={() => setDrill(null)} onOpenPage={(pg) => { setDrill(null); setPage(pg) }} />}
    </div>
  )
}
