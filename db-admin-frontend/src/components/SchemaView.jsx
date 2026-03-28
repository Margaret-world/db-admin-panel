import React from 'react'

const s = {
  wrap: { overflowX: 'auto', flex: 1 },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
  },
  th: {
    position: 'sticky',
    top: 0,
    background: 'var(--bg-elevated)',
    padding: '9px 16px',
    textAlign: 'left',
    fontWeight: 500,
    fontSize: 10,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '9px 16px',
    borderBottom: '1px solid var(--border-light)',
    color: 'var(--text-primary)',
    verticalAlign: 'middle',
  },
  colName: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  typeBadge: {
    background: 'var(--bg-elevated)',
    color: 'var(--accent-text)',
    padding: '2px 7px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 11,
  },
  badge: (color, bg) => ({
    background: bg,
    color: color,
    padding: '2px 7px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.05em',
  }),
  commentCell: {
    color: 'var(--text-muted)',
    fontSize: 11,
    fontStyle: 'italic',
  },
}

export default function SchemaView({ columns }) {
  if (!columns || columns.length === 0) {
    return (
      <div style={{ padding: 32, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        No columns found.
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Column</th>
            <th style={s.th}>Type</th>
            <th style={s.th}>Key</th>
            <th style={s.th}>Nullable</th>
            <th style={s.th}>Default</th>
            <th style={s.th}>Extra</th>
            <th style={s.th}>Comment</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((col) => (
            <tr key={col.name} style={{ transition: 'background var(--transition)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td style={s.td}>
                <div style={s.colName}>{col.name}</div>
              </td>
              <td style={s.td}>
                <span style={s.typeBadge}>{col.type}</span>
              </td>
              <td style={s.td}>
                {col.primaryKey && (
                  <span style={s.badge('#82c0ff', 'var(--accent-dim)')}>PK</span>
                )}
                {col.keyType === 'MUL' && (
                  <span style={s.badge('#6fcf97', 'var(--success-dim)')}>IDX</span>
                )}
                {col.keyType === 'UNI' && (
                  <span style={s.badge('#e8a020', 'var(--warning-dim)')}>UNI</span>
                )}
              </td>
              <td style={{ ...s.td, color: col.nullable ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                {col.nullable ? 'YES' : 'NO'}
              </td>
              <td style={{ ...s.td, color: 'var(--text-muted)' }}>
                {col.defaultValue || <span style={{ opacity: 0.4 }}>null</span>}
              </td>
              <td style={{ ...s.td, color: 'var(--text-muted)' }}>
                {col.extra || '—'}
              </td>
              <td style={{ ...s.td, ...s.commentCell }}>
                {col.comment || ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
