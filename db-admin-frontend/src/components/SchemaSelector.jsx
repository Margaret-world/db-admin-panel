import React, { useRef, useState, useEffect } from 'react'

const s = {
  wrap: { position: 'relative' },
  trigger: (open) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '4px 10px 4px 10px',
    background: open ? 'var(--bg-active)' : 'var(--bg-elevated)',
    border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    transition: 'all var(--transition)',
    minWidth: 160,
    userSelect: 'none',
  }),
  schemaIcon: { fontSize: 12, color: 'var(--accent-text)', flexShrink: 0 },
  schemaName: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  chevron: (open) => ({
    fontSize: 10,
    color: 'var(--text-muted)',
    transition: 'transform var(--transition)',
    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
    flexShrink: 0,
  }),
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    minWidth: 200,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    zIndex: 50,
    overflow: 'hidden',
    animation: 'fadeIn 120ms ease',
  },
  dropdownHeader: {
    padding: '8px 12px 6px',
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    borderBottom: '1px solid var(--border-light)',
  },
  option: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: active ? 'var(--accent-text)' : 'var(--text-secondary)',
    background: active ? 'var(--bg-active)' : 'transparent',
    borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
    transition: 'all var(--transition)',
  }),
  dot: (active) => ({
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: active ? 'var(--accent)' : 'var(--text-muted)',
    flexShrink: 0,
    boxShadow: active ? '0 0 5px var(--accent)' : 'none',
  }),
  loading: {
    padding: '10px 12px',
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
  },
}

export default function SchemaSelector({ schemas, selected, loading, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (s) => { onChange(s); setOpen(false) }

  return (
    <div style={s.wrap} ref={ref}>
      <div style={s.trigger(open)} onClick={() => setOpen((o) => !o)}>
        <span style={s.schemaIcon}>◈</span>
        <span style={s.schemaName}>{selected || 'Select schema'}</span>
        <span style={s.chevron(open)}>▾</span>
      </div>

      {open && (
        <div style={s.dropdown}>
          <div style={s.dropdownHeader}>Schemas</div>
          {loading ? (
            <div style={s.loading}>Loading…</div>
          ) : schemas.length === 0 ? (
            <div style={s.loading}>No schemas available</div>
          ) : (
            schemas.map((sc) => (
              <div
                key={sc}
                style={s.option(sc === selected)}
                onClick={() => select(sc)}
                onMouseEnter={(e) => {
                  if (sc !== selected) e.currentTarget.style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={(e) => {
                  if (sc !== selected) e.currentTarget.style.background = 'transparent'
                }}
              >
                <span style={s.dot(sc === selected)} />
                {sc}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
