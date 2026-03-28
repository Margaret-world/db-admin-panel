import React, { useState } from 'react'

const TYPE_COLOR = {
  string: '#4a9eff',
  hash:   '#e8a020',
  list:   '#3dba6f',
  set:    '#c084fc',
  zset:   '#f87171',
  stream: '#94a3b8',
}

const s = {
  wrap: { width: 260, minWidth: 260, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', background: 'var(--bg-surface)', overflow: 'hidden' },
  dbBar: { borderBottom: '1px solid var(--border)', padding: '10px 10px 8px', flexShrink: 0 },
  dbLabel: { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 },
  dbGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 },
  dbBtn: (active, hasKeys) => ({
    padding: '4px 2px', textAlign: 'center', borderRadius: 'var(--radius-sm)',
    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
    background: active ? 'var(--accent-dim)' : 'transparent',
    color: active ? 'var(--accent-text)' : hasKeys ? 'var(--text-secondary)' : 'var(--text-muted)',
    fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer',
    opacity: hasKeys ? 1 : 0.4,
    position: 'relative',
  }),
  dbCount: { fontSize: 9, color: 'var(--text-muted)', display: 'block', marginTop: 1 },
  searchRow: { display: 'flex', gap: 6, padding: '8px 10px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 },
  searchInput: {
    flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '5px 8px',
    fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)',
  },
  scanBtn: {
    padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
    background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
    fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', flexShrink: 0,
  },
  keyList: { flex: 1, overflowY: 'auto' },
  keyItem: (active) => ({
    display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px',
    cursor: 'pointer', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
    background: active ? 'var(--bg-active)' : 'transparent',
    transition: 'all var(--transition)',
  }),
  typeDot: (type) => ({
    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
    background: TYPE_COLOR[type] || '#94a3b8',
  }),
  keyName: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' },
  keyTtl: { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', flexShrink: 0 },
  footer: { padding: '7px 10px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-elevated)', display: 'flex', gap: 8, alignItems: 'center' },
  footerText: { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', flex: 1 },
  moreBtn: {
    padding: '3px 8px', fontSize: 10, fontFamily: 'var(--font-mono)',
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
  },
  empty: { padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 },
}

function formatTtl(ttl) {
  if (ttl === -1) return '∞'
  if (ttl === -2) return '—'
  if (ttl < 60)   return `${ttl}s`
  if (ttl < 3600) return `${Math.floor(ttl / 60)}m`
  return `${Math.floor(ttl / 3600)}h`
}

export default function RedisDbSidebar({
  dbSizes, selectedDb, onSelectDb,
  keys, keyPage, selectedKey, onSelectKey,
  pattern, onPatternChange, onScan, onLoadMore,
  loading,
}) {
  return (
    <div style={s.wrap}>
      {/* DB grid */}
      <div style={s.dbBar}>
        <div style={s.dbLabel}>Select DB</div>
        <div style={s.dbGrid}>
          {Array.from({ length: 16 }, (_, i) => {
            const count = dbSizes?.[i] ?? 0
            return (
              <button key={i} style={s.dbBtn(selectedDb === i, count > 0)} onClick={() => onSelectDb(i)}>
                {i}
                <span style={s.dbCount}>{count > 0 ? count : '—'}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Pattern search */}
      <div style={s.searchRow}>
        <input style={s.searchInput} value={pattern} placeholder="Pattern: * or user:*"
          onChange={e => onPatternChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onScan()}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button style={s.scanBtn} onClick={onScan}>Scan</button>
      </div>

      {/* Key list */}
      <div style={s.keyList}>
        {loading && <div style={s.empty}>Scanning…</div>}
        {!loading && keys.length === 0 && <div style={s.empty}>No keys found</div>}
        {!loading && keys.map(k => (
          <div key={k.key} style={s.keyItem(selectedKey === k.key)}
            onClick={() => onSelectKey(k.key)}
            onMouseEnter={e => { if (selectedKey !== k.key) e.currentTarget.style.background = 'var(--bg-hover)' }}
            onMouseLeave={e => { if (selectedKey !== k.key) e.currentTarget.style.background = 'transparent' }}
          >
            <span style={s.typeDot(k.type)} title={k.type} />
            <span style={s.keyName} title={k.key}>{k.key}</span>
            <span style={s.keyTtl}>{formatTtl(k.ttl)}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={s.footer}>
        <span style={s.footerText}>{keys.length} / {keyPage?.dbSize ?? 0} keys</span>
        {keyPage && !keyPage.complete && (
          <button style={s.moreBtn} onClick={onLoadMore}>+ more</button>
        )}
      </div>
    </div>
  )
}
