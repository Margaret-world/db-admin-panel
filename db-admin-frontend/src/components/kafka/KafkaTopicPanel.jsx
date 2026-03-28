import React, { useState, useEffect } from 'react'
import { fetchTopic, fetchMessages, deleteTopic } from '../../services/kafkaApi'
import KafkaPublishModal from './KafkaPublishModal'

const s = {
  wrap:    { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  tabs:    { display: 'flex', padding: '0 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 },
  tab:     (a) => ({ padding: '9px 16px', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer', color: a ? 'var(--accent-text)' : 'var(--text-muted)', borderBottom: a ? '2px solid var(--accent)' : '2px solid transparent', background: 'none', border: 'none', borderBottom: a ? '2px solid var(--accent)' : '2px solid transparent', transition: 'color var(--transition)' }),
  toolbar: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 },
  label:   { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' },
  sel:     { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', cursor: 'pointer' },
  inp:     { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', width: 100 },
  spacer:  { flex: 1 },
  btn:     (accent) => ({ padding: '5px 12px', fontSize: 11, fontFamily: 'var(--font-mono)', borderRadius: 'var(--radius-sm)', border: accent ? '1px solid var(--accent)' : '1px solid var(--border)', background: accent ? 'var(--accent)' : 'transparent', color: accent ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }),
  delBtn:  { padding: '5px 12px', fontSize: 11, fontFamily: 'var(--font-mono)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)', background: 'var(--danger-dim)', color: 'var(--danger)', cursor: 'pointer' },
  body:    { flex: 1, overflow: 'auto' },
  tbl:     { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 },
  th:      { position: 'sticky', top: 0, background: 'var(--bg-elevated)', padding: '8px 14px', textAlign: 'left', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' },
  td:      { padding: '7px 14px', borderBottom: '1px solid var(--border-light)', color: 'var(--text-primary)', verticalAlign: 'top' },
  mono:    { fontFamily: 'var(--font-mono)', color: 'var(--accent-text)' },
  muted:   { color: 'var(--text-muted)' },
  msgVal:  { maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)', cursor: 'pointer' },
  msgValFull: { maxWidth: 420, wordBreak: 'break-all', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: 11, lineHeight: 1.5 },
  pill:    (c) => ({ display: 'inline-block', padding: '1px 7px', borderRadius: 8, fontSize: 10, background: c + '22', color: c, border: `1px solid ${c}44` }),
  empty:   { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, gap: 8 },
  statCard:{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-light)', flexWrap: 'wrap', flexShrink: 0 },
  stat:    { background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '8px 14px', minWidth: 100 },
  statLbl: { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  statVal: { fontSize: 20, fontWeight: 500, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: 2 },
}

function StatCard({ label, value }) {
  return <div style={s.stat}><div style={s.statLbl}>{label}</div><div style={s.statVal}>{value}</div></div>
}

export default function KafkaTopicPanel({ cluster, topicName, onDeleted, onPublished }) {
  const [activeTab,   setActiveTab]   = useState('partitions')
  const [topicDetail, setTopicDetail] = useState(null)
  const [messages,    setMessages]    = useState([])
  const [loading,     setLoading]     = useState(false)
  const [msgLoading,  setMsgLoading]  = useState(false)
  const [partition,   setPartition]   = useState('-1')
  const [fromOffset,  setFromOffset]  = useState('-1')
  const [limit,       setLimit]       = useState('50')
  const [expandedRow, setExpandedRow] = useState(null)
  const [showPublish, setShowPublish] = useState(false)
  const [toast,       setToast]       = useState(null)

  useEffect(() => {
    setTopicDetail(null); setMessages([]); setLoading(true)
    fetchTopic(cluster, topicName)
      .then(setTopicDetail)
      .catch(e => setToast({ msg: e.message, type: 'error' }))
      .finally(() => setLoading(false))
  }, [cluster, topicName])

  const loadMessages = async () => {
    setMsgLoading(true); setMessages([])
    try {
      const msgs = await fetchMessages(cluster, topicName, {
        partition: parseInt(partition), fromOffset: parseInt(fromOffset), limit: parseInt(limit),
      })
      setMessages(msgs)
    } catch (e) { setToast({ msg: e.message, type: 'error' }) }
    finally { setMsgLoading(false) }
  }

  useEffect(() => { if (activeTab === 'messages') loadMessages() }, [activeTab, topicName])

  const handleDelete = async () => {
    if (!window.confirm(`Delete topic "${topicName}"? This cannot be undone.`)) return
    try { await deleteTopic(cluster, topicName); onDeleted() }
    catch (e) { setToast({ msg: e.message, type: 'error' }) }
  }

  const totalMessages = topicDetail?.partitions?.reduce((s, p) => s + p.messageCount, 0) ?? 0

  if (loading) return <div style={s.empty}><span className="spin" style={{ fontSize: 18 }}>◌</span>Loading…</div>
  if (!topicDetail) return <div style={s.empty}><span style={{ fontSize: 28, opacity: 0.15 }}>◈</span>Select a topic</div>

  return (
    <div style={s.wrap}>
      {/* Stat row */}
      <div style={s.statCard}>
        <StatCard label="Partitions"    value={topicDetail.partitionCount} />
        <StatCard label="Replication"   value={`×${topicDetail.replicationFactor}`} />
        <StatCard label="Total Messages" value={totalMessages.toLocaleString()} />
        <div style={{ ...s.stat, background: 'transparent', display: 'flex', alignItems: 'flex-end', gap: 8, flex: 1, justifyContent: 'flex-end', padding: 0 }}>
          <button style={s.btn(true)} onClick={() => setShowPublish(true)}>↑ Publish</button>
          <button style={s.delBtn}    onClick={handleDelete}>Delete topic</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        <button style={s.tab(activeTab === 'partitions')} onClick={() => setActiveTab('partitions')}>Partitions</button>
        <button style={s.tab(activeTab === 'messages')}   onClick={() => setActiveTab('messages')}>Messages</button>
      </div>

      {/* Partitions tab */}
      {activeTab === 'partitions' && (
        <div style={s.body}>
          <table style={s.tbl}>
            <thead><tr>
              <th style={s.th}>Partition</th><th style={s.th}>Leader</th>
              <th style={s.th}>Earliest</th><th style={s.th}>Latest</th>
              <th style={s.th}>Messages</th><th style={s.th}>Replicas</th><th style={s.th}>ISR</th>
            </tr></thead>
            <tbody>
              {topicDetail.partitions.map(p => (
                <tr key={p.partition}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...s.td, ...s.mono }}>{p.partition}</td>
                  <td style={{ ...s.td, ...s.muted }}>broker-{p.leader}</td>
                  <td style={{ ...s.td, ...s.muted }}>{p.earliestOffset}</td>
                  <td style={{ ...s.td, ...s.muted }}>{p.latestOffset}</td>
                  <td style={s.td}>{p.messageCount.toLocaleString()}</td>
                  <td style={{ ...s.td, ...s.muted }}>[{p.replicas.join(', ')}]</td>
                  <td style={{ ...s.td, ...s.muted }}>[{p.isr.join(', ')}]</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Messages tab */}
      {activeTab === 'messages' && (
        <>
          <div style={s.toolbar}>
            <span style={s.label}>Partition</span>
            <select style={s.sel} value={partition} onChange={e => setPartition(e.target.value)}>
              <option value="-1">All</option>
              {topicDetail.partitions.map(p => <option key={p.partition} value={p.partition}>{p.partition}</option>)}
            </select>
            <span style={s.label}>From offset</span>
            <input style={s.inp} value={fromOffset} onChange={e => setFromOffset(e.target.value)} placeholder="-1 = tail" />
            <span style={s.label}>Limit</span>
            <select style={s.sel} value={limit} onChange={e => setLimit(e.target.value)}>
              {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <div style={s.spacer} />
            <button style={s.btn(true)} onClick={loadMessages}>Fetch</button>
          </div>
          <div style={s.body}>
            {msgLoading && <div style={s.empty}><span className="spin" style={{ fontSize: 16 }}>◌</span>Fetching…</div>}
            {!msgLoading && messages.length === 0 && <div style={s.empty}>No messages found</div>}
            {!msgLoading && messages.length > 0 && (
              <table style={s.tbl}>
                <thead><tr>
                  <th style={s.th}>Partition</th><th style={s.th}>Offset</th>
                  <th style={s.th}>Timestamp</th><th style={s.th}>Key</th>
                  <th style={s.th}>Value</th><th style={s.th}>Size</th>
                </tr></thead>
                <tbody>
                  {messages.map((m, i) => {
                    const expanded = expandedRow === i
                    return (
                      <tr key={i}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ ...s.td, ...s.mono }}>{m.partition}</td>
                        <td style={{ ...s.td, ...s.mono }}>{m.offset}</td>
                        <td style={{ ...s.td, ...s.muted, whiteSpace: 'nowrap' }}>{m.timestampFormatted}</td>
                        <td style={{ ...s.td, ...s.muted }}>{m.key || <span style={{ opacity: 0.4 }}>null</span>}</td>
                        <td style={s.td} onClick={() => setExpandedRow(expanded ? null : i)}>
                          <div style={expanded ? s.msgValFull : s.msgVal} title={expanded ? '' : m.value}>
                            {m.value || <span style={{ opacity: 0.4 }}>null</span>}
                          </div>
                        </td>
                        <td style={{ ...s.td, ...s.muted }}>{m.valueSize}B</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {showPublish && (
        <KafkaPublishModal
          cluster={cluster} topic={topicName}
          partitions={topicDetail.partitions.map(p => p.partition)}
          onClose={() => setShowPublish(false)}
          onPublished={() => { setShowPublish(false); if (activeTab === 'messages') loadMessages() }}
        />
      )}

      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '10px 18px', borderRadius: 6, background: toast.type === 'error' ? 'var(--danger-dim)' : 'var(--success-dim)', border: `1px solid ${toast.type === 'error' ? 'var(--danger)' : 'var(--success)'}`, color: toast.type === 'error' ? 'var(--danger)' : 'var(--success)', fontSize: 12, fontFamily: 'var(--font-mono)', zIndex: 200 }} onClick={() => setToast(null)}>{toast.msg}</div>}
    </div>
  )
}
