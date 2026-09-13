import React, { useEffect, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
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

function downloadCsv(filename, rows) {
  const blob = new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

// builds a multi-sheet workbook: a KPI summary sheet plus one sheet per data table
function downloadReportWorkbook(filename, kpis, sheets) {
  const wb = XLSX.utils.book_new()
  const kpiSheet = XLSX.utils.json_to_sheet(kpis.map(([label, value]) => ({ Metric: label, Value: value })))
  XLSX.utils.book_append_sheet(wb, kpiSheet, 'Summary')
  sheets.forEach(({ name, rows }) => {
    if (!rows || rows.length === 0) return
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
  })
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

const STATUS_LIST = ['Active', 'In Use', 'Under Maintenance', 'Missing', 'Damaged', 'Retired', 'Disposed']

const icon = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
const ICONS = {
  assets: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><path d="M10 2.5l7 3.75v7.5L10 17.5l-7-3.75v-7.5L10 2.5z" /><path d="M3 6.25L10 10l7-3.75M10 10v7.5" /></svg>),
  added: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><path d="M10 4v12M4 10h12" /></svg>),
  disposed: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><path d="M4.5 6h11l-.8 10.2a1.5 1.5 0 01-1.5 1.3H6.8a1.5 1.5 0 01-1.5-1.3L4.5 6z" /><path d="M7.5 3.5h5a1 1 0 011 1V6h-7V4.5a1 1 0 011-1z" /></svg>),
  maintenance: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><path d="M13.2 3.8a3 3 0 00-4 3.6L3.8 13a1.6 1.6 0 002.3 2.3l5.6-5.4a3 3 0 003.6-4l-2 2-1.7-.5-.5-1.7 2.1-2.1z" /></svg>),
  movement: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><path d="M3 6.5h11.5M14.5 6.5L11.5 3.5M14.5 6.5l-3 3" /><path d="M17 13.5H5.5M5.5 13.5l3-3M5.5 13.5l3 3" /></svg>),
  count: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><rect x="4" y="3.5" width="12" height="14" rx="1.5" /><path d="M7 10.5l1.8 1.8L13 8.3" /></svg>),
  discrepancy: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><path d="M10 2.5l7.5 13.5H2.5L10 2.5z" /><path d="M10 8v3.2M10 14v.1" /></svg>),
  operational: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><circle cx="10" cy="10" r="7.2" /><path d="M7 10.2l2 2 4-4.4" /></svg>),
  deployed: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><rect x="3" y="4" width="14" height="9" rx="1.5" /><path d="M7 17h6M10 13v4" /></svg>),
  warranty: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><path d="M10 2.5l6 2.2v4.6c0 4-2.5 6.6-6 8-3.5-1.4-6-4-6-8V4.7L10 2.5z" /></svg>),
  depreciation: (<svg width="16" height="16" viewBox="0 0 20 20" {...icon}><path d="M3 15l4.5-5 3.5 3 6-7" /><path d="M13 6h4v4" /></svg>),
  download: (<svg width="14" height="14" viewBox="0 0 20 20" {...icon}><path d="M10 3v10M6.5 9.5L10 13l3.5-3.5" /><path d="M4 15.5h12" /></svg>),
}

const TONE = {
  success: { bg: 'bg-success/10', text: 'text-success' },
  gold: { bg: 'bg-gold/10', text: 'text-gold' },
  danger: { bg: 'bg-danger/10', text: 'text-danger' },
}

