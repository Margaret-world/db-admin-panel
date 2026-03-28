import React, { useState } from 'react'
import { upsertKey } from '../../services/redisApi'

const TYPES = ['string', 'hash', 'list', 'set', 'zset']

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(2px)' },
  modal:   { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--border-radius-lg, 10px)', width: 520, maxWidth: 'calc(100vw - 48px)', maxHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 150ms ease' },
  header:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-light)' },
  title:   { fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' },
  close:   { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' },
  body:    { flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  row:     { display: 'flex', flexDirection: 'column', gap: 5 },
  label:   { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' },
  input:   { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '7px 10px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', width: '100%' },
  typeRow: { display: 'flex', gap: 6 },
  typeBtn: (active) => ({ padding: '5px 12px', borderRadius: 'var(--radius-sm)', border: active ? '1px solid var(--accent)' : '1px solid var(--border)', background: active ? 'var(--accent-dim)' : 'transparent', color: active ? 'var(--accent-text)' : 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer' }),
  textarea: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', width: '100%', minHeight: 80, resize: 'vertical', lineHeight: 1.6 },
  hint:    { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 3 },
  footer:  { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border-light)' },
  btnCancel: { padding: '6px 14px', borderRadius: 'var(--radius-sm)', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' },
  btnSave:   { padding: '6px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', border: '1px solid var(--accent)', color: '#fff', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' },
  error:   { background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', padding: '8px 12px', fontSize: 12, fontFamily: 'var(--font-mono)' },
}

export default function RedisUpsertModal({ db, onSave, onClose }) {
  const [key,     setKey]     = useState('')
  const [type,    setType]    = useState('string')
  const [ttl,     setTtl]     = useState('-1')
  const [strVal,  setStrVal]  = useState('')
  const [hashRaw, setHashRaw] = useState('field1: value1\nfield2: value2')
  const [listRaw, setListRaw] = useState('item1\nitem2\nitem3')
  const [zsetRaw, setZsetRaw] = useState('1.0 member1\n2.5 member2')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  const parseHashRaw = (raw) => {
    const map = {}
    raw.split('\n').forEach(line => {
      const idx = line.indexOf(':')
      if (idx === -1) return
      map[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    })
    return map
  }

  const parseListRaw = (raw) => raw.split('\n').map(l => l.trim()).filter(Boolean)

  const parseZsetRaw = (raw) =>
    raw.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const [score, ...rest] = l.split(' ')
      return { score: parseFloat(score), member: rest.join(' ') }
    })

  const handleSave = async () => {
    if (!key.trim()) { setError('Key name is required'); return }
    setSaving(true); setError(null)
    try {
      const payload = { key: key.trim(), type, ttl: parseInt(ttl, 10) || -1 }
      if (type === 'string') payload.stringValue = strVal
      if (type === 'hash')   payload.hashValue   = parseHashRaw(hashRaw)
      if (type === 'list' || type === 'set') payload.listValue = parseListRaw(listRaw)
      if (type === 'zset')   payload.zsetValue   = parseZsetRaw(zsetRaw)
      await upsertKey(db, payload)
      onSave()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.header}>
          <span style={s.title}>+ New key — db{db}</span>
          <button style={s.close} onClick={onClose}>×</button>
        </div>

        <div style={s.body}>
          {error && <div style={s.error}>{error}</div>}

          <div style={s.row}>
            <label style={s.label}>Key name</label>
            <input style={s.input} value={key} onChange={e => setKey(e.target.value)} placeholder="e.g. user:1001" />
          </div>

          <div style={s.row}>
            <label style={s.label}>Type</label>
            <div style={s.typeRow}>
              {TYPES.map(t => (
                <button key={t} style={s.typeBtn(type === t)} onClick={() => setType(t)}>{t}</button>
              ))}
            </div>
          </div>

          <div style={s.row}>
            <label style={s.label}>TTL (seconds) — -1 for no expiry</label>
            <input style={{ ...s.input, width: 120 }} value={ttl} onChange={e => setTtl(e.target.value)} />
          </div>

          {type === 'string' && (
            <div style={s.row}>
              <label style={s.label}>Value</label>
              <textarea style={s.textarea} value={strVal} onChange={e => setStrVal(e.target.value)} />
            </div>
          )}

          {type === 'hash' && (
            <div style={s.row}>
              <label style={s.label}>Fields (field: value — one per line)</label>
              <textarea style={s.textarea} value={hashRaw} onChange={e => setHashRaw(e.target.value)} />
              <span style={s.hint}>Example: username: alice</span>
            </div>
          )}

          {(type === 'list' || type === 'set') && (
            <div style={s.row}>
              <label style={s.label}>Members (one per line)</label>
              <textarea style={s.textarea} value={listRaw} onChange={e => setListRaw(e.target.value)} />
            </div>
          )}

          {type === 'zset' && (
            <div style={s.row}>
              <label style={s.label}>Members (score member — one per line)</label>
              <textarea style={s.textarea} value={zsetRaw} onChange={e => setZsetRaw(e.target.value)} />
              <span style={s.hint}>Example: 1.5 alice</span>
            </div>
          )}
        </div>

        <div style={s.footer}>
          <button style={s.btnCancel} onClick={onClose} disabled={saving}>Cancel</button>
          <button style={s.btnSave}   onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save key'}</button>
        </div>
      </div>
    </div>
  )
}
