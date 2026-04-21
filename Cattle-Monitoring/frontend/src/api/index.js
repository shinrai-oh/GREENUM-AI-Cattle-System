import axios from 'axios'
import { ElMessage } from 'element-plus'

// ─── 简单内存缓存 ───────────────────────────────────────────────────────────
const cache = new Map()
const CACHE_DURATION = 30000

function getCacheKey(config) {
  return `${config.method}_${config.url}_${JSON.stringify(config.params || {})}`
}
function getFromCache(key) {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data
  cache.delete(key)
  return null
}
function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() })
}
export function clearCache() { cache.clear() }
export function clearCacheByUrl(url) {
  for (const [key] of cache) { if (key.includes(url)) cache.delete(key) }
}

// ─── Auth helpers ───────────────────────────────────────────────────────────
const TOKEN_KEY = 'monitoring_token'
export function getToken() { return localStorage.getItem(TOKEN_KEY) }
export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  window.dispatchEvent(new Event('monitoring-auth-expired'))
}
export async function login(username, password) {
  const res = await axios.post('/api/v1/auth/login', { username, password })
  localStorage.setItem(TOKEN_KEY, res.data.token)
  return res.data.token
}

// ─── Field-name converters ───────────────────────────────────────────────────
/** camelCase → snake_case */
function snakify(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase()
}
/** snake_case → camelCase */
function camelize(str) {
  return str.replace(/_([a-z])/g, (_, p) => p.toUpperCase())
}

/** Recursively convert object keys to snake_case, keeping both forms */
function transformResponse(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(transformResponse)

  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = transformResponse(value)
    const snake = snakify(key)
    if (snake !== key) result[snake] = result[key]
  }

  // _count → statistics (养牛厂管理页面用)
  if (result._count && typeof result._count === 'object') {
    const c = result._count
    result.statistics = {
      pens_count:    c.pens    ?? 0,
      cattle_count:  c.cattle  ?? 0,
      cameras_count: c.cameras ?? 0,
      active_cameras: c.cameras ?? 0,
    }
  }

  // farm: { name } → farm_name
  if (result.farm && typeof result.farm === 'object' && result.farm.name) {
    result.farm_name = result.farm.name
  }
  // pen: { penNumber } → pen_number
  if (result.pen && typeof result.pen === 'object') {
    result.pen_number = result.pen.penNumber ?? result.pen.pen_number ?? null
  }
  // cattle: { earTag } → cattle_ear_tag / ear_tag
  if (result.cattle && typeof result.cattle === 'object' && result.cattle.earTag) {
    result.cattle_ear_tag = result.cattle.earTag
  }

  return result
}

/** Convert params object keys from snake_case to camelCase + rename per_page→limit */
function transformParams(params) {
  if (!params || typeof params !== 'object') return params
  const result = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue
    const ck = camelize(key)
    result[ck] = value
  }
  // per_page / perPage → limit
  if (result.perPage !== undefined) { result.limit = result.perPage; delete result.perPage }
  return result
}

/** Convert body object keys from snake_case to camelCase */
function transformBody(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data
  const result = {}
  for (const [key, value] of Object.entries(data)) {
    result[camelize(key)] = value
  }
  return result
}

// ─── Axios instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Inject JWT
    const token = getToken()
    if (token) {
      config.headers = config.headers || {}
      config.headers['Authorization'] = `Bearer ${token}`
    }

    // Convert query params to camelCase
    if (config.params) config.params = transformParams(config.params)

    // Convert request body to camelCase
    if (config.data && typeof config.data === 'object' && !Array.isArray(config.data)) {
      config.data = transformBody(config.data)
    }

    // Cache check for GET requests
    if (config.method === 'get' && !config.skipCache) {
      const cacheKey = getCacheKey(config)
      const cached = getFromCache(cacheKey)
      if (cached) {
        config.adapter = async (cfg) => ({
          data: cached, status: 200, statusText: 'OK',
          headers: {}, config: cfg, request: null, fromCache: true,
        })
        return config
      }
      config._cacheKey = cacheKey
    }

    config.retry = config.retry ?? 1
    config.retryDelay = config.retryDelay ?? 500
    return config
  },
  (error) => Promise.reject(error),
)

// ── Response interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    if (response.fromCache) return response.data

    const { data } = response
    if (response.config.responseType === 'blob') return response

    if (data.success === false) {
      ElMessage.error(data.message || '请求失败')
      return Promise.reject(new Error(data.message || '请求失败'))
    }

    // Use data.data if present (old Python backend wrapper), else data directly
    let responseData = data.data ?? data

    // Apply camelCase → snake_case + compat transforms
    responseData = transformResponse(responseData)

    // Cache successful GET responses
    if (response.config.method === 'get' && response.config._cacheKey) {
      setCache(response.config._cacheKey, responseData)
    }

    return responseData
  },
  async (error) => {
    const config = error.config

    // 401 → clear token + notify app
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new Event('monitoring-auth-expired'))
      return Promise.reject(error)
    }

    // Retry logic (only for network errors / 5xx)
    if (config && config.retry > 0 && (!error.response || error.response.status >= 500)) {
      config.retry--
      await new Promise(resolve => setTimeout(resolve, config.retryDelay))
      return api(config)
    }

    let message = '网络连接错误'
    if (error.response) {
      const { status, data } = error.response
      switch (status) {
        case 400: message = data.message || data.error || '请求参数错误'; break
        case 401: message = '未授权，请重新登录'; break
        case 403: message = '拒绝访问'; break
        case 404: message = data.error || '请求的资源不存在'; break
        case 500: message = '服务器内部错误'; break
        default:  message = data.message || data.error || `请求失败 (${status})`
      }
    } else if (error.request) {
      message = '网络连接失败'
    }

    ElMessage.error(message)
    return Promise.reject(error)
  },
)

export default api
