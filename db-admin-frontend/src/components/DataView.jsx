import React, { useState, useEffect, useCallback } from 'react'
import { fetchRows, insertRow, updateRow, deleteRow } from '../services/api'
import { useDebounce } from '../hooks/useDebounce'
import RowModal from './RowModal'
import Pagination from './Pagination'

const s = {
  wrap: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    borderBottom: '1px solid var(--border-light)',
    flexShrink: 0,
  },
  searchWrap: { position: 'relative', flex: 1, maxWidth: 300 },
  searchIcon: {
    position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
    color: 'var(--text-muted)', fontSize: 12, pointerEvents: 'none', fontFamily: 'var(--font-mono)',
  },
  searchInput: {
    width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '6px 10px 6px 28px',
    fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)',
  },
  pageSizeSelect: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '6px 8px',
    fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', cursor: 'pointer',
  },
  spacer: { flex: 1 },
  btnAdd: {
    display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px',
    background: 'var(--accent)', border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-sm)', color: '#fff',
    fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500, cursor: 'pointer', flexShrink: 0,
  },
  tableWrap: { flex: 1, overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 },
  th: {
    position: 'sticky', top: 0, background: 'var(--bg-elevated)',
    padding: '9px 14px', textAlign: 'left', fontWeight: 500, fontSize: 10,
    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', userSelect: 'none',
  },
  td: {
    padding: '8px 14px', borderBottom: '1px solid var(--border-light)',
    maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap', color: 'var(--text-primary)', verticalAlign: 'middle',
  },
  tdNull: { color: 'var(--text-muted)', fontStyle: 'italic' },
  actionCell: {
    padding: '6px 14px', borderBottom: '1px solid var(--border-light)',
    verticalAlign: 'middle', whiteSpace: 'nowrap',
  },
  rowActions: { display: 'flex', gap: 5, opacity: 0, transition: 'opacity var(--transition)' },
  btnEdit: {
    padding: '3px 10px', fontSize: 11, fontFamily: 'var(--font-mono)',
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
  },
  btnDel: {
    padding: '3px 10px', fontSize: 11, fontFamily: 'var(--font-mono)',
    borderRadius: 'var(--radius-sm)', border: '1px solid transparent',
    background: 'transparent', color: 'var(--danger)', cursor: 'pointer',
  },
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 16px', borderTop: '1px solid var(--border-light)',
    background: 'var(--bg-elevated)', flexShrink: 0, gap: 12,
  },
  footerText: { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' },
  toast: (type) => ({
    position: 'fixed', bottom: 24, right: 24, padding: '10px 18px',
    borderRadius: 'var(--radius-md)',
    background: type === 'error' ? 'var(--danger-dim)' : 'var(--success-dim)',
    border: `1px solid ${type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
    color: type === 'error' ? 'var(--danger)' : 'var(--success)',
    fontSize: 12, fontFamily: 'var(--font-mono)', zIndex: 200, animation: 'fadeIn 150ms ease',
  }),
  emptyState: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flex: 1, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: 40,
  },
  loadingState: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flex: 1, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, gap: 8, padding: 40,
  },
  errorBanner: {
    margin: 16, padding: '10px 14px', background: 'var(--danger-dim)',
    border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)',
    color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 12,
  },
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return <div style={s.toast(type)}>{message}</div>
}

export default function DataView({ schemaName, tableName, columns }) {
  const [rows,       setRows]       = useState([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [pageSize,   setPageSize]   = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [search,     setSearch]     = useState('')
  const [loading,    setLoading]    = useState(false)
  const [loadError,  setLoadError]  = useState(null)
  const [modal,      setModal]      = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState(null)
  const [toast,      setToast]      = useState(null)

  const debouncedSearch = useDebounce(search, 350)

  const load = useCallback(async () => {
    setLoading(true); setLoadError(null)
    try {
      const result = await fetchRows(schemaName, tableName, { page, pageSize, search: debouncedSearch })
      setRows(result.rows ?? [])
      setTotal(result.total ?? 0)
      setTotalPages(result.totalPages ?? 1)
    } catch (err) { setLoadError(err.message) }
    finally { setLoading(false) }
  }, [schemaName, tableName, page, pageSize, debouncedSearch])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [debouncedSearch, tableName, schemaName])

  const pkCol = columns.find((c) => c.primaryKey)?.name
  const showToast = (message, type = 'success') => setToast({ message, type })

  const handleInsert = async (data) => {
    setSaving(true); setSaveError(null)
    try {
      await insertRow(schemaName, tableName, data)
      setModal(null); showToast('Row inserted successfully'); load()
    } catch (err) { setSaveError(err.message) }
    finally { setSaving(false) }
  }

  const handleUpdate = async (data) => {
    setSaving(true); setSaveError(null)
    try {
      const pk = modal.initialData[pkCol]
      await updateRow(schemaName, tableName, pk, data)
      setModal(null); showToast('Row updated successfully'); load()
    } catch (err) { setSaveError(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (pkValue) => {
    if (!window.confirm(`Delete row where ${pkCol} = ${pkValue}?`)) return
    try {
      await deleteRow(schemaName, tableName, pkValue)
      showToast('Row deleted'); load()
    } catch (err) { showToast(err.message, 'error') }
  }

  const handleSave = (data) => modal?.mode === 'add' ? handleInsert(data) : handleUpdate(data)

  return (
    <div style={s.wrap}>
      <div style={s.toolbar}>
        <div style={s.searchWrap}>
          <span style={s.searchIcon}>⌕</span>
          <input style={s.searchInput} placeholder="Search all columns…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
        </div>
        <select style={s.pageSizeSelect} value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}>
          {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
        <div style={s.spacer} />
        <button style={s.btnAdd} onClick={() => { setSaveError(null); setModal({ mode: 'add', initialData: null }) }}>
          + Insert row
        </button>
      </div>

      {loadError && <div style={s.errorBanner}>Error: {loadError}</div>}

      {loading ? (
        <div style={s.loadingState}><span className="spin">◌</span> Loading…</div>
      ) : rows.length === 0 ? (
        <div style={s.emptyState}>{search ? `No rows matching "${search}"` : 'This table is empty'}</div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.name} style={s.th} title={col.type}>
                    {col.name}
                    {col.primaryKey && <span style={{ marginLeft: 5, color: 'var(--accent-text)', fontSize: 9 }}>PK</span>}
                  </th>
                ))}
                <th style={{ ...s.th, width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.querySelector('.row-actions').style.opacity = '1' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.querySelector('.row-actions').style.opacity = '0' }}>
                  {columns.map((col) => (
                    <td key={col.name}
                      style={row[col.name] == null ? { ...s.td, ...s.tdNull } : s.td}
                      title={String(row[col.name] ?? '')}>
                      {row[col.name] == null ? 'null' : String(row[col.name])}
                    </td>
                  ))}
                  <td style={s.actionCell}>
                    <div className="row-actions" style={s.rowActions}>
                      <button style={s.btnEdit}
                        onClick={() => { setSaveError(null); setModal({ mode: 'edit', initialData: row }) }}
                        onMouseEnter={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = 'var(--accent-text)' }}
                        onMouseLeave={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)' }}>
                        Edit
                      </button>
                      <button style={s.btnDel} onClick={() => handleDelete(row[pkCol])}
                        onMouseEnter={(e) => { e.target.style.borderColor = 'var(--danger)'; e.target.style.background = 'var(--danger-dim)' }}
                        onMouseLeave={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent' }}>
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={s.footer}>
        <span style={s.footerText}>{total} total row{total !== 1 ? 's' : ''}{search && ` matching "${search}"`}</span>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        <span style={s.footerText}>page {page} of {totalPages}</span>
      </div>

      {modal && (
        <RowModal mode={modal.mode} columns={columns} initialData={modal.initialData}
          onSave={handleSave} onClose={() => setModal(null)} saving={saving} error={saveError} />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
