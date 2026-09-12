import React from 'react'

const PAGE_SIZE_OPTIONS = [30, 40, 50, 100]

export default function Pagination({ page, setPage, pageSize, setPageSize, totalCount }) {
  if (totalCount === 0) return null

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const rangeStart = page * pageSize + 1
  const rangeEnd = Math.min(totalCount, page * pageSize + pageSize)

  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-hairline text-sm flex-wrap gap-3">
      <div className="flex items-center gap-3 text-muted">
        <span>Showing {rangeStart}–{rangeEnd} of {totalCount}</span>
        <label className="flex items-center gap-1.5">
          <span>Per page</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(0) }}
            className="border border-hairline rounded px-2 py-1 text-sm bg-surface focus:outline-none focus:ring-1 focus:ring-gold"
          >
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-3 py-1.5 rounded border border-hairline hover:bg-hairline/20 disabled:opacity-40 disabled:cursor-not-allowed">
          Previous
        </button>
        <span className="text-muted">Page {page + 1} of {totalPages}</span>
        <button
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          className="px-3 py-1.5 rounded border border-hairline hover:bg-hairline/20 disabled:opacity-40 disabled:cursor-not-allowed">
          Next
        </button>
      </div>
    </div>
  )
}
