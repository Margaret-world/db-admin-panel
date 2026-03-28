import React, { useState, useEffect, useCallback } from 'react'
import { fetchRedisInfo, scanKeys, fetchKeyDetail, upsertKey, deleteKey } from '../../services/redisApi'
import RedisDbSidebar from './RedisDbSidebar'
import RedisKeyPanel from './RedisKeyPanel'
import RedisUpsertModal from './RedisUpsertModal'

const s = {
  wrap:     { display: 'flex', flex: 1, overflow: 'hidden' },
  topbar:   { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 },
  tag:      { fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 10, background: '#e8a02022', color: '#e8a020', border: '1px solid #e8a02044' },
  spacer:   { flex: 1 },
  addBtn:   { padding: '5px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', border: '1px solid var(--accent)', color: '#fff', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' },
  body:     { display: 'flex', flex: 1, overflow: 'hidden' },
  errorBar: { margin: 12, padding: '10px 14px', background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 12 },
}

export default function RedisView() {
  const [dbSizes,      setDbSizes]      = useState({})
  const [selectedDb,   setSelectedDb]   = useState(0)
  const [pattern,      setPattern]      = useState('*')
  const [keys,         setKeys]         = useState([])
  const [keyPage,      setKeyPage]      = useState(null)
  const [scanCursor,   setScanCursor]   = useState('0')
  const [keysLoading,  setKeysLoading]  = useState(false)
  const [selectedKey,  setSelectedKey]  = useState(null)
  const [detail,       setDetail]       = useState(null)
  const [detailLoading,setDetailLoading]= useState(false)
  const [showModal,    setShowModal]    = useState(false)
  const [error,        setError]        = useState(null)

  // Load DB sizes on mount
  useEffect(() => {
    fetchRedisInfo()
      .then(setDbSizes)
      .catch(e => setError(e.message))
  }, [])

  // Scan keys whenever DB changes — reset everything
  const doScan = useCallback(async (db, pat, cursor = '0', append = false) => {
    setKeysLoading(true)
    setError(null)
    try {
      const page = await scanKeys(db, { pattern: pat || '*', cursor, count: 100 })
      setKeyPage(page)
      setScanCursor(page.nextCursor)
      setKeys(prev => append ? [...prev, ...page.keys] : page.keys)
    } catch (e) { setError(e.message) }
    finally { setKeysLoading(false) }
  }, [])

  useEffect(() => {
    setKeys([])
    setSelectedKey(null)
    setDetail(null)
    doScan(selectedDb, pattern, '0', false)
  }, [selectedDb])

  const handleScan = () => {
    setKeys([])
    setSelectedKey(null)
    setDetail(null)
    doScan(selectedDb, pattern, '0', false)
  }

  const handleLoadMore = () => doScan(selectedDb, pattern, scanCursor, true)

  // Load key detail
  const handleSelectKey = async (key) => {
    setSelectedKey(key)
    setDetailLoading(true)
    try {
      const d = await fetchKeyDetail(selectedDb, key)
      setDetail(d)
    } catch (e) { setError(e.message) }
    finally { setDetailLoading(false) }
  }

  // After delete — refresh sidebar + clear panel
  const handleDeleted = () => {
    setSelectedKey(null)
    setDetail(null)
    fetchRedisInfo().then(setDbSizes).catch(() => {})
    doScan(selectedDb, pattern, '0', false)
  }

  // After upsert — refresh
  const handleSaved = () => {
    setShowModal(false)
    fetchRedisInfo().then(setDbSizes).catch(() => {})
    doScan(selectedDb, pattern, '0', false)
  }

  // Refresh current key detail (after TTL update)
  const handleRefresh = () => {
    if (selectedKey) handleSelectKey(selectedKey)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Sub-topbar */}
      <div style={s.topbar}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
          Redis
        </span>
        <span style={s.tag}>db{selectedDb}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
          {dbSizes[selectedDb] ?? 0} keys
        </span>
        <div style={s.spacer} />
        <button style={s.addBtn} onClick={() => setShowModal(true)}>+ New key</button>
      </div>

      {error && <div style={s.errorBar}>{error}</div>}

      {/* Body: sidebar + detail */}
      <div style={s.body}>
        <RedisDbSidebar
          dbSizes={dbSizes}
          selectedDb={selectedDb}
          onSelectDb={db => setSelectedDb(db)}
          keys={keys}
          keyPage={keyPage}
          selectedKey={selectedKey}
          onSelectKey={handleSelectKey}
          pattern={pattern}
          onPatternChange={setPattern}
          onScan={handleScan}
          onLoadMore={handleLoadMore}
          loading={keysLoading}
        />
        <RedisKeyPanel
          db={selectedDb}
          detail={detail}
          loading={detailLoading}
          onDeleted={handleDeleted}
          onRefresh={handleRefresh}
        />
      </div>

      {showModal && (
        <RedisUpsertModal
          db={selectedDb}
          onSave={handleSaved}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
