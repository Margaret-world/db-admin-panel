import axios from 'axios'

const api = axios.create({
  baseURL: '/api/admin/kafka',
  timeout: 20000,
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

// ── Clusters ──────────────────────────────────────────────────────────────────
export const fetchClusters    = ()                          => api.get('/clusters').then(r => r.data.data)

// ── Topics ────────────────────────────────────────────────────────────────────
export const fetchTopics      = (cluster, internal = false) => api.get(`/clusters/${cluster}/topics`, { params: { internal } }).then(r => r.data.data)
export const fetchTopic       = (cluster, topic)            => api.get(`/clusters/${cluster}/topics/${encodeURIComponent(topic)}`).then(r => r.data.data)
export const createTopic      = (cluster, payload)          => api.post(`/clusters/${cluster}/topics`, payload).then(r => r.data)
export const deleteTopic      = (cluster, topic)            => api.delete(`/clusters/${cluster}/topics/${encodeURIComponent(topic)}`).then(r => r.data)

// ── Consumer groups ───────────────────────────────────────────────────────────
export const fetchGroups      = (cluster)                   => api.get(`/clusters/${cluster}/groups`).then(r => r.data.data)
export const fetchGroup       = (cluster, group)            => api.get(`/clusters/${cluster}/groups/${encodeURIComponent(group)}`).then(r => r.data.data)

// ── Messages ──────────────────────────────────────────────────────────────────
export const fetchMessages    = (cluster, topic, params)    => api.get(`/clusters/${cluster}/topics/${encodeURIComponent(topic)}/messages`, { params }).then(r => r.data.data)
export const publishMessage   = (cluster, payload)          => api.post(`/clusters/${cluster}/messages`, payload).then(r => r.data)
