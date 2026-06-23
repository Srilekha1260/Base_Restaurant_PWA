const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('accessToken')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    throw new Error('UNAUTHORIZED')
  }
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: any) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: any) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
}

export async function kitchenLogin(email: string, password: string) {
  const data = await api.post<{ accessToken: string; user: any }>('/auth/login', { email, password })
  localStorage.setItem('accessToken', data.accessToken)
  localStorage.setItem('user', JSON.stringify(data.user))
  return data
}

export function getUser() {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('user')
  return raw ? JSON.parse(raw) : null
}
