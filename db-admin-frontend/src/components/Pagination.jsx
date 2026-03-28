import React from 'react'

const s = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  btn: (active, disabled) => ({
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
    background: active ? 'var(--accent-dim)' : 'transparent',
    color: active ? 'var(--accent-text)' : disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'all var(--transition)',
    minWidth: 30,
    textAlign: 'center',
  }),
  ellipsis: {
    padding: '4px 6px',
    color: 'var(--text-muted)',
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
  },
}

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  const pages = []
  const delta = 2
  const left  = Math.max(2, page - delta)
  const right = Math.min(totalPages - 1, page + delta)

  pages.push(1)
  if (left > 2) pages.push('…')
  for (let i = left; i <= right; i++) pages.push(i)
  if (right < totalPages - 1) pages.push('…')
  if (totalPages > 1) pages.push(totalPages)

  return (
    <div style={s.wrap}>
      <button style={s.btn(false, page === 1)} disabled={page === 1} onClick={() => onChange(page - 1)}>
        ‹
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} style={s.ellipsis}>…</span>
        ) : (
          <button
            key={p}
            style={s.btn(p === page, false)}
            onClick={() => p !== page && onChange(p)}
          >
            {p}
          </button>
        )
      )}

      <button style={s.btn(false, page === totalPages)} disabled={page === totalPages} onClick={() => onChange(page + 1)}>
        ›
      </button>
    </div>
  )
}
