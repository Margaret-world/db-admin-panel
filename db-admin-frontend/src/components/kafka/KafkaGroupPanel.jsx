import React, { useState, useEffect } from 'react'
import { fetchGroup } from '../../services/kafkaApi'

const s = {
  wrap:    { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  statRow: { display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-light)', flexWrap: 'wrap', flexShrink: 0 },
  stat:    { background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '8px 14px', minWidth: 100 },
  statLbl: { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  statVal: { fontSize: 20, fontWeight: 500, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: 2 },
  tabs:    { display: 'flex', padding: '0 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 },
  tab:     (a) => ({ padding: '9px 16px', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer', color: a ? 'var(--accent-text)' : 'var(--text-muted)', borderBottom: a ? '2px solid var(--accent)' : '2px solid transparent', background: 'none', border: 'none', borderBottom: a ? '2px solid var(--accent)' : '2px solid transparent' }),
  body:    { flex: 1, overflow: 'auto' },
  tbl:     { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 },
  th:      { position: 'sticky', top: 0, background: 'var(--bg-elevated)', padding: '8px 14px', textAlign: 'left', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' },
  td:      { padding: '7px 14px', borderBottom: '1px solid var(--border-light)', color: 'var(--text-primary)', verticalAlign: 'middle' },
  muted:   { color: 'var(--text-muted)' },
  mono:    { fontFamily: 'var(--font-mono)', color: 'var(--accent-text)' },
  lagBar:  (pct) => ({ height: 4, borderRadius: 2, background: `linear-gradient(to right, ${pct > 80 ? 'var(--danger)' : pct > 40 ? 'var(--warning)' : 'var(--success)'} ${pct}%, var(--bg-elevated) 0%)`, minWidth: 80, maxWidth: 160 }),
  lagNum:  (lag) => ({ fontSize: 11, fontFamily: 'var(--font-mono)', color: lag > 0 ? 'var(--warning)' : 'var(--success)', fontWeight: 500 }),
  stateBadge: (s) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 8, fontSize: 11, fontFamily: 'var(--font-mono)', background: s === 'Stable' ? 'var(--success-dim)' : 'var(--bg-elevated)', color: s === 'Stable' ? 'var(--success)' : 'var(--text-muted)' }),
  empty:   { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, gap: 8 },
}

function StatCard({ label, value, highlight }) {
  return (
    <div style={s.stat}>
      <div style={s.statLbl}>{label}</div>
      <div style={{ ...s.statVal, color: highlight ? 'var(--warning)' : 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}

export default function KafkaGroupPanel({ cluster, groupId }) {
  const [group,     setGroup]     = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [activeTab, setActiveTab] = useState('lag')

  useEffect(() => {
    if (!groupId) return
    setGroup(null); setLoading(true)
    fetchGroup(cluster, groupId)
      .then(setGroup)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [cluster, groupId])

  if (!groupId) return <div style={s.empty}><span style={{ fontSize: 28, opacity: 0.15 }}>◈</span>Select a consumer group</div>
  if (loading)  return <div style={s.empty}><span className="spin" style={{ fontSize: 18 }}>◌</span>Loading…</div>
  if (!group)   return <div style={s.empty}>Failed to load group</div>

  const maxLag = Math.max(...(group.partitionLags?.map(l => l.lag) ?? [1]), 1)

  return (
    <div style={s.wrap}>
      <div style={s.statRow}>
        <StatCard label="State"    value={<span style={s.stateBadge(group.state)}>{group.state}</span>} />
        <StatCard label="Members"  value={group.memberCount} />
        <StatCard label="Total Lag" value={group.totalLag.toLocaleString()} highlight={group.totalLag > 0} />
        <StatCard label="Protocol" value={group.protocol || '—'} />
      </div>

      <div style={s.tabs}>
        <button style={s.tab(activeTab === 'lag')}     onClick={() => setActiveTab('lag')}>Partition Lag</button>
        <button style={s.tab(activeTab === 'members')} onClick={() => setActiveTab('members')}>Members</button>
      </div>

      <div style={s.body}>
        {activeTab === 'lag' && (
          <table style={s.tbl}>
            <thead><tr>
              <th style={s.th}>Topic</th><th style={s.th}>Partition</th>
              <th style={s.th}>Committed</th><th style={s.th}>Log End</th>
              <th style={s.th}>Lag</th><th style={s.th}>Lag Bar</th>
            </tr></thead>
            <tbody>
              {(group.partitionLags ?? []).map((l, i) => {
                const pct = maxLag > 0 ? Math.min(100, (l.lag / maxLag) * 100) : 0
                return (
                  <tr key={i}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...s.td, ...s.mono }}>{l.topic}</td>
                    <td style={{ ...s.td, ...s.muted }}>{l.partition}</td>
                    <td style={{ ...s.td, ...s.muted }}>{l.currentOffset.toLocaleString()}</td>
                    <td style={{ ...s.td, ...s.muted }}>{l.logEndOffset.toLocaleString()}</td>
                    <td style={s.td}><span style={s.lagNum(l.lag)}>{l.lag.toLocaleString()}</span></td>
                    <td style={s.td}><div style={s.lagBar(pct)} /></td>
                  </tr>
                )
              })}
              {(!group.partitionLags || group.partitionLags.length === 0) && (
                <tr><td colSpan={6} style={{ ...s.td, ...s.muted, textAlign: 'center' }}>No committed offsets</td></tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'members' && (
          <table style={s.tbl}>
            <thead><tr>
              <th style={s.th}>Client ID</th><th style={s.th}>Member ID</th><th style={s.th}>Host</th>
            </tr></thead>
            <tbody>
              {(group.members ?? []).map((m, i) => (
                <tr key={i}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...s.td, ...s.mono }}>{m.clientId}</td>
                  <td style={{ ...s.td, ...s.muted, fontSize: 10 }}>{m.memberId}</td>
                  <td style={{ ...s.td, ...s.muted }}>{m.host}</td>
                </tr>
              ))}
              {(!group.members || group.members.length === 0) && (
                <tr><td colSpan={3} style={{ ...s.td, ...s.muted, textAlign: 'center' }}>No active members</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
