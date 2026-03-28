import axios from 'axios'

const api = axios.create({
  baseURL: '/api/admin/db',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => {
    if (res.data && res.data.success === false)
      return Promise.reject(new Error(res.data.message || 'Request failed'))
    return res
  },
  (err) => {
    const msg = err?.response?.data?.message || err?.message || 'Network error'
    return Promise.reject(new Error(msg))
  }
)

// ── Schemas ───────────────────────────────────────────────────────────────────
export const fetchSchemas = () =>
  api.get('/schemas').then((r) => r.data.data)

// ── Tables ────────────────────────────────────────────────────────────────────
export const fetchTables = (schema) =>
  api.get(`/schemas/${schema}/tables`).then((r) => r.data.data)

// ── Schema (columns) ──────────────────────────────────────────────────────────
export const fetchSchema = (schema, table) =>
  api.get(`/schemas/${schema}/tables/${table}/schema`).then((r) => r.data.data)

// ── Rows ──────────────────────────────────────────────────────────────────────
export const fetchRows = (schema, table, { page = 1, pageSize = 20, search = '' } = {}) =>
  api
    .get(`/schemas/${schema}/tables/${table}/rows`, { params: { page, pageSize, search } })
    .then((r) => r.data.data)

export const insertRow = (schema, table, data) =>
  api.post(`/schemas/${schema}/tables/${table}/rows`, { data }).then((r) => r.data)

export const updateRow = (schema, table, pk, data) =>
  api.put(`/schemas/${schema}/tables/${table}/rows/${encodeURIComponent(pk)}`, { data }).then((r) => r.data)

export const deleteRow = (schema, table, pk) =>
  api.delete(`/schemas/${schema}/tables/${table}/rows/${encodeURIComponent(pk)}`).then((r) => r.data)
