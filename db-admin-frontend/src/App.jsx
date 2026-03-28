import React, { useState, useEffect } from 'react'
import { fetchSchemas, fetchTables, fetchSchema } from './services/api'
import Sidebar from './components/Sidebar'
import DataView from './components/DataView'
import SchemaView from './components/SchemaView'
import SchemaSelector from './components/SchemaSelector'
import RedisView from './components/redis/RedisView'

const s = {
  app:     { display: 'flex', height: '100vh', overflow: 'hidden', flexDirection: 'column' },
  topbar:  { display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', height: 46, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  logo:    { fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  logoMark:{ width: 22, height: 22, background: 'var(--accent)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700 },
  divider: { height: 18, width: 1, background: 'var(--border)', margin: '0 2px' },
  // Top-level mode tabs (MariaDB / Redis)
  modeTab: (active) => ({
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '0 14px', height: '100%',
    fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer',
    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    background: 'none', border: 'none',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    transition: 'color var(--transition)',
    flexShrink: 0,
  }),
  modeIcon: { fontSize: 13 },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' },
  breadcrumbActive: { color: 'var(--accent-text)' },
  spacer:  { flex: 1 },
  refreshBtn: { padding: '5px 11px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer' },
  body:    { display: 'flex', flex: 1, overflow: 'hidden' },
  main:    { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  tabBar:  { display: 'flex', padding: '0 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 },
  tab:     (active) => ({ padding: '9px 16px', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer', color: active ? 'var(--accent-text)' : 'var(--text-muted)', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1, background: 'transparent', border: 'none', transition: 'color var(--transition)' }),
  placeholder: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 },
  placeholderIcon: { fontSize: 32, opacity: 0.15 },
  placeholderSub:  { fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 },
}

export default function App() {
  // Top-level mode: 'mariadb' | 'redis'
  const [mode, setMode] = useState('mariadb')

  // MariaDB state
  const [schemas,        setSchemas]        = useState([])
  const [schemasLoading, setSchemasLoading] = useState(true)
  const [selectedSchema, setSelectedSchema] = useState(null)
  const [tables,         setTables]         = useState([])
  const [tablesLoading,  setTablesLoading]  = useState(false)
  const [selectedTable,  setSelectedTable]  = useState(null)
  const [columns,        setColumns]        = useState([])
  const [columnsLoading, setColumnsLoading] = useState(false)
  const [activeTab,      setActiveTab]      = useState('data')

  useEffect(() => {
    ;(async () => {
      setSchemasLoading(true)
      try {
        const data = await fetchSchemas()
        setSchemas(data)
        if (data.length > 0) loadSchema(data[0])
      } catch (e) { console.error(e) }
      finally { setSchemasLoading(false) }
    })()
  }, [])

  const loadSchema = async (schemaName) => {
    setSelectedSchema(schemaName)
    setSelectedTable(null)
    setColumns([])
    setTablesLoading(true)
    try { setTables(await fetchTables(schemaName)) }
    catch (e) { setTables([]) }
    finally { setTablesLoading(false) }
  }

  const selectTable = async (tableName) => {
    setSelectedTable(tableName)
    setActiveTab('data')
    setColumnsLoading(true)
    try { setColumns(await fetchSchema(selectedSchema, tableName)) }
    catch (e) { setColumns([]) }
    finally { setColumnsLoading(false) }
  }

  const selectedTableInfo = tables.find(t => t.tableName === selectedTable)

  return (
    <div style={s.app}>
      {/* ── Global topbar ── */}
      <header style={s.topbar}>
        <div style={s.logo}>
          <div style={s.logoMark}>DB</div>
          DB Admin
        </div>

        <div style={s.divider} />

        {/* Mode switcher tabs */}
        <button style={s.modeTab(mode === 'mariadb')} onClick={() => setMode('mariadb')}>
          <span style={s.modeIcon}>▤</span> MariaDB
        </button>
        <button style={s.modeTab(mode === 'redis')} onClick={() => setMode('redis')}>
          <span style={s.modeIcon}>⬡</span> Redis
        </button>

        <div style={s.divider} />

        {/* MariaDB breadcrumb — only shown in mariadb mode */}
        {mode === 'mariadb' && (
          <>
            <SchemaSelector
              schemas={schemas}
              selected={selectedSchema}
              loading={schemasLoading}
              onChange={loadSchema}
            />
            {selectedTable && (
              <>
                <div style={s.divider} />
                <div style={s.breadcrumb}>
                  <span>{selectedSchema}</span>
                  <span style={{ opacity: 0.4 }}>/</span>
                  <span style={s.breadcrumbActive}>{selectedTable}</span>
                  {selectedTableInfo?.tableComment && (
                    <span style={{ fontStyle: 'italic', opacity: 0.5 }}>— {selectedTableInfo.tableComment}</span>
                  )}
                </div>
              </>
            )}
          </>
        )}

        <div style={s.spacer} />

        {mode === 'mariadb' && (
          <button style={s.refreshBtn} onClick={() => selectedSchema && loadSchema(selectedSchema)}
            onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}>
            ↻ Refresh
          </button>
        )}
      </header>

      {/* ── Body ── */}
      {mode === 'redis' ? (
        <RedisView />
      ) : (
        <div style={s.body}>
          <Sidebar tables={tables} loading={tablesLoading} selected={selectedTable} onSelect={selectTable} />
          <div style={s.main}>
            {!selectedSchema ? (
              <div style={s.placeholder}>
                <span style={s.placeholderIcon}>◈</span>
                <span>Select a schema from the dropdown above</span>
              </div>
            ) : !selectedTable ? (
              <div style={s.placeholder}>
                <span style={s.placeholderIcon}>▤</span>
                <span>Select a table from the sidebar</span>
                <span style={s.placeholderSub}>{tables.length} tables in {selectedSchema}</span>
              </div>
            ) : columnsLoading ? (
              <div style={s.placeholder}>
                <span className="spin" style={{ fontSize: 18 }}>◌</span>
                <span>Loading schema…</span>
              </div>
            ) : (
              <>
                <div style={s.tabBar}>
                  <button style={s.tab(activeTab === 'data')}   onClick={() => setActiveTab('data')}>Data</button>
                  <button style={s.tab(activeTab === 'schema')} onClick={() => setActiveTab('schema')}>Structure</button>
                </div>
                {activeTab === 'data' && (
                  <DataView key={`${selectedSchema}.${selectedTable}`} schemaName={selectedSchema} tableName={selectedTable} columns={columns} />
                )}
                {activeTab === 'schema' && (
                  <div style={{ flex: 1, overflow: 'auto' }} className="fade-in">
                    <SchemaView columns={columns} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
