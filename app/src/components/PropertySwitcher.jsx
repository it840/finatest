import React, { useState, useRef, useEffect } from 'react'
import { useProperty } from '../lib/PropertyContext'

function resolveLogo(url) {
  if (!url) return null
  if (/^https?:\/\//.test(url)) return url
  return `${import.meta.env.BASE_URL}${url.replace(/^\//, '')}`
}

export default function PropertySwitcher() {
  const { properties, currentPropertyId, currentProperty, selectProperty, loading } = useProperty()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (loading) return null

  const filtered = properties.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
  const label = currentPropertyId === 'all' ? 'All Properties' : currentProperty?.name || 'Select property'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded border border-white/15 bg-white/5 hover:bg-white/10 transition-colors text-left"
      >
        {currentProperty?.logo_url ? (
          <img src={resolveLogo(currentProperty.logo_url)} alt="" className="h-5 w-5 rounded-full object-contain bg-white flex-shrink-0" />
        ) : (
          <span className="h-5 w-5 rounded-full bg-gold/80 flex items-center justify-center text-[10px] font-medium flex-shrink-0">
            {currentPropertyId === 'all' ? '∀' : '?'}
          </span>
        )}
        <span className="text-sm truncate flex-1">{label}</span>
        <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-surface text-ink rounded shadow-xl border border-hairline z-50 overflow-hidden">
          <div className="px-4 pt-3 pb-2 text-xs text-muted uppercase tracking-wide">Current Property</div>
          <button
            onClick={() => { selectProperty('all'); setOpen(false) }}
            className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-hairline/30 ${currentPropertyId === 'all' ? 'bg-hairline/20' : ''}`}
          >
            <span className="h-8 w-8 rounded-full bg-ink text-paper flex items-center justify-center text-xs flex-shrink-0">All</span>
            <div>
              <div className="text-sm font-medium">All Properties</div>
              <div className="text-xs text-muted">View everything at once</div>
            </div>
          </button>

          <div className="px-4 pb-2 pt-1">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search properties"
              className="input"
            />
          </div>

          <div className="max-h-56 overflow-y-auto border-t border-hairline">
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => { selectProperty(p.id); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-hairline/30 ${currentPropertyId === p.id ? 'bg-hairline/20' : ''}`}
              >
                {p.logo_url ? (
                  <img src={resolveLogo(p.logo_url)} alt="" className="h-7 w-7 rounded-full object-contain bg-white border border-hairline flex-shrink-0" />
                ) : (
                  <span className="h-7 w-7 rounded-full bg-hairline flex-shrink-0" />
                )}
                <span className="text-sm">{p.name}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="px-4 py-4 text-sm text-muted text-center">No properties found.</div>}
          </div>
        </div>
      )}
    </div>
  )
}
