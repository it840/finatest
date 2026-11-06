import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProperty } from '../lib/PropertyContext'
import { matchesQuery } from '../lib/tableUtils'
import { forProperty } from '../lib/propertyScope'
import { parseAssetCode } from '../lib/qr'
import QrScanner from '../components/QrScanner'
import Pagination from '../components/Pagination'

const STATUS_STYLE = {
  'In Transit': 'bg-[#FAEEDA] text-[#633806] border-[#EF9F27]',
  'Received': 'bg-[#EAF3DE] text-[#27500A] border-[#97C459]',
  'Cancelled': 'bg-hairline/50 text-muted border-hairline',
}

function StatusPill({ status }) {
  return <span className={`inline-block text-xs font-medium rounded-full px-2 border ${STATUS_STYLE[status] || ''}`}>{status}</span>
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1">{label}</span>
      {children}
    </label>
  )
}

// Details shown so the person can compare the screen with the physical item
function AssetCard({ asset, verified }) {
  const rows = [
    ['Brand', asset.brand], ['Model', asset.model], ['Serial #', asset.serial_number],
    ['Category', asset.category], ['Quantity', asset.qty], ['Location', asset.location],
  ]
  return (
    <div className={`border rounded-lg p-3 flex gap-3 ${verified ? 'border-[#97C459] bg-[#F4FAEC]' : 'border-hairline bg-surface'}`}>
      {asset.photo_url
        ? <img src={asset.photo_url} alt="" className="h-20 w-20 rounded border border-hairline object-cover flex-shrink-0" />
        : <div className="h-20 w-20 rounded border border-dashed border-hairline flex items-center justify-center text-[10px] text-muted flex-shrink-0">No photo</div>}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium truncate">{asset.asset_name} <span className="text-muted font-normal">· {asset.asset_code}</span></div>
          {verified && <span className="text-xs font-medium text-[#27500A] whitespace-nowrap">✓ Verified ({verified === 'qr' ? 'QR scan' : 'ID typed'})</span>}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1.5 text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="truncate"><span className="text-muted">{k}: </span>{v === null || v === undefined || v === '' ? '—' : String(v)}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Camera scan + typed-ID fallback. The parent decides whether the code is the right asset.
function ScanBox({ onCode, message, verified }) {
  const [scanning, setScanning] = useState(false)
  const [manual, setManual] = useState('')
  useEffect(() => { if (verified) setScanning(false) }, [verified])

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap items-center">
        <button type="button" onClick={() => setScanning(s => !s)} className="px-3 py-2 text-sm bg-theme-accent text-white rounded hover:bg-theme-accent/90">
          {scanning ? 'Stop camera' : 'Scan QR code with camera'}
        </button>
        <span className="text-xs text-muted">or type the Asset ID:</span>
        <input value={manual} onChange={e => setManual(e.target.value)} placeholder="Asset-007" className="input w-36"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (manual.trim()) onCode(parseAssetCode(manual), 'manual') } }} />
        <button type="button" onClick={() => manual.trim() && onCode(parseAssetCode(manual), 'manual')} className="px-3 py-2 text-sm border border-hairline rounded hover:bg-theme-hover">Verify</button>
      </div>
      {scanning && <QrScanner onScan={text => onCode(parseAssetCode(text), 'qr')} />}
      {message && (
        <div className={`text-sm rounded p-2 border ${message.ok ? 'border-[#97C459] bg-[#F4FAEC] text-[#27500A]' : 'border-[#E24B4A] bg-[#FCEBEB] text-[#791F1F]'}`}>{message.text}</div>
      )}
    </div>
  )
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 bg-ink/40 flex items-start justify-center overflow-y-auto py-10 z-50 px-4">
      <div className={`bg-surface rounded-xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} p-6 space-y-4`}>
        <div className="flex items-start justify-between">
          <h2 className="font-display text-xl">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function SendModal({ assets, properties, currentPropertyId, onClose, onDone }) {
  const [assetId, setAssetId] = useState('')
  const [toPropertyId, setToPropertyId] = useState('')
  const [remarks, setRemarks] = useState('')
  const [verified, setVerified] = useState(null)
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const eligible = assets.filter(a =>
    Number(a.registered_qty) > 0 && a.status !== 'In Transit' &&
    (currentPropertyId === 'all' || a.property_id === currentPropertyId))
  const asset = eligible.find(a => String(a.id) === String(assetId))
  const destinations = properties.filter(p => !asset || p.id !== asset.property_id)

  const handleCode = (code, method) => {
    const found = eligible.find(a => (a.asset_code || '').toLowerCase() === code.toLowerCase())
    if (!found) {
      setMsg({ ok: false, text: `No transferable asset "${code}" found. It may have nothing on hand, already be in transit, or belong to another property.` })
      return
    }
    if (assetId && String(found.id) !== String(assetId)) {
      setMsg({ ok: false, text: `That code is ${found.asset_code} — ${found.asset_name}, not the asset you selected. Check you have the right item.` })
      return
    }
    setAssetId(String(found.id))
    setVerified(method)
    setMsg({ ok: true, text: `Verified: ${found.asset_code} — ${found.asset_name}` })
    if (String(toPropertyId) === String(found.property_id)) setToPropertyId('')
  }

  const send = async () => {
    setSaving(true); setError('')
    const { error } = await supabase.rpc('send_asset_transfer', {
      p_asset_id: Number(assetId), p_to_property_id: Number(toPropertyId), p_remarks: remarks, p_method: verified,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    onDone()
  }

  return (
    <Modal title="New transfer" onClose={onClose} wide>
      <p className="text-sm text-muted">
        Pick the asset and the property it is going to, then scan the asset's QR code to confirm you have the right item.
        The whole quantity on hand moves together.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Asset">
          <select value={assetId} onChange={e => { setAssetId(e.target.value); setVerified(null); setMsg(null) }} className="input">
            <option value="">Select asset…</option>
            {eligible.map(a => <option key={a.id} value={a.id}>{a.asset_code} — {a.asset_name}</option>)}
          </select>
        </Field>
        <Field label="Send to property">
          <select value={toPropertyId} onChange={e => setToPropertyId(e.target.value)} className="input">
            <option value="">Select property…</option>
            {destinations.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Remarks (optional)">
        <input value={remarks} onChange={e => setRemarks(e.target.value)} className="input" placeholder="Reason for the transfer, who is carrying it…" />
      </Field>

      <div className="border-t border-hairline pt-4 space-y-3">
        <div className="text-sm font-medium">Verify the asset</div>
        <ScanBox onCode={handleCode} message={msg} verified={verified} />
        {asset && <AssetCard asset={{ ...asset, qty: asset.registered_qty }} verified={verified} />}
      </div>

      {error && <div className="text-sm text-danger">{error}</div>}
      <div className="flex justify-end gap-3 pt-2 border-t border-hairline">
        <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-ink">Cancel</button>
        <button onClick={send} disabled={saving || !assetId || !toPropertyId || !verified}
          className="px-4 py-2 text-sm bg-theme-accent text-white rounded hover:bg-theme-accent/90 disabled:opacity-50">
          {saving ? 'Sending…' : 'Send transfer'}
        </button>
      </div>
      {!verified && assetId && <div className="text-xs text-muted text-right -mt-2">Scan the QR code (or type the Asset ID) to enable sending.</div>}
    </Modal>
  )
}

function ReceiveModal({ transfer: t, locations, departments, onClose, onDone }) {
  const [verified, setVerified] = useState(null)
  const [msg, setMsg] = useState(null)
  const [toLocation, setToLocation] = useState('')
  const [department, setDepartment] = useState('')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleCode = (code, method) => {
    if ((code || '').toLowerCase() === (t.asset_code || '').toLowerCase()) {
      setVerified(method)
      setMsg({ ok: true, text: `Verified: ${t.asset_code} — ${t.asset_name} matches this transfer.` })
    } else {
      setVerified(null)
      setMsg({ ok: false, text: `That code is ${code}, but this transfer is for ${t.asset_code} — ${t.asset_name}. Do not receive this item.` })
    }
  }

  const receive = async () => {
    setSaving(true); setError('')
    const { error } = await supabase.rpc('receive_asset_transfer', {
      p_transfer_id: t.id, p_to_location: toLocation, p_department: department, p_method: verified, p_remarks: remarks,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    onDone()
  }

  return (
    <Modal title={`Receive ${t.transfer_code}`} onClose={onClose} wide>
      <p className="text-sm text-muted">
        From <b>{t.from_property_name}</b> to <b>{t.to_property_name}</b>, sent {new Date(t.sent_at).toLocaleString()}
        {t.sent_by_name ? ` by ${t.sent_by_name}` : ''}.{t.send_remarks ? ` Note: ${t.send_remarks}` : ''}
      </p>
      <div className="space-y-3">
        <div className="text-sm font-medium">Scan the item you are holding</div>
        <ScanBox onCode={handleCode} message={msg} verified={verified} />
        <AssetCard asset={{ ...t, qty: t.qty, location: t.from_location }} verified={verified} />
      </div>
      <div className="grid grid-cols-2 gap-4 border-t border-hairline pt-4">
        <Field label={`Location in ${t.to_property_name}`}>
          <select value={toLocation} onChange={e => setToLocation(e.target.value)} className="input">
            <option value="">Select location…</option>
            {forProperty(locations, t.to_property_id).map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
          </select>
        </Field>
        <Field label="Department (optional)">
          <select value={department} onChange={e => setDepartment(e.target.value)} className="input">
            <option value="">—</option>
            {forProperty(departments, t.to_property_id).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Remarks (optional)">
        <input value={remarks} onChange={e => setRemarks(e.target.value)} className="input" placeholder="Condition on arrival, anything missing…" />
      </Field>
      {error && <div className="text-sm text-danger">{error}</div>}
      <div className="flex justify-end gap-3 pt-2 border-t border-hairline">
        <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-ink">Close</button>
        <button onClick={receive} disabled={saving || !verified || !toLocation}
          className="px-4 py-2 text-sm bg-theme-accent text-white rounded hover:bg-theme-accent/90 disabled:opacity-50">
          {saving ? 'Receiving…' : 'Confirm received'}
        </button>
      </div>
    </Modal>
  )
}

function CancelModal({ transfer: t, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const cancel = async () => {
    setSaving(true); setError('')
    const { error } = await supabase.rpc('cancel_asset_transfer', { p_transfer_id: t.id, p_reason: reason })
    setSaving(false)
    if (error) { setError(error.message); return }
    onDone()
  }
  return (
    <Modal title={`Cancel ${t.transfer_code}?`} onClose={onClose}>
      <p className="text-sm text-muted">
        {t.asset_code} — {t.asset_name} stays in {t.from_property_name}, and its status goes back to {t.status_before || 'Active'}.
      </p>
      <Field label="Reason (optional)"><input value={reason} onChange={e => setReason(e.target.value)} className="input" /></Field>
      {error && <div className="text-sm text-danger">{error}</div>}
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-ink">Keep transfer</button>
        <button onClick={cancel} disabled={saving} className="px-4 py-2 text-sm bg-danger text-white rounded hover:bg-danger/90 disabled:opacity-50">
          {saving ? 'Cancelling…' : 'Cancel transfer'}
        </button>
      </div>
    </Modal>
  )
}

const VERIFY_LABEL = { qr: 'QR', manual: 'ID typed' }

export default function Transfers({ profile }) {
  const canWrite = profile?.role === 'admin' || profile?.role === 'manager'
  const { currentPropertyId, currentProperty, properties } = useProperty()
  const [rows, setRows] = useState([])
  const [assets, setAssets] = useState([])
  const [locations, setLocations] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('incoming')
  const [statusFilter, setStatusFilter] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(30)
  const [sending, setSending] = useState(false)
  const [receiving, setReceiving] = useState(null)
  const [cancelling, setCancelling] = useState(null)

  const load = async () => {
    setLoading(true)
    const [t, a, l, d] = await Promise.all([
      supabase.from('asset_transfers_computed').select('*').order('sent_at', { ascending: false }),
      supabase.from('assets_computed').select('id, asset_code, asset_name, brand, model, serial_number, category, photo_url, registered_qty, location, actual_location, condition, status, property_id'),
      supabase.from('locations').select('*').order('name'),
      supabase.from('departments').select('*').order('name'),
    ])
    setRows(t.data || [])
    setAssets(a.data || [])
    setLocations(l.data || [])
    setDepartments(d.data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  useEffect(() => { setPage(0) }, [tab, statusFilter, query, currentPropertyId])

  const all = currentPropertyId === 'all'
  const incoming = rows.filter(t => all || t.to_property_id === currentPropertyId)
  const outgoing = rows.filter(t => all || t.from_property_id === currentPropertyId)
  const waiting = incoming.filter(t => t.status === 'In Transit').length
  const onTheWay = outgoing.filter(t => t.status === 'In Transit').length

  const base = tab === 'incoming' ? incoming : tab === 'outgoing' ? outgoing : rows.filter(t => all || t.from_property_id === currentPropertyId || t.to_property_id === currentPropertyId)
  const filtered = base.filter(t =>
    (!statusFilter || t.status === statusFilter) &&
    (!query || matchesQuery(query, [
      t.transfer_code, t.asset_code, t.asset_name, t.brand, t.serial_number, t.qty, t.from_property_name, t.to_property_name,
      t.status, t.from_location, t.to_location, t.sent_by_name, t.received_by_name, t.send_remarks, t.receive_remarks,
      new Date(t.sent_at).toISOString().slice(0, 10),
    ])))
  const pageRows = filtered.slice(page * pageSize, page * pageSize + pageSize)

  const canReceive = (t) => canWrite && t.status === 'In Transit' && (all || t.to_property_id === currentPropertyId)
  const done = () => { setSending(false); setReceiving(null); setCancelling(null); load() }

  if (loading) return <div className="text-muted text-sm">Loading transfers…</div>

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
        <h1 className="font-display text-2xl">Asset Transfers</h1>
        {canWrite && (
          <button onClick={() => setSending(true)} className="px-4 py-2 text-sm bg-theme-accent text-white rounded hover:bg-theme-accent/90">
            New transfer
          </button>
        )}
      </div>
      <p className="text-sm text-muted mb-1">
        {all ? 'All properties' : currentProperty?.name} · Move an asset to another property. Scan its QR code to verify it when sending, and again when receiving.
      </p>
      <p className="text-sm text-muted mb-5">{waiting} waiting to be received · {onTheWay} on the way out</p>

      <div className="flex gap-1 mb-4 border-b border-hairline">
        {[['incoming', `Incoming${waiting ? ` (${waiting})` : ''}`], ['outgoing', 'Outgoing'], ['all', 'All']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${tab === k ? 'border-theme-accent text-ink font-medium' : 'border-transparent text-muted hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input placeholder="Search any column…" value={query} onChange={e => setQuery(e.target.value)} className="input flex-1 min-w-[200px]" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">All statuses</option>
          <option>In Transit</option><option>Received</option><option>Cancelled</option>
        </select>
      </div>

      <div className="overflow-x-auto border border-hairline rounded scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="bg-theme-active text-theme-text text-xs uppercase tracking-wide">
            <tr>
              {['Transfer', 'Sent', 'Asset', 'Qty', 'From', 'To', 'Status', 'Verified', 'Sent by', ''].map(h => (
                <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(t => (
              <tr key={t.id} className="border-t border-hairline hover:bg-hairline/20">
                <td className="px-3 py-2 whitespace-nowrap font-medium">{t.transfer_code}</td>
                <td className="px-3 py-2 whitespace-nowrap">{new Date(t.sent_at).toLocaleString()}</td>
                <td className="px-3 py-2 whitespace-nowrap">{t.asset_code} — {t.asset_name}</td>
                <td className="px-3 py-2 whitespace-nowrap">{Number(t.qty).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td className="px-3 py-2 whitespace-nowrap">{t.from_property_name}<span className="block text-xs text-muted">{t.from_location}</span></td>
                <td className="px-3 py-2 whitespace-nowrap">{t.to_property_name}<span className="block text-xs text-muted">{t.to_location}</span></td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <StatusPill status={t.status} />
                  {t.status === 'Received' && t.received_at && <span className="block text-xs text-muted">{new Date(t.received_at).toLocaleString()}{t.received_by_name ? ` · ${t.received_by_name}` : ''}</span>}
                  {t.status === 'Cancelled' && t.cancel_reason && <span className="block text-xs text-muted">{t.cancel_reason}</span>}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs">
                  <span className="block">Sent: {t.send_verified_method ? `✓ ${VERIFY_LABEL[t.send_verified_method]}` : '—'}</span>
                  <span className="block">Received: {t.receive_verified_method ? `✓ ${VERIFY_LABEL[t.receive_verified_method]}` : '—'}</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{t.sent_by_name}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {canReceive(t) && <button onClick={() => setReceiving(t)} className="px-3 py-1 text-xs bg-theme-accent text-white rounded hover:bg-theme-accent/90 mr-2">Receive</button>}
                  {canWrite && t.status === 'In Transit' && <button onClick={() => setCancelling(t)} className="text-xs text-danger hover:underline">Cancel</button>}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && <tr><td colSpan={10} className="px-3 py-6 text-center text-muted">No transfers here yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalCount={filtered.length} />

      {sending && <SendModal assets={assets} properties={properties} currentPropertyId={currentPropertyId} onClose={() => setSending(false)} onDone={done} />}
      {receiving && <ReceiveModal transfer={receiving} locations={locations} departments={departments} onClose={() => setReceiving(null)} onDone={done} />}
      {cancelling && <CancelModal transfer={cancelling} onClose={() => setCancelling(null)} onDone={done} />}
    </div>
  )
}