function KPI({ label, value, tone, iconKey }) {
  return (
    <div className="border border-hairline bg-surface rounded-lg px-4 py-3 flex gap-3">
      <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${tone ? tone.bg : 'bg-ink/5'} ${tone ? tone.text : 'text-ink/60'}`}>
        {ICONS[iconKey]}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted truncate">{label}</div>
        <div className={`font-display text-lg mt-0.5 ${tone ? tone.text : 'text-ink'}`}>{value}</div>
      </div>
    </div>
  )
}

function Panel({ title, children, action }) {
  return (
    <div className="border border-hairline bg-surface rounded-lg p-5 mb-6 shadow-[0_1px_2px_rgba(20,43,39,0.03)]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-base">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function ExportButton({ onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-xs text-gold hover:underline">
      {ICONS.download} Export CSV
    </button>
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

const TABS = [
  { key: 'daily', label: 'Daily', icon: (<svg width="14" height="14" viewBox="0 0 20 20" {...icon}><rect x="3.5" y="4" width="13" height="12.5" rx="1.5" /><path d="M3.5 8h13M7 2.5v3M13 2.5v3" /></svg>) },
  { key: 'weekly', label: 'Weekly', icon: (<svg width="14" height="14" viewBox="0 0 20 20" {...icon}><rect x="3.5" y="4" width="13" height="12.5" rx="1.5" /><path d="M3.5 8h13M6.5 11h2M11.5 11h2M6.5 13.5h2" /></svg>) },
  { key: 'monthly', label: 'Monthly', icon: (<svg width="14" height="14" viewBox="0 0 20 20" {...icon}><rect x="3.5" y="4" width="13" height="12.5" rx="1.5" /><path d="M3.5 8h13" /><path d="M6.5 11h7M6.5 13.5h4" /></svg>) },
]

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
  const movementsThisMonth = movementsBetween(monthStart, monthEnd)
  const discrepanciesThisMonth = discrepanciesBetween(monthStart, monthEnd)

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

  // last 7 days added, for the weekly trend chart
  const dailyAddedTrend = []
  for (let i = 6; i >= 0; i--) {
    const d = iso(addDays(new Date(), -i))
    dailyAddedTrend.push({ name: d.slice(5), count: addedBetween(d, d).length })
  }

  const propertyLabel = currentPropertyId === 'all' ? 'All Properties' : (currentProperty?.name || 'Property')
  const fileSafe = (s) => s.replace(/\s+/g, '_').toLowerCase()

  const exportCurrentReport = () => {
    if (tab === 'daily') {
      downloadReportWorkbook(
        `daily_report_${today}_${fileSafe(propertyLabel)}.xlsx`,
        [
          ['Report', 'Daily'], ['Property', propertyLabel], ['Date', today],
          ['Total Assets', rows.length], ['Assets Added Today', addedToday.length],
          ['Maintenance Due Today', maintenanceDueBetween(today, today).length],
          ['Movements Logged Today', movementsBetween(today, today).length],
          ['Counts Logged Today', countsBetween(today, today).length],
          ['Discrepancies Today', discrepanciesBetween(today, today).length],
        ],
        [
          { name: 'Assets Added Today', rows: addedToday },
          { name: 'Movements Today', rows: movementsBetween(today, today) },
        ]
      )
    } else if (tab === 'weekly') {
      downloadReportWorkbook(
        `weekly_report_${weekStart}_to_${weekEnd}_${fileSafe(propertyLabel)}.xlsx`,
        [
          ['Report', 'Weekly'], ['Property', propertyLabel], ['Week', `${weekStart} to ${weekEnd}`],
          ['Total Assets', rows.length], ['Added This Week', addedThisWeek.length],
          ['Operational', rows.filter(r => r.status === 'Active').length],
          ['Deployed', rows.filter(r => r.status === 'In Use').length],
          ['Under Maintenance', rows.filter(r => r.status === 'Under Maintenance').length],
          ['Movements This Week', movementsBetween(weekStart, weekEnd).length],
        ],
        [
          { name: 'Status Summary', rows: STATUS_LIST.map(s => ({ status: s, count: rows.filter(r => r.status === s).length })) },
          { name: 'Warranty Expiring', rows: warrantyExpiringBetween(weekStart, weekEnd) },
          { name: 'Added This Week', rows: addedThisWeek },
        ]
      )
    } else {
      downloadReportWorkbook(
        `monthly_report_${monthStart.slice(0, 7)}_${fileSafe(propertyLabel)}.xlsx`,
        [
          ['Report', 'Monthly'], ['Property', propertyLabel], ['Month', `${monthStart} to ${monthEnd}`],
          ['Total Assets', rows.length], ['Added This Month', addedThisMonth.length],
          ['Disposed This Month', disposedThisMonth.length], ['Movements This Month', movementsThisMonth.length],
          ['Warranty Overdue', warrantyOverdue.length], ['Accumulated Depreciation', totalDepreciationMonth],
        ],
        [
          { name: 'Category Summary', rows: Object.entries(categoryTotals).map(([category, v]) => ({ category, count: v.count, purchase_cost: v.cost })) },
          { name: 'Top Locations', rows: topLocations },
          { name: 'Disposed This Month', rows: disposedThisMonth },
          { name: 'Discrepancies This Month', rows: discrepanciesThisMonth },
        ]
      )
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
        <h1 className="font-display text-2xl">Reports</h1>
        <button onClick={exportCurrentReport}
          className="flex items-center gap-2 px-3.5 py-2 text-sm rounded-md border border-hairline bg-surface hover:bg-hairline/20 transition-colors">
          {ICONS.download} Export {TABS.find(t => t.key === tab)?.label} Report
        </button>
      </div>
      <p className="text-sm text-muted mb-6">
        {currentPropertyId === 'all' ? 'All properties' : currentProperty?.name} · Report date: {today}
      </p>

      <div className="flex gap-1 mb-6 border-b border-hairline">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${tab === t.key ? 'border-gold text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
            <span className={tab === t.key ? 'text-gold' : ''}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'daily' && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <KPI iconKey="assets" label="Total Assets" value={rows.length} />
            <KPI iconKey="added" label="Assets Added Today" value={addedToday.length} />
            <KPI iconKey="maintenance" label="Maintenance Due Today" value={maintenanceDueBetween(today, today).length} tone={maintenanceDueBetween(today, today).length ? TONE.gold : undefined} />
            <KPI iconKey="movement" label="Movements Logged Today" value={movementsBetween(today, today).length} />
            <KPI iconKey="count" label="Counts Logged Today" value={countsBetween(today, today).length} />
            <KPI iconKey="discrepancy" label="Discrepancies Today" value={discrepanciesBetween(today, today).length} tone={discrepanciesBetween(today, today).length ? TONE.danger : undefined} />
          </div>

          <Panel title="Assets Added Today"
            action={addedToday.length > 0 && <ExportButton onClick={() => downloadCsv('assets_added_today.csv', addedToday)} />}>
            <ReportTable rows={addedToday} empty="No assets added today." />
          </Panel>

          <Panel title="Movements Logged Today"
            action={movementsBetween(today, today).length > 0 && <ExportButton onClick={() => downloadCsv('movements_today.csv', movementsBetween(today, today))} />}>
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
            <KPI iconKey="assets" label="Total Assets" value={rows.length} />
            <KPI iconKey="added" label="Added This Week" value={addedThisWeek.length} />
            <KPI iconKey="operational" label="Operational" value={rows.filter(r => r.status === 'Active').length} tone={TONE.success} />
            <KPI iconKey="deployed" label="Deployed" value={rows.filter(r => r.status === 'In Use').length} />
            <KPI iconKey="maintenance" label="Under Maintenance" value={rows.filter(r => r.status === 'Under Maintenance').length} tone={TONE.gold} />
            <KPI iconKey="movement" label="Movements This Week" value={movementsBetween(weekStart, weekEnd).length} />
          </div>

          <Panel title="Assets Added — Last 7 Days">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={dailyAddedTrend} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1DDCF" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5B6660' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#5B6660' }} allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                <Tooltip formatter={(v) => [v, 'Assets added']} />
                <Bar dataKey="count" fill="#B8902E" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

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
            <KPI iconKey="assets" label="Total Assets" value={rows.length} />
            <KPI iconKey="added" label="Added This Month" value={addedThisMonth.length} />
            <KPI iconKey="disposed" label="Disposed This Month" value={disposedThisMonth.length} tone={disposedThisMonth.length ? TONE.danger : undefined} />
            <KPI iconKey="movement" label="Movements This Month" value={movementsThisMonth.length} />
            <KPI iconKey="warranty" label="Warranty Overdue" value={warrantyOverdue.length} tone={warrantyOverdue.length ? TONE.danger : undefined} />
            <KPI iconKey="depreciation" label="Accumulated Depreciation" value={peso(totalDepreciationMonth)} />
          </div>

          <Panel title="Category Summary"
            action={Object.keys(categoryTotals).length > 0 && (
              <ExportButton onClick={() => downloadCsv('category_summary.csv',
                Object.entries(categoryTotals).map(([category, v]) => ({ category, count: v.count, purchase_cost: v.cost })))} />
            )}>
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
            <Panel title="Disposed This Month"
              action={disposedThisMonth.length > 0 && <ExportButton onClick={() => downloadCsv('disposed_this_month.csv', disposedThisMonth)} />}>
              <ul className="space-y-2 text-sm">
                {disposedThisMonth.map(r => (
                  <li key={r.id} className="flex justify-between"><span>{r.asset_code} — {r.asset_name}</span><span className="text-muted">{r.disposal_reason}</span></li>
                ))}
                {disposedThisMonth.length === 0 && <li className="text-muted text-center py-4">Nothing disposed this month.</li>}
              </ul>
            </Panel>
          </div>

          {discrepanciesThisMonth.length > 0 && (
            <Panel title="Discrepancies This Month" action={<ExportButton onClick={() => downloadCsv('discrepancies_this_month.csv', discrepanciesThisMonth)} />}>
              <ul className="space-y-2 text-sm">
                {discrepanciesThisMonth.map(c => (
                  <li key={c.id} className="flex justify-between">
                    <span>{c.asset_code} — {c.asset_name}</span>
                    <span className="text-danger">{c.discrepancy}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
    </div>
  )
}
