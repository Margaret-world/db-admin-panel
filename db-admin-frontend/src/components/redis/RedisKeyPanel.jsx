import React, { useState } from 'react'
import { updateKeyTtl, deleteKey } from '../../services/redisApi'

const TYPE_COLOR = {
  string: '#4a9eff', hash: '#e8a020', list: '#3dba6f',
  set: '#c084fc', zset: '#f87171', stream: '#94a3b8',
}

const s = {
  wrap: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
    borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-surface)',
  },
  typeBadge: (type) => ({
    padding: '2px 9px', borderRadius: 'var(--radius-sm)', fontSize: 11,
    fontFamily: 'var(--font-mono)', fontWeight: 500,
    background: TYPE_COLOR[type] + '22', color: TYPE_COLOR[type],
    border: `1px solid ${TYPE_COLOR[type]}44`, flexShrink: 0,
  }),
  keyName: { fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  ttlWrap: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  ttlLabel: { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' },
  ttlInput: { width: 80, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 7px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', textAlign: 'right' },
  iconBtn: (color) => ({ padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: `1px solid ${color}44`, background: `${color}11`, color, fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', flexShrink: 0 }),
  body: { flex: 1, overflow: 'auto', padding: 16 },
  sizeNote: { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 10 },
  // string
  stringArea: { width: '100%', minHeight: 120, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 12, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', resize: 'vertical', lineHeight: 1.6 },
  // hash table
  table: { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 },
  th: { background: 'var(--bg-elevated)', padding: '7px 12px', textAlign: 'left', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' },
  td: { padding: '7px 12px', borderBottom: '1px solid var(--border-light)', color: 'var(--text-primary)', verticalAlign: 'top', wordBreak: 'break-all' },
  tdKey: { padding: '7px 12px', borderBottom: '1px solid var(--border-light)', color: 'var(--accent-text)', fontWeight: 500, whiteSpace: 'nowrap', verticalAlign: 'top' },
  // list / set items
  listWrap: { display: 'flex', flexDirection: 'column', gap: 4 },
  listItem: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' },
  listIdx: { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 28, paddingTop: 1, flexShrink: 0 },
  listVal: { fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', wordBreak: 'break-all', lineHeight: 1.5 },
  // zset
  scoreChip: { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--warning)', background: 'var(--warning-dim)', padding: '1px 6px', borderRadius: 8, flexShrink: 0, marginTop: 1 },
  // edit bar
  editBar: { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '10px 16px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-elevated)', flexShrink: 0 },
  btnSave: { padding: '6px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', border: '1px solid var(--accent)', color: '#fff', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' },
  empty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 },
  toast: (type) => ({ position: 'fixed', bottom: 24, right: 24, padding: '10px 18px', borderRadius: 'var(--radius-md)', background: type === 'error' ? 'var(--danger-dim)' : 'var(--success-dim)', border: `1px solid ${type === 'error' ? 'var(--danger)' : 'var(--success)'}`, color: type === 'error' ? 'var(--danger)' : 'var(--success)', fontSize: 12, fontFamily: 'var(--font-mono)', zIndex: 200 }),
}

function Toast({ msg, type, onClose }) {
  React.useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return <div style={s.toast(type)}>{msg}</div>
}

function formatTtl(ttl) {
  if (ttl === -1) return 'No expiry'
  if (ttl === -2) return 'Expired'
  return `${ttl}s`
}

export default function RedisKeyPanel({ db, detail, loading, onDeleted, onRefresh }) {
  const [ttlEdit, setTtlEdit] = useState(null)  // null = not editing
  const [toast,   setToast]   = useState(null)

  const showToast = (msg, type = 'success') => setToast({ msg, type })

  if (loading) return <div style={s.empty}><span className="spin" style={{ fontSize: 18 }}>◌</span><span>Loading…</span></div>
  if (!detail)  return <div style={s.empty}><span style={{ fontSize: 28, opacity: 0.15 }}>⬡</span><span>Select a key from the sidebar</span></div>

  const handleDeleteKey = async () => {
    if (!window.confirm(`Delete key "${detail.key}"?`)) return
    try {
      await deleteKey(db, detail.key)
      showToast('Key deleted')
      onDeleted()
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleSaveTtl = async () => {
    const val = parseInt(ttlEdit, 10)
    if (isNaN(val)) return
    try {
      await updateKeyTtl(db, detail.key, val)
      showToast('TTL updated')
      setTtlEdit(null)
      onRefresh()
    } catch (e) { showToast(e.message, 'error') }
  }

  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={s.header}>
        <span style={s.typeBadge(detail.type)}>{detail.type}</span>
        <span style={s.keyName} title={detail.key}>{detail.key}</span>

        {/* TTL display / edit */}
        <div style={s.ttlWrap}>
          <span style={s.ttlLabel}>TTL:</span>
          {ttlEdit !== null ? (
            <>
              <input style={s.ttlInput} value={ttlEdit} onChange={e => setTtlEdit(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveTtl()} autoFocus />
              <button style={s.iconBtn('#4a9eff')} onClick={handleSaveTtl}>✓</button>
              <button style={s.iconBtn('#94a3b8')} onClick={() => setTtlEdit(null)}>✕</button>
            </>
          ) : (
            <>
              <span style={{ ...s.ttlLabel, color: detail.ttl === -1 ? 'var(--success)' : 'var(--warning)' }}>
                {formatTtl(detail.ttl)}
              </span>
              <button style={s.iconBtn('#94a3b8')} onClick={() => setTtlEdit(String(detail.ttl))}>Edit TTL</button>
            </>
          )}
        </div>

        <button style={s.iconBtn('var(--danger)')} onClick={handleDeleteKey}>Delete</button>
      </div>

      {/* Value body */}
      <div style={s.body}>
        <div style={s.sizeNote}>
          {detail.type === 'string' && `${detail.size} bytes`}
          {detail.type === 'hash'   && `${detail.size} fields`}
          {detail.type === 'list'   && `${detail.size} items${detail.size > 500 ? ' (showing first 500)' : ''}`}
          {detail.type === 'set'    && `${detail.size} members`}
          {detail.type === 'zset'   && `${detail.size} members${detail.size > 500 ? ' (showing first 500)' : ''}`}
        </div>

        {detail.type === 'string' && (
          <textarea style={s.stringArea} defaultValue={detail.stringValue} readOnly />
        )}

        {detail.type === 'hash' && (
          <table style={s.table}>
            <thead><tr><th style={s.th}>Field</th><th style={s.th}>Value</th></tr></thead>
            <tbody>
              {Object.entries(detail.hashValue ?? {}).map(([f, v]) => (
                <tr key={f}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={s.tdKey}>{f}</td>
                  <td style={s.td}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {(detail.type === 'list' || detail.type === 'set') && (
          <div style={s.listWrap}>
            {(detail.listValue ?? []).map((v, i) => (
              <div key={i} style={s.listItem}>
                <span style={s.listIdx}>{i}</span>
                <span style={s.listVal}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {detail.type === 'zset' && (
          <table style={s.table}>
            <thead><tr><th style={s.th}>Rank</th><th style={s.th}>Member</th><th style={s.th}>Score</th></tr></thead>
            <tbody>
              {(detail.zsetValue ?? []).map((e, i) => (
                <tr key={i}
                  onMouseEnter={el => el.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={el => el.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...s.td, color: 'var(--text-muted)', width: 48 }}>{i}</td>
                  <td style={s.td}>{e.member}</td>
                  <td style={s.td}><span style={s.scoreChip}>{e.score}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
