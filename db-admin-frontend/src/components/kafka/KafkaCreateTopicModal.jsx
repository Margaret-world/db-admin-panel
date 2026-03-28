import React, { useState } from 'react'
import { createTopic } from '../../services/kafkaApi'

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(2px)' },
  modal:   { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, width: 420, maxWidth: 'calc(100vw - 48px)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 150ms ease' },
  header:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-light)' },
  title:   { fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' },
  close:   { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' },
  body:    { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  row:     { display: 'flex', flexDirection: 'column', gap: 5 },
  rowH:    { display: 'flex', gap: 12 },
  label:   { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' },
  input:   { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '7px 10px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', width: '100%' },
  hint:    { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 2 },
  error:   { background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--danger)' },
  footer:  { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border-light)' },
  btnCancel:{ padding: '6px 14px', borderRadius: 'var(--radius-sm)', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' },
  btnCreate:{ padding: '6px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', border: '1px solid var(--accent)', color: '#fff', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500, cursor: 'pointer' },
}

export default function KafkaCreateTopicModal({ cluster, onClose, onCreated }) {
  const [name,        setName]        = useState('')
  const [partitions,  setPartitions]  = useState('3')
  const [replication, setReplication] = useState('1')
  const [creating,    setCreating]    = useState(false)
  const [error,       setError]       = useState(null)

  const handleCreate = async () => {
    if (!name.trim()) { setError('Topic name is required'); return }
    setCreating(true); setError(null)
    try {
      await createTopic(cluster, {
        name:              name.trim(),
        partitions:        parseInt(partitions) || 1,
        replicationFactor: parseInt(replication) || 1,
      })
      onCreated(name.trim())
    } catch (e) { setError(e.message) }
    finally { setCreating(false) }
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.header}>
          <span style={s.title}>+ Create topic</span>
          <button style={s.close} onClick={onClose}>×</button>
        </div>

        <div style={s.body}>
          {error && <div style={s.error}>{error}</div>}

          <div style={s.row}>
            <label style={s.label}>Topic name</label>
            <input style={s.input} value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. user-events" autoFocus
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            <span style={s.hint}>Use dots or hyphens as separators: orders.created, user-events</span>
          </div>

          <div style={s.rowH}>
            <div style={{ ...s.row, flex: 1 }}>
              <label style={s.label}>Partitions</label>
              <input style={s.input} type="number" min="1" max="100"
                value={partitions} onChange={e => setPartitions(e.target.value)} />
            </div>
            <div style={{ ...s.row, flex: 1 }}>
              <label style={s.label}>Replication factor</label>
              <input style={s.input} type="number" min="1" max="10"
                value={replication} onChange={e => setReplication(e.target.value)} />
              <span style={s.hint}>Must be ≤ broker count</span>
            </div>
          </div>
        </div>

        <div style={s.footer}>
          <button style={s.btnCancel} onClick={onClose} disabled={creating}>Cancel</button>
          <button style={s.btnCreate} onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : 'Create topic'}
          </button>
        </div>
      </div>
    </div>
  )
}
