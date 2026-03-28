import React from 'react'

const s = {
  sidebar: {
    width: 220,
    minWidth: 220,
    background: 'var(--bg-surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 16px 12px',
    borderBottom: '1px solid var(--border-light)',
  },
  dbLabel: {
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 6,
  },
  dbName: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--success)',
    flexShrink: 0,
    boxShadow: '0 0 6px var(--success)',
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    padding: '12px 16px 6px',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 0 12px',
  },
  item: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '7px 16px',
    cursor: 'pointer',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    background: active ? 'var(--bg-active)' : 'transparent',
    borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
    transition: 'all var(--transition)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
  }),
  tableIcon: {
    fontSize: 13,
    opacity: 0.5,
    flexShrink: 0,
  },
  tableName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  count: {
    fontSize: 10,
    color: 'var(--text-muted)',
    background: 'var(--bg-elevated)',
    padding: '1px 6px',
    borderRadius: 10,
    fontFamily: 'var(--font-mono)',
    flexShrink: 0,
  },
  loading: {
    padding: '20px 16px',
    color: 'var(--text-muted)',
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
  },
  footer: {
    padding: '10px 16px',
    borderTop: '1px solid var(--border-light)',
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
  },
}

export default function Sidebar({ tables, loading, selected, onSelect }) {
  return (
    <aside style={s.sidebar}>
      <div style={s.header}>
        <div style={s.dbLabel}>Connected to</div>
        <div style={s.dbName}>
          <span style={s.dot} />
          MariaDB
        </div>
      </div>

      <div style={s.sectionLabel}>Tables</div>

      <div style={s.list}>
        {loading && <div style={s.loading}>Loading…</div>}
        {!loading &&
          tables.map((t) => (
            <div
              key={t.tableName}
              style={s.item(selected === t.tableName)}
              onClick={() => onSelect(t.tableName)}
            >
              <span style={s.tableIcon}>▤</span>
              <span style={s.tableName} title={t.tableName}>
                {t.tableName}
              </span>
              <span style={s.count}>{t.rowCount ?? '—'}</span>
            </div>
          ))}
      </div>

      <div style={s.footer}>{tables.length} tables</div>
    </aside>
  )
}
