import React, { useState, useEffect, useCallback } from 'react'

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    backdropFilter: 'blur(2px)',
  },
  modal: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    width: 480,
    maxWidth: 'calc(100vw - 48px)',
    maxHeight: 'calc(100vh - 80px)',
    display: 'flex',
    flexDirection: 'column',
    animation: 'fadeIn 150ms ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-light)',
  },
  title: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  close: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 18,
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 2px',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-secondary)',
  },
  typePill: {
    fontSize: 10,
    background: 'var(--bg-elevated)',
    color: 'var(--text-muted)',
    padding: '1px 6px',
    borderRadius: 10,
  },
  pkPill: {
    fontSize: 10,
    background: 'var(--accent-dim)',
    color: 'var(--accent-text)',
    padding: '1px 6px',
    borderRadius: 10,
  },
  input: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '7px 10px',
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
    transition: 'border-color var(--transition)',
    width: '100%',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    padding: '14px 20px',
    borderTop: '1px solid var(--border-light)',
  },
  btnCancel: {
    padding: '7px 16px',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
  },
  btnSave: {
    padding: '7px 16px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent)',
    border: '1px solid var(--accent)',
    color: '#fff',
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
    fontWeight: 500,
    cursor: 'pointer',
  },
  error: {
    background: 'var(--danger-dim)',
    border: '1px solid var(--danger)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--danger)',
    padding: '8px 12px',
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
  },
}

export default function RowModal({ mode, columns, initialData, onSave, onClose, saving, error }) {
  const [formData, setFormData] = useState({})

  useEffect(() => {
    const init = {}
    columns.forEach((col) => {
      init[col.name] = initialData?.[col.name] ?? ''
    })
    setFormData(init)
  }, [columns, initialData])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleChange = (col, value) => {
    setFormData((prev) => ({ ...prev, [col]: value }))
  }

  const handleSave = () => {
    // Strip PK from inserts; include all for updates
    const payload = {}
    columns.forEach((col) => {
      if (mode === 'add' && col.primaryKey) return
      if (formData[col.name] !== '') {
        payload[col.name] = formData[col.name]
      }
    })
    onSave(payload)
  }

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.header}>
          <span style={s.title}>{mode === 'add' ? '+ Insert row' : '✎ Edit row'}</span>
          <button style={s.close} onClick={onClose}>×</button>
        </div>

        <div style={s.body}>
          {error && <div style={s.error}>{error}</div>}

          {columns.map((col) => {
            const isAutoKey = col.primaryKey && col.extra?.includes('auto_increment')
            const disabled = mode === 'add' && isAutoKey
            return (
              <div key={col.name} style={s.field}>
                <label style={s.label}>
                  {col.name}
                  <span style={s.typePill}>{col.type}</span>
                  {col.primaryKey && <span style={s.pkPill}>PK</span>}
                  {disabled && <span style={{ ...s.typePill, fontStyle: 'italic' }}>auto</span>}
                </label>
                <input
                  style={{
                    ...s.input,
                    opacity: disabled ? 0.4 : 1,
                    cursor: disabled ? 'not-allowed' : 'text',
                  }}
                  disabled={disabled}
                  value={formData[col.name] ?? ''}
                  placeholder={disabled ? 'auto-generated' : col.nullable ? 'null' : ''}
                  onChange={(e) => handleChange(col.name, e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            )
          })}
        </div>

        <div style={s.footer}>
          <button style={s.btnCancel} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button style={s.btnSave} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
