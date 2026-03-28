import React, { useState } from 'react'

const s = {
  wrap:     { width: 240, minWidth: 240, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', background: 'var(--bg-surface)', overflow: 'hidden' },
  section:  { borderBottom: '1px solid var(--border-light)', flexShrink: 0 },
  secLabel: { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 12px 6px' },
  cluster:  (active, ok) => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
    cursor: 'pointer', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
    background: active ? 'var(--bg-active)' : 'transparent', transition: 'all var(--transition)',
    opacity: ok ? 1 : 0.5,
  }),
  clDot:    (ok) => ({ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: ok ? 'var(--success)' : 'var(--danger)', boxShadow: ok ? '0 0 5px var(--success)' : 'none' }),
  clName:   { flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  clCount:  { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 10 },
  tabRow:   { display: 'flex', borderBottom: '1px solid var(--border-light)', flexShrink: 0 },
  tab:      (active) => ({ flex: 1, padding: '7px 0', textAlign: 'center', fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', color: active ? 'var(--accent-text)' : 'var(--text-muted)', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent', background: 'none', border: 'none', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent', transition: 'color var(--transition)' }),
  list:     { flex: 1, overflowY: 'auto' },
  item:     (active) => ({ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', cursor: 'pointer', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent', background: active ? 'var(--bg-active)' : 'transparent', transition: 'all var(--transition)' }),
  itemName: { flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  itemMeta: { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', flexShrink: 0 },
  lagBadge: (lag) => ({ fontSize: 10, padding: '1px 6px', borderRadius: 8, fontFamily: 'var(--font-mono)', flexShrink: 0, background: lag > 0 ? 'var(--warning-dim)' : 'var(--success-dim)', color: lag > 0 ? 'var(--warning)' : 'var(--success)' }),
  stateBadge: (state) => ({ fontSize: 10, padding: '1px 6px', borderRadius: 8, fontFamily: 'var(--font-mono)', flexShrink: 0, background: state === 'Stable' ? 'var(--success-dim)' : 'var(--bg-elevated)', color: state === 'Stable' ? 'var(--success)' : 'var(--text-muted)' }),
  empty:    { padding: '16px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' },
  footer:   { padding: '7px 12px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: 8 },
  footTxt:  { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', flex: 1 },
  addBtn:   { padding: '3px 9px', fontSize: 10, fontFamily: 'var(--font-mono)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent)', background: 'var(--accent-dim)', color: 'var(--accent-text)', cursor: 'pointer' },
}

export default function KafkaClusterSidebar({
  clusters, selectedCluster, onSelectCluster,
  sidebarTab, onTabChange,
  topics, groups,
  selectedTopic, onSelectTopic,
  selectedGroup, onSelectGroup,
  loading,
  onCreateTopic,
}) {
  return (
    <div style={s.wrap}>
      {/* Cluster list */}
      <div style={s.section}>
        <div style={s.secLabel}>Clusters</div>
        {clusters.map(c => (
          <div key={c.clusterId} style={s.cluster(selectedCluster === c.clusterId, c.connected)}
            onClick={() => c.connected && onSelectCluster(c.clusterId)}
            onMouseEnter={e => { if (selectedCluster !== c.clusterId) e.currentTarget.style.background = 'var(--bg-hover)' }}
            onMouseLeave={e => { if (selectedCluster !== c.clusterId) e.currentTarget.style.background = 'transparent' }}>
            <span style={s.clDot(c.connected)} />
            <span style={s.clName} title={c.bootstrapServers}>{c.label || c.clusterId}</span>
            <span style={s.clCount}>{c.topicCount}</span>
          </div>
        ))}
      </div>

      {/* Topics / Groups tabs */}
      {selectedCluster && (
        <>
          <div style={s.tabRow}>
            <button style={s.tab(sidebarTab === 'topics')} onClick={() => onTabChange('topics')}>Topics</button>
            <button style={s.tab(sidebarTab === 'groups')} onClick={() => onTabChange('groups')}>Groups</button>
          </div>

          <div style={s.list}>
            {loading && <div style={s.empty}>Loading…</div>}

            {!loading && sidebarTab === 'topics' && (
              topics.length === 0
                ? <div style={s.empty}>No topics</div>
                : topics.map(t => (
                  <div key={t.name} style={s.item(selectedTopic === t.name)}
                    onClick={() => onSelectTopic(t.name)}
                    onMouseEnter={e => { if (selectedTopic !== t.name) e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { if (selectedTopic !== t.name) e.currentTarget.style.background = 'transparent' }}>
                    <span style={s.itemName} title={t.name}>{t.name}</span>
                    <span style={s.itemMeta}>{t.partitionCount}p</span>
                  </div>
                ))
            )}

            {!loading && sidebarTab === 'groups' && (
              groups.length === 0
                ? <div style={s.empty}>No consumer groups</div>
                : groups.map(g => (
                  <div key={g.groupId} style={s.item(selectedGroup === g.groupId)}
                    onClick={() => onSelectGroup(g.groupId)}
                    onMouseEnter={e => { if (selectedGroup !== g.groupId) e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { if (selectedGroup !== g.groupId) e.currentTarget.style.background = 'transparent' }}>
                    <span style={s.itemName} title={g.groupId}>{g.groupId}</span>
                    <span style={s.stateBadge(g.state)}>{g.state}</span>
                    {g.totalLag > 0 && <span style={s.lagBadge(g.totalLag)}>{g.totalLag}</span>}
                  </div>
                ))
            )}
          </div>

          <div style={s.footer}>
            <span style={s.footTxt}>
              {sidebarTab === 'topics' ? `${topics.length} topics` : `${groups.length} groups`}
            </span>
            {sidebarTab === 'topics' && (
              <button style={s.addBtn} onClick={onCreateTopic}>+ New</button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
