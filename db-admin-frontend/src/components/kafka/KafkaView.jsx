import React, { useState, useEffect, useCallback } from 'react'
import { fetchClusters, fetchTopics, fetchGroups } from '../../services/kafkaApi'
import KafkaClusterSidebar   from './KafkaClusterSidebar'
import KafkaTopicPanel       from './KafkaTopicPanel'
import KafkaGroupPanel       from './KafkaGroupPanel'
import KafkaCreateTopicModal from './KafkaCreateTopicModal'

const s = {
  wrap:    { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  topbar:  { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 },
  label:   { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' },
  pill:    (ok) => ({ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 10, background: ok ? 'var(--success-dim)' : 'var(--danger-dim)', color: ok ? 'var(--success)' : 'var(--danger)', border: `1px solid ${ok ? 'var(--success)' : 'var(--danger)'}44` }),
  meta:    { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' },
  spacer:  { flex: 1 },
  refreshBtn: { padding: '5px 11px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer' },
  body:    { display: 'flex', flex: 1, overflow: 'hidden' },
  empty:   { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 },
  emptyIcon: { fontSize: 32, opacity: 0.15 },
  errorBar: { margin: 12, padding: '10px 14px', background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 12 },
}

export default function KafkaView() {
  const [clusters,         setClusters]         = useState([])
  const [clustersLoading,  setClustersLoading]  = useState(true)
  const [selectedCluster,  setSelectedCluster]  = useState(null)

  const [sidebarTab,       setSidebarTab]       = useState('topics')  // 'topics' | 'groups'
  const [topics,           setTopics]           = useState([])
  const [groups,           setGroups]           = useState([])
  const [listLoading,      setListLoading]      = useState(false)

  const [selectedTopic,    setSelectedTopic]    = useState(null)
  const [selectedGroup,    setSelectedGroup]    = useState(null)
  const [showCreateTopic,  setShowCreateTopic]  = useState(false)
  const [error,            setError]            = useState(null)

  // ── Load clusters on mount ────────────────────────────────────────────────
  const loadClusters = useCallback(async () => {
    setClustersLoading(true); setError(null)
    try {
      const data = await fetchClusters()
      setClusters(data)
      // Auto-select first connected cluster
      const first = data.find(c => c.connected)
      if (first && !selectedCluster) handleSelectCluster(first.clusterId, false)
    } catch (e) { setError(e.message) }
    finally { setClustersLoading(false) }
  }, [])

  useEffect(() => { loadClusters() }, [])

  // ── Select cluster — reload topics ────────────────────────────────────────
  const handleSelectCluster = async (clusterId, reset = true) => {
    setSelectedCluster(clusterId)
    if (reset) { setSelectedTopic(null); setSelectedGroup(null) }
    setSidebarTab('topics')
    loadTopics(clusterId)
  }

  const loadTopics = async (clusterId) => {
    setListLoading(true); setTopics([]); setGroups([])
    try {
      const data = await fetchTopics(clusterId, false)
      setTopics(data)
    } catch (e) { setError(e.message) }
    finally { setListLoading(false) }
  }

  // ── Switch sidebar tab ────────────────────────────────────────────────────
  const handleTabChange = async (tab) => {
    setSidebarTab(tab)
    setSelectedTopic(null); setSelectedGroup(null)
    if (tab === 'groups' && groups.length === 0 && selectedCluster) {
      setListLoading(true)
      try { setGroups(await fetchGroups(selectedCluster)) }
      catch (e) { setError(e.message) }
      finally { setListLoading(false) }
    }
  }

  // ── Topic / group selection ───────────────────────────────────────────────
  const handleSelectTopic = (name) => {
    setSelectedTopic(name)
    setSelectedGroup(null)
  }

  const handleSelectGroup = (id) => {
    setSelectedGroup(id)
    setSelectedTopic(null)
  }

  // ── After topic deleted / created ─────────────────────────────────────────
  const handleTopicDeleted = () => {
    setSelectedTopic(null)
    loadTopics(selectedCluster)
    loadClusters()
  }

  const handleTopicCreated = (name) => {
    setShowCreateTopic(false)
    loadTopics(selectedCluster).then(() => setSelectedTopic(name))
    loadClusters()
  }

  const currentCluster = clusters.find(c => c.clusterId === selectedCluster)

  return (
    <div style={s.wrap}>
      {/* Sub-topbar */}
      <div style={s.topbar}>
        <span style={s.label}>Kafka</span>
        {currentCluster && (
          <>
            <span style={s.pill(currentCluster.connected)}>
              {currentCluster.connected ? 'connected' : 'unreachable'}
            </span>
            <span style={s.meta}>{currentCluster.brokerCount} broker{currentCluster.brokerCount !== 1 ? 's' : ''}</span>
            <span style={s.meta}>·</span>
            <span style={s.meta}>{currentCluster.topicCount} topics</span>
          </>
        )}
        <div style={s.spacer} />
        <button style={s.refreshBtn} onClick={loadClusters}
          onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}>
          ↻ Refresh
        </button>
      </div>

      {error && <div style={s.errorBar}>{error}</div>}

      <div style={s.body}>
        {/* Sidebar */}
        <KafkaClusterSidebar
          clusters={clusters}
          selectedCluster={selectedCluster}
          onSelectCluster={handleSelectCluster}
          sidebarTab={sidebarTab}
          onTabChange={handleTabChange}
          topics={topics}
          groups={groups}
          selectedTopic={selectedTopic}
          onSelectTopic={handleSelectTopic}
          selectedGroup={selectedGroup}
          onSelectGroup={handleSelectGroup}
          loading={listLoading || clustersLoading}
          onCreateTopic={() => setShowCreateTopic(true)}
        />

        {/* Main panel */}
        {!selectedCluster ? (
          <div style={s.empty}>
            <span style={s.emptyIcon}>◈</span>
            <span>No Kafka cluster connected</span>
            <span style={{ fontSize: 11, opacity: 0.6 }}>Check your application.yml kafka-clusters config</span>
          </div>
        ) : sidebarTab === 'topics' && selectedTopic ? (
          <KafkaTopicPanel
            key={`${selectedCluster}::${selectedTopic}`}
            cluster={selectedCluster}
            topicName={selectedTopic}
            onDeleted={handleTopicDeleted}
            onPublished={() => {}}
          />
        ) : sidebarTab === 'groups' && selectedGroup ? (
          <KafkaGroupPanel
            key={`${selectedCluster}::${selectedGroup}`}
            cluster={selectedCluster}
            groupId={selectedGroup}
          />
        ) : (
          <div style={s.empty}>
            <span style={s.emptyIcon}>{sidebarTab === 'topics' ? '◈' : '◎'}</span>
            <span>Select a {sidebarTab === 'topics' ? 'topic' : 'consumer group'} from the sidebar</span>
          </div>
        )}
      </div>

      {/* Create topic modal */}
      {showCreateTopic && (
        <KafkaCreateTopicModal
          cluster={selectedCluster}
          onClose={() => setShowCreateTopic(false)}
          onCreated={handleTopicCreated}
        />
      )}
    </div>
  )
}
