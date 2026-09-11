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

function Stat({ label, value, sub, tone }) {
  return (
    <div className="border border-hairline bg-surface rounded px-5 py-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`font-display text-2xl mt-1 ${tone || 'text-ink'}`}>{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  )
}

function Panel({ title, action, children }) {
  return (
    <div className="border border-hairline bg-surface rounded p-5">
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

export default function Dashboard() {
  const { currentPropertyId, currentProperty } = useProperty()
  const [rows, setRows] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const [a, log] = await Promise.all([
        supabase.from('assets_computed').select('*'),
        supabase.from('activity_log_computed').select('*').order('created_at', { ascending: false }).limit(6),
      ])
      setRows(a.data || [])
      setActivity(log.data || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="text-muted text-sm">Loading dashboard…</div>

  const scoped = currentPropertyId === 'all' ? rows : rows.filter(r => r.property_id === currentPropertyId)
  const today = todayISO()

  const disposedCount = scoped.filter(r => Number(r.disposal_qty) > 0).length

  const totalPurchase = scoped.reduce((s, r) => s + Number(r.registered_amount || 0), 0)
  const totalDisposed = scoped.reduce((s, r) => s + Number(r.disposal_amount || 0), 0)
  const totalRemaining = scoped.reduce((s, r) => s + Number(r.remaining_amount || 0), 0)
  const totalCurrentValue = scoped.reduce((s, r) => s + Number(r.current_asset_value || 0), 0)

  const totalAssets = scoped.length
  const operational = scoped.filter(r => r.status === 'Active').length
  const underMaintenance = scoped.filter(r => r.status === 'Under Maintenance').length
  const damaged = scoped.filter(r => r.condition === 'Damaged').length
  const deployed = scoped.filter(r => r.status === 'In Use').length
  const standby = scoped.filter(r => r.status === 'Available').length
  const warrantyOverdue = scoped.filter(r => r.warranty_expiry && r.warranty_expiry < today)
  const maintenanceDueToday = scoped.filter(r => r.maintenance_due === today)

  // Category breakdown
  const catMap = {}
  scoped.forEach(r => {
    const k = r.category || 'Uncategorized'
    if (!catMap[k]) catMap[k] = { name: k.replace(/^\W+\s*/, ''), count: 0, value: 0 }
    catMap[k].count += 1
    catMap[k].value += Number(r.current_asset_value || 0)
  })
  const categoryData = Object.values(catMap).sort((a, b) => b.count - a.count)

  // Status breakdown for pie
  const statusMap = {}
  scoped.forEach(r => { statusMap[r.status] = (statusMap[r.status] || 0) + 1 })
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }))

  // Condition breakdown
  const conditionMap = {}
  scoped.forEach(r => { const k = r.condition || 'Unspecified'; conditionMap[k] = (conditionMap[k] || 0) + 1 })

  // Department value table
  const deptMap = {}
  scoped.forEach(r => {
    const k = r.department || 'Unassigned'
    if (!deptMap[k]) deptMap[k] = { count: 0, value: 0 }
    deptMap[k].count += 1
    deptMap[k].value += Number(r.remaining_amount || 0)
  })

  // Upcoming maintenance (next 30 days, including overdue), soonest first
  const upcomingMaintenance = rows
    .filter(r => r.maintenance_due)
    .filter(r => daysBetween(today, r.maintenance_due) <= 30)
    .sort((a, b) => a.maintenance_due.localeCompare(b.maintenance_due))
    .slice(0, 8)

  // Warranty expiring soon (next 30 days) or already expired
  const warrantyWatch = rows
    .filter(r => r.warranty_expiry)
    .filter(r => daysBetween(today, r.warranty_expiry) <= 30)
    .sort((a, b) => a.warranty_expiry.localeCompare(b.warranty_expiry))
    .slice(0, 8)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl mb-1">Asset Dashboard</h1>
        <p className="text-sm text-muted">
          {currentPropertyId === 'all' ? 'All properties' : currentProperty?.name} · Live totals as of {today}.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total Purchase Value" value={peso(totalPurchase)} sub={`${totalAssets} asset records`} />
        <Stat label="Total Disposed" value={peso(totalDisposed)} sub={`${disposedCount} asset${disposedCount === 1 ? '' : 's'}`} tone="text-danger" />
        <Stat label="Total Remaining Value" value={peso(totalRemaining)} sub={`${peso(totalCurrentValue)} current book value`} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Stat label="Total Assets" value={totalAssets} />
        <Stat label="Operational" value={operational} tone="text-success" />
        <Stat label="Under Maintenance" value={underMaintenance} tone="text-gold" />
        <Stat label="Damaged" value={damaged} tone="text-danger" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Stat label="Deployed" value={deployed} />
        <Stat label="Standby / Spare" value={standby} />
        <Stat label="Warranty Overdue" value={warrantyOverdue.length} tone={warrantyOverdue.length ? 'text-danger' : 'text-ink'} />
        <Stat label="Maintenance Due Today" value={maintenanceDueToday.length} tone={maintenanceDueToday.length ? 'text-gold' : 'text-ink'} />
      </div>

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
                    <span>{r.asset_code} — {r.asset_name}</span>
                    <span className={overdue ? 'text-danger' : 'text-muted'}>{r.maintenance_due}{overdue ? ' (overdue)' : ''}</span>
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
                    <span>{r.asset_code} — {r.asset_name}</span>
                    <span className={expired ? 'text-danger' : 'text-muted'}>{r.warranty_expiry}{expired ? ' (expired)' : ''}</span>
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
    </div>
  )
}
