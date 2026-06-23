const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('accessToken')
}

function clearAuthAndRedirect() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login'
  }
}

// The access token expires after 15 min. When a request comes back 401 we try a
// one-time refresh with the stored refresh token (valid 7d) and retry, so the
// user isn't bounced to login mid-shift (e.g. while taking a payment).
// Concurrent 401s share a single in-flight refresh.
let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return false
  if (!refreshPromise) {
    refreshPromise = fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async res => {
        if (!res.ok) return false
        const data = await res.json()
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        localStorage.setItem('user', JSON.stringify(data.user))
        return true
      })
      .catch(() => false)
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (res.status === 401) {
    // Expired access token — refresh once and retry before giving up.
    if (retry && (await refreshAccessToken())) {
      return request<T>(path, options, false)
    }
    clearAuthAndRedirect()
    throw new Error('UNAUTHORIZED')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  post: <T>(path: string, body: any) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  get: <T>(path: string) => request<T>(path),
  patch: <T>(path: string, body: any) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export async function login(email: string, password: string) {
  const data = await api.post<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', { email, password })
  localStorage.setItem('accessToken', data.accessToken)
  localStorage.setItem('refreshToken', data.refreshToken)
  localStorage.setItem('user', JSON.stringify(data.user))
  return data
}

export function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

export function getUser() {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('user')
  return raw ? JSON.parse(raw) : null
}
