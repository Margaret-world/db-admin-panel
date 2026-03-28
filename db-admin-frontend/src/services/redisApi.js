import axios from 'axios'

const api = axios.create({
  baseURL: '/api/admin/redis',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => {
    if (res.data && res.data.success === false)
      return Promise.reject(new Error(res.data.message || 'Request failed'))
    return res
  },
  (err) => Promise.reject(new Error(
    err?.response?.data?.message || err?.message || 'Network error'
  ))
)

export const fetchRedisInfo  = ()                         => api.get('/info').then(r => r.data.data)
export const scanKeys        = (db, params)               => api.get(`/db/${db}/keys`, { params }).then(r => r.data.data)
export const fetchKeyDetail  = (db, key)                  => api.get(`/db/${db}/keys/${encodeURIComponent(key)}`).then(r => r.data.data)
export const upsertKey       = (db, payload)              => api.post(`/db/${db}/keys`, payload).then(r => r.data)
export const updateKeyTtl    = (db, key, ttl)             => api.put(`/db/${db}/keys/${encodeURIComponent(key)}/ttl`, { ttl }).then(r => r.data)
export const deleteKey       = (db, key)                  => api.delete(`/db/${db}/keys/${encodeURIComponent(key)}`).then(r => r.data)
