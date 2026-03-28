import React, { useState } from 'react'
import { publishMessage } from '../../services/kafkaApi'

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(2px)' },
  modal:   { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, width: 520, maxWidth: 'calc(100vw - 48px)', maxHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 150ms ease' },
  header:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-light)' },
  title:   { fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' },
  close:   { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' },
  body:    { flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  row:     { display: 'flex', flexDirection: 'column', gap: 5 },
  rowH:    { display: 'flex', gap: 12 },
  label:   { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' },
  input:   { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '7px 10px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', width: '100%' },
  select:  { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '7px 10px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', width: '100%' },
  textarea:{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', width: '100%', minHeight: 120, resize: 'vertical', lineHeight: 1.6 },
  hint:    { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' },
  result:  { background: 'var(--success-dim)', border: '1px solid var(--success)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--success)' },
  error:   { background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--danger)' },
  footer:  { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border-light)' },
  btnCancel:{ padding: '6px 14px', borderRadius: 'var(--radius-sm)', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' },
  btnSend: { padding: '6px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', border: '1px solid var(--accent)', color: '#fff', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500, cursor: 'pointer' },
}

const TEMPLATES = {
  custom:    { key: '', value: '' },
  json:      { key: 'my-key', value: '{\n  "id": 1,\n  "event": "user.created",\n  "data": {}\n}' },
  plaintext: { key: '', value: 'Hello from OmniPanel!' },
  cloudevent:{ key: 'ce-id-001', value: '{\n  "specversion": "1.0",\n  "type": "com.example.event",\n  "source": "/db-admin",\n  "id": "ce-001",\n  "data": {}\n}' },
}

export default function KafkaPublishModal({ cluster, topic, partitions, onClose, onPublished }) {
  const [key,       setKey]       = useState('')
  const [value,     setValue]     = useState('')
  const [partition, setPartition] = useState('-1')
  const [headersRaw,setHeadersRaw]= useState('')
  const [template,  setTemplate]  = useState('custom')
  const [sending,   setSending]   = useState(false)
  const [result,    setResult]    = useState(null)
  const [error,     setError]     = useState(null)

  const applyTemplate = (tpl) => {
    setTemplate(tpl)
    setKey(TEMPLATES[tpl].key)
    setValue(TEMPLATES[tpl].value)
  }

  const parseHeaders = (raw) => {
    const h = {}
    raw.split('\n').forEach(line => {
      const idx = line.indexOf(':')
      if (idx > 0) h[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    })
    return h
  }

  const handleSend = async () => {
    if (!value.trim()) { setError('Value must not be empty'); return }
    setSending(true); setError(null); setResult(null)
    try {
      const payload = {
        topic,
        key:       key || null,
        value,
        partition: parseInt(partition),
        headers:   headersRaw.trim() ? parseHeaders(headersRaw) : {},
      }
      const res = await publishMessage(cluster, payload)
      setResult(res.data)
    } catch (e) { setError(e.message) }
    finally { setSending(false) }
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.header}>
          <span style={s.title}>↑ Publish to <span style={{ color: 'var(--accent-text)' }}>{topic}</span></span>
          <button style={s.close} onClick={onClose}>×</button>
        </div>

        <div style={s.body}>
          {error  && <div style={s.error}>{error}</div>}
          {result && (
            <div style={s.result}>
              ✓ Published → partition {result.partition}, offset {result.offset} at {result.timestamp}
            </div>
          )}

          {/* Template picker */}
          <div style={s.row}>
            <label style={s.label}>Template</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {Object.keys(TEMPLATES).map(t => (
                <button key={t} onClick={() => applyTemplate(t)}
                  style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', border: template === t ? '1px solid var(--accent)' : '1px solid var(--border)', background: template === t ? 'var(--accent-dim)' : 'transparent', color: template === t ? 'var(--accent-text)' : 'var(--text-muted)' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Key + Partition row */}
          <div style={s.rowH}>
            <div style={{ ...s.row, flex: 1 }}>
              <label style={s.label}>Key <span style={s.hint}>(optional)</span></label>
              <input style={s.input} value={key} onChange={e => setKey(e.target.value)} placeholder="message key" />
            </div>
            <div style={{ ...s.row, width: 130 }}>
              <label style={s.label}>Partition</label>
              <select style={s.select} value={partition} onChange={e => setPartition(e.target.value)}>
                <option value="-1">Auto</option>
                {partitions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Value */}
          <div style={s.row}>
            <label style={s.label}>Value</label>
            <textarea style={s.textarea} value={value} onChange={e => setValue(e.target.value)} placeholder="message value" />
          </div>

          {/* Headers */}
          <div style={s.row}>
            <label style={s.label}>Headers <span style={s.hint}>(key: value — one per line, optional)</span></label>
            <textarea style={{ ...s.textarea, minHeight: 56 }} value={headersRaw} onChange={e => setHeadersRaw(e.target.value)} placeholder={'Content-Type: application/json\nX-Source: db-admin'} />
          </div>
        </div>

        <div style={s.footer}>
          <button style={s.btnCancel} onClick={onClose} disabled={sending}>Cancel</button>
          <button style={s.btnSend}   onClick={handleSend} disabled={sending}>
            {sending ? 'Sending…' : '↑ Send'}
          </button>
          {result && (
            <button style={{ ...s.btnCancel, marginLeft: 4 }} onClick={onPublished}>Done</button>
          )}
        </div>
      </div>
    </div>
  )
}
