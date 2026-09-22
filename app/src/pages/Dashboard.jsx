import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProperty } from '../lib/PropertyContext'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'

const PALETTE = ['#142B27', '#B8902E', '#3D7A5B', '#A83B32', '#5B6660', '#8A6D9E', '#3E6B8A', '#C77E3A']

function peso(n) {
  if (n === null || n === undefined) return '—'
  return '₱' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}
function todayISO() { return new Date().toISOString().slice(0, 10) }
function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000) }
function startOfWeek(d) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function iso(d) { return d.toISOString().slice(0, 10) }

const icon = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }

const ICONS = {
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

function Stat({ label, value, sub, tone, iconKey }) {
  return (
    <div className="border border-hairline bg-surface rounded-lg px-5 py-4 flex gap-3">
      <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${tone ? tone.bg : 'bg-ink/5'} ${tone ? tone.text : 'text-ink/60'}`}>
        {ICONS[iconKey]}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted truncate">{label}</div>
        <div className={`font-display text-xl mt-0.5 ${tone ? tone.text : 'text-ink'}`}>{value}</div>
        {sub && <div className="text-xs text-muted mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  )
}

const TONE = {
  success: { bg: 'bg-success/10', text: 'text-success' },
  gold: { bg: 'bg-gold/10', text: 'text-gold' },
  danger: { bg: 'bg-danger/10', text: 'text-danger' },
}

function Panel({ title, action, children }) {
  return (
    <div className="border border-hairline bg-surface rounded-lg p-5 shadow-[0_1px_2px_rgba(20,43,39,0.03)]">
      <div className="flex items-center justify-between mb-3">
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

function QuickAction({ onClick, children, iconKey }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-3.5 py-2 text-sm rounded-md border border-hairline bg-surface hover:bg-hairline/20 transition-colors">
      <span className="text-gold">{ICONS[iconKey]}</span>
      {children}
    </button>
  )
}

export default function Dashboard({ setPage, profile }) {
  const { currentPropertyId, currentProperty } = useProperty()
  const [rows, setRows] = useState([])
  const [activity, setActivity] = useState([])
  const [pmsLog, setPmsLog] = useState([])
  const [loading, setLoading] = useState(true)
  const canWrite = profile?.role === 'admin' || profile?.role === 'manager'

  useEffect(() => {
    (async () => {
      const [a, log, pms] = await Promise.all([
        supabase.from('assets_computed').select('*'),
        supabase.from('activity_log_computed').select('*').order('created_at', { ascending: false }).limit(6),
        supabase.from('maintenance_log_computed').select('*'),
      ])
      setRows(a.data || [])
      setActivity(log.data || [])
      setPmsLog(pms.data || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="text-muted text-sm">Loading dashboard…</div>

  const scoped = currentPropertyId === 'all' ? rows : rows.filter(r => r.property_id === currentPropertyId)
  const scopedPms = currentPropertyId === 'all' ? pmsLog : pmsLog.filter(r => r.property_id === currentPropertyId)
  const pmsOverdue = scopedPms.filter(r => r.pms_status === 'OVERDUE').length
  const pmsScheduled = scopedPms.filter(r => ['SCHEDULED', 'DUE', 'IN PROGRESS'].includes(r.pms_status)).length
  const pmsTotalCost = scopedPms.reduce((s, r) => s + Number(r.maintenance_cost || 0), 0)
  const today = todayISO()

  const disposedCount = scoped.filter(r => Number(r.disposal_qty) > 0).length

  const totalPurchase = scoped.reduce((s, r) => s + Number(r.registered_amount || 0), 0)
  const totalDisposed = scoped.reduce((s, r) => s + Number(r.disposal_amount || 0), 0)
  const totalRemaining = scoped.reduce((s, r) => s + Number(r.remaining_amount || 0), 0)
  const totalRemainingQty = scoped.reduce((s, r) => s + Number(r.remaining_qty || 0), 0)

  const totalAssets = scoped.length
  const operational = scoped.filter(r => r.status === 'Active').length
  const underMaintenance = scoped.filter(r => r.status === 'Under Maintenance').length
  const damaged = scoped.filter(r => r.condition === 'Damaged').length
  const deployed = scoped.filter(r => r.status === 'In Use').length
  const standby = scoped.filter(r => r.status === 'Available').length
  const warrantyOverdue = scoped.filter(r => r.warranty_expiry && r.warranty_expiry < today)
  const maintenanceDueToday = scoped.filter(r => r.maintenance_due === today)

  const catMap = {}
  scoped.forEach(r => {
    const k = r.category || 'Uncategorized'
    if (!catMap[k]) catMap[k] = { name: k.replace(/^\W+\s*/, ''), count: 0, value: 0 }
    catMap[k].count += 1
    catMap[k].value += Number(r.current_asset_value || 0)
  })
  const categoryData = Object.values(catMap).sort((a, b) => b.count - a.count)

  const statusMap = {}
  scoped.forEach(r => { statusMap[r.status] = (statusMap[r.status] || 0) + 1 })
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }))

  const conditionMap = {}
  scoped.forEach(r => { const k = r.condition || 'Unspecified'; conditionMap[k] = (conditionMap[k] || 0) + 1 })

  const deptMap = {}
  scoped.forEach(r => {
    const k = r.department || 'Unassigned'
    if (!deptMap[k]) deptMap[k] = { count: 0, value: 0 }
    deptMap[k].count += 1
    deptMap[k].value += Number(r.remaining_amount || 0)
  })

  const upcomingMaintenance = scoped
    .filter(r => r.maintenance_due)
    .filter(r => daysBetween(today, r.maintenance_due) <= 30)
    .sort((a, b) => a.maintenance_due.localeCompare(b.maintenance_due))
    .slice(0, 8)

  const warrantyWatch = scoped
    .filter(r => r.warranty_expiry)
    .filter(r => daysBetween(today, r.warranty_expiry) <= 30)
    .sort((a, b) => a.warranty_expiry.localeCompare(b.warranty_expiry))
    .slice(0, 8)

  const recentlyAdded = [...scoped]
    .filter(r => r.acquisition_date)
    .sort((a, b) => b.acquisition_date.localeCompare(a.acquisition_date) || (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 6)

  // assets added per week, last 8 weeks
  const weekBuckets = []
  for (let i = 7; i >= 0; i--) {
    const start = addDays(startOfWeek(new Date()), -7 * i)
    const end = addDays(start, 6)
    const startStr = iso(start), endStr = iso(end)
    const count = scoped.filter(r => r.acquisition_date && r.acquisition_date >= startStr && r.acquisition_date <= endStr).length
    weekBuckets.push({ name: `${start.getMonth() + 1}/${start.getDate()}`, count })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl mb-1">Asset Dashboard</h1>
          <p className="text-sm text-muted">
            {currentPropertyId === 'all' ? 'All properties' : currentProperty?.name} · Live totals as of {today}.
          </p>
        </div>
        {canWrite && setPage && (
          <div className="flex gap-2 flex-wrap">
            <QuickAction iconKey="plus" onClick={() => setPage('assets')}>Add Asset</QuickAction>
            <QuickAction iconKey="swap" onClick={() => setPage('movement')}>Log Movement</QuickAction>
            <QuickAction iconKey="check" onClick={() => setPage('physical')}>Log Count</QuickAction>
            <QuickAction iconKey="maintenance" onClick={() => setPage('maintenance')}>Log Maintenance</QuickAction>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat iconKey="purchase" label="Total Purchase Value" value={peso(totalPurchase)} sub={`${totalAssets} asset records`} />
        <Stat iconKey="disposed" label="Total Disposed" value={peso(totalDisposed)} sub={`${disposedCount} asset${disposedCount === 1 ? '' : 's'}`} tone={TONE.danger} />
        <Stat iconKey="ending" label="Total Qty Ending" value={peso(totalRemaining)} sub={`${totalRemainingQty} Qty Ending`} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Stat iconKey="assets" label="Total Assets" value={totalAssets} />
        <Stat iconKey="operational" label="Operational" value={operational} tone={TONE.success} />
        <Stat iconKey="maintenance" label="Under Maintenance" value={underMaintenance} tone={TONE.gold} />
        <Stat iconKey="damaged" label="Damaged" value={damaged} tone={TONE.danger} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Stat iconKey="deployed" label="Deployed" value={deployed} />
        <Stat iconKey="standby" label="Standby / Spare" value={standby} />
        <Stat iconKey="warranty" label="Warranty Overdue" value={warrantyOverdue.length} tone={warrantyOverdue.length ? TONE.danger : undefined} />
        <Stat iconKey="due" label="Maintenance Due Today" value={maintenanceDueToday.length} tone={maintenanceDueToday.length ? TONE.gold : undefined} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Stat iconKey="maintenance" label="PMS Scheduled / In Progress" value={pmsScheduled} tone={pmsScheduled ? TONE.gold : undefined} />
        <Stat iconKey="maintenance" label="PMS Overdue" value={pmsOverdue} tone={pmsOverdue ? TONE.danger : undefined} />
        <Stat iconKey="maintenance" label="PMS Total Cost" value={peso(pmsTotalCost)} />
      </div>

      <Panel title="Assets Added — Last 8 Weeks">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={weekBuckets} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E1DDCF" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5B6660' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#5B6660' }} allowDecimals={false} axisLine={false} tickLine={false} width={28} />
            <Tooltip formatter={(v) => [v, 'Assets added']} />
            <Bar dataKey="count" fill="#B8902E" radius={[3, 3, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid grid-cols-2 gap-6">
        <Panel title="Assets by Category">
          {categoryData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1DDCF" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#5B6660' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#142B27' }} />
                <Tooltip formatter={(v, n) => n === 'count' ? [v, 'Assets'] : [peso(v), 'Current Value']} />
                <Bar dataKey="count" fill="#142B27" radius={[0, 3, 3, 0]} barSize={16} />
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
              const pct = totalAssets ? Math.round((count / totalAssets) * 100) : 0
              return (
                <li key={cond}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{cond}</span>
                    <span className="text-muted">{count} · {pct}%</span>
                  </div>
                  <div className="h-1.5 bg-hairline rounded-full overflow-hidden">
                    <div className="h-full bg-ink rounded-full" style={{ width: `${pct}%` }} />
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
    </div>
  )
}
