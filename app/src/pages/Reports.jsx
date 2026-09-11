import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProperty } from '../lib/PropertyContext'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

function peso(n) { return n === null || n === undefined ? '—' : '₱' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }) }
function todayISO() { return new Date().toISOString().slice(0, 10) }
function startOfWeek(d) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function iso(d) { return d.toISOString().slice(0, 10) }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0) }

const STATUS_LIST = ['Active', 'In Use', 'Under Maintenance', 'Missing', 'Damaged', 'Retired', 'Disposed']

function KPI({ label, value, tone }) {
  return (
    <div className="border border-hairline bg-surface rounded px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`font-display text-xl mt-1 ${tone || 'text-ink'}`}>{value}</div>
    </div>
  )
}

function Panel({ title, children, action }) {
  return (
    <div className="border border-hairline bg-surface rounded p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-base">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function ReportTable({ rows, empty }) {
  return (
    <div className="overflow-x-auto border border-hairline rounded">
      <table className="w-full text-sm">
        <thead className="bg-ink text-paper text-xs uppercase tracking-wide">
          <tr>{['Asset ID', 'Name', 'Category', 'Serial', 'Department', 'Location', 'Status', 'Condition'].map(h => (
            <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t border-hairline">
              <td className="px-3 py-2 whitespace-nowrap">{r.asset_code}</td>
              <td className="px-3 py-2 whitespace-nowrap">{r.asset_name}</td>
              <td className="px-3 py-2 whitespace-nowrap">{r.category}</td>
              <td className="px-3 py-2 whitespace-nowrap">{r.serial_number}</td>
              <td className="px-3 py-2 whitespace-nowrap">{r.department}</td>
              <td className="px-3 py-2 whitespace-nowrap">{r.location}</td>
              <td className="px-3 py-2 whitespace-nowrap">{r.status}</td>
              <td className="px-3 py-2 whitespace-nowrap">{r.condition}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted">{empty || 'None.'}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

export default function Reports() {
  const { currentPropertyId, currentProperty } = useProperty()
  const [tab, setTab] = useState('daily')
  const [rowsRaw, setRows] = useState([])
  const [movementsRaw, setMovements] = useState([])
  const [countsRaw, setCounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const [a, m, p] = await Promise.all([
        supabase.from('assets_computed').select('*'),
        supabase.from('movement_log_computed').select('*'),
        supabase.from('physical_inventory_computed').select('*'),
      ])
      setRows(a.data || [])
      setMovements(m.data || [])
      setCounts(p.data || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="text-muted text-sm">Loading reports…</div>

  const inScope = (r) => currentPropertyId === 'all' || r.property_id === currentPropertyId
  const rows = rowsRaw.filter(inScope)
  const movements = movementsRaw.filter(inScope)
  const counts = countsRaw.filter(inScope)

  const today = todayISO()
  const weekStart = iso(startOfWeek(new Date()))
  const weekEnd = iso(addDays(startOfWeek(new Date()), 6))
  const monthStart = iso(startOfMonth(new Date()))
  const monthEnd = iso(endOfMonth(new Date()))

  const addedBetween = (from, to) => rows.filter(r => r.acquisition_date && r.acquisition_date >= from && r.acquisition_date <= to)
  const disposedBetween = (from, to) => rows.filter(r => r.disposal_date && r.disposal_date >= from && r.disposal_date <= to)
  const maintenanceDueBetween = (from, to) => rows.filter(r => r.maintenance_due && r.maintenance_due >= from && r.maintenance_due <= to)
  const warrantyExpiringBetween = (from, to) => rows.filter(r => r.warranty_expiry && r.warranty_expiry >= from && r.warranty_expiry <= to)
  const warrantyOverdue = rows.filter(r => r.warranty_expiry && r.warranty_expiry < today)
  const movementsBetween = (from, to) => movements.filter(m => m.movement_date && m.movement_date >= from && m.movement_date <= to)
  const countsBetween = (from, to) => counts.filter(c => c.inventory_date && c.inventory_date >= from && c.inventory_date <= to)
  const discrepanciesBetween = (from, to) => countsBetween(from, to).filter(c => c.discrepancy && c.discrepancy !== 'No Discrepancy')

  const addedToday = addedBetween(today, today)
  const addedThisWeek = addedBetween(weekStart, weekEnd)
  const addedThisMonth = addedBetween(monthStart, monthEnd)
  const disposedThisMonth = disposedBetween(monthStart, monthEnd)

  const categoryTotals = {}
  rows.forEach(r => {
    const k = r.category || 'Uncategorized'
    if (!categoryTotals[k]) categoryTotals[k] = { count: 0, cost: 0 }
    categoryTotals[k].count += 1
    categoryTotals[k].cost += Number(r.registered_amount || 0)
  })

  const locationTotals = {}
  rows.forEach(r => {
    const k = r.location || 'Unassigned'
    locationTotals[k] = (locationTotals[k] || 0) + 1
  })
  const topLocations = Object.entries(locationTotals).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  const totalDepreciationMonth = rows.reduce((s, r) => s + Number(r.accumulated_depreciation || 0), 0)

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Reports</h1>
      <p className="text-sm text-muted mb-6">
        {currentPropertyId === 'all' ? 'All properties' : currentProperty?.name} · Report date: {today}
      </p>

      <div className="flex gap-2 mb-6 border-b border-hairline">
        {['daily', 'weekly', 'monthly'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize -mb-px border-b-2 ${tab === t ? 'border-gold text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'daily' && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <KPI label="Total Assets" value={rows.length} />
            <KPI label="Assets Added Today" value={addedToday.length} />
            <KPI label="Maintenance Due Today" value={maintenanceDueBetween(today, today).length} tone={maintenanceDueBetween(today, today).length ? 'text-gold' : ''} />
            <KPI label="Movements Logged Today" value={movementsBetween(today, today).length} />
            <KPI label="Counts Logged Today" value={countsBetween(today, today).length} />
            <KPI label="Discrepancies Today" value={discrepanciesBetween(today, today).length} tone={discrepanciesBetween(today, today).length ? 'text-danger' : ''} />
          </div>

          <Panel title="Assets Added Today">
            <ReportTable rows={addedToday} empty="No assets added today." />
          </Panel>

          <Panel title="Movements Logged Today">
            <div className="overflow-x-auto border border-hairline rounded">
              <table className="w-full text-sm">
                <thead className="bg-ink text-paper text-xs uppercase tracking-wide">
                  <tr>{['Asset', 'Type', 'From', 'To', 'Reason'].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {movementsBetween(today, today).map(m => (
                    <tr key={m.id} className="border-t border-hairline">
                      <td className="px-3 py-2">{m.asset_code} — {m.asset_name}</td>
                      <td className="px-3 py-2">{m.movement_type}</td>
                      <td className="px-3 py-2">{m.from_location}</td>
                      <td className="px-3 py-2">{m.to_location}</td>
                      <td className="px-3 py-2">{m.reason}</td>
                    </tr>
                  ))}
                  {movementsBetween(today, today).length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted">No movements today.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'weekly' && (
        <div>
          <p className="text-sm text-muted mb-4">Week of {weekStart} to {weekEnd}</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <KPI label="Total Assets" value={rows.length} />
            <KPI label="Added This Week" value={addedThisWeek.length} />
            <KPI label="Operational" value={rows.filter(r => r.status === 'Active').length} />
            <KPI label="Deployed" value={rows.filter(r => r.status === 'In Use').length} />
            <KPI label="Under Maintenance" value={rows.filter(r => r.status === 'Under Maintenance').length} />
            <KPI label="Movements This Week" value={movementsBetween(weekStart, weekEnd).length} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Panel title="Status Summary">
              <div className="space-y-1">
                {STATUS_LIST.map(s => {
                  const count = rows.filter(r => r.status === s).length
                  const pct = rows.length ? Math.round((count / rows.length) * 100) : 0
                  return (
                    <div key={s} className="flex justify-between px-1 py-1.5 text-sm border-t border-hairline first:border-t-0">
                      <span>{s}</span><span className="font-medium">{count} <span className="text-muted font-normal">({pct}%)</span></span>
                    </div>
                  )
                })}
              </div>
            </Panel>
            <Panel title="Warranty Expiring This Week">
              <ul className="space-y-2 text-sm">
                {warrantyExpiringBetween(weekStart, weekEnd).map(r => (
                  <li key={r.id} className="flex justify-between"><span>{r.asset_code} — {r.asset_name}</span><span className="text-muted">{r.warranty_expiry}</span></li>
                ))}
                {warrantyExpiringBetween(weekStart, weekEnd).length === 0 && <li className="text-muted text-center py-4">None expiring this week.</li>}
              </ul>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'monthly' && (
        <div>
          <p className="text-sm text-muted mb-4">{monthStart} to {monthEnd}</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <KPI label="Total Assets" value={rows.length} />
            <KPI label="Added This Month" value={addedThisMonth.length} />
            <KPI label="Disposed This Month" value={disposedThisMonth.length} />
            <KPI label="Operational" value={rows.filter(r => r.status === 'Active').length} />
            <KPI label="Warranty Overdue" value={warrantyOverdue.length} tone={warrantyOverdue.length ? 'text-danger' : ''} />
            <KPI label="Total Accumulated Depreciation" value={peso(totalDepreciationMonth)} />
          </div>

          <Panel title="Category Summary">
            <div className="grid grid-cols-2 gap-6">
              <div className="overflow-x-auto border border-hairline rounded">
                <table className="w-full text-sm">
                  <thead className="bg-ink text-paper text-xs uppercase tracking-wide">
                    <tr><th className="text-left px-3 py-2">Category</th><th className="text-left px-3 py-2">Count</th><th className="text-left px-3 py-2">Purchase Cost</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(categoryTotals).map(([cat, v]) => (
                      <tr key={cat} className="border-t border-hairline">
                        <td className="px-3 py-2">{cat}</td>
                        <td className="px-3 py-2">{v.count}</td>
                        <td className="px-3 py-2">{peso(v.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(180, Object.keys(categoryTotals).length * 28)}>
                <BarChart data={Object.entries(categoryTotals).map(([name, v]) => ({ name: name.replace(/^\W+\s*/, ''), count: v.count }))}
                  layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1DDCF" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#5B6660' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: '#142B27' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#142B27" radius={[0, 3, 3, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="grid grid-cols-2 gap-6">
            <Panel title="Top Locations by Asset Count">
              <ul className="space-y-2 text-sm">
                {topLocations.map(l => (
                  <li key={l.name} className="flex justify-between"><span>{l.name}</span><span className="font-medium">{l.count}</span></li>
                ))}
                {topLocations.length === 0 && <li className="text-muted text-center py-4">No location data.</li>}
              </ul>
            </Panel>
            <Panel title="Disposed This Month">
              <ul className="space-y-2 text-sm">
                {disposedThisMonth.map(r => (
                  <li key={r.id} className="flex justify-between"><span>{r.asset_code} — {r.asset_name}</span><span className="text-muted">{r.disposal_reason}</span></li>
                ))}
                {disposedThisMonth.length === 0 && <li className="text-muted text-center py-4">Nothing disposed this month.</li>}
              </ul>
            </Panel>
          </div>
        </div>
      )}
    </div>
  )
}
