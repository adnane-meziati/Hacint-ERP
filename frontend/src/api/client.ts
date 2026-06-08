import axios, { type AxiosInstance } from 'axios'

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem('auth')
  if (raw) {
    try {
      const { accessToken } = JSON.parse(raw)
      if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
    } catch {
      // ignore
    }
  }
  return config
})

// On 401: try to refresh once, then redirect to /login
let isRefreshing = false
let failQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

function processQueue(error: unknown, token: string | null): void {
  failQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)))
  failQueue = []
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return apiClient(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const raw = localStorage.getItem('auth')
      if (!raw) throw new Error('No auth state')
      const { refreshToken } = JSON.parse(raw)
      if (!refreshToken) throw new Error('No refresh token')

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/refresh`,
        { refresh: refreshToken },
      )
      const newAccess: string = data.access

      // Update stored token
      const authState = JSON.parse(raw)
      authState.accessToken = newAccess
      if (data.refresh) authState.refreshToken = data.refresh
      localStorage.setItem('auth', JSON.stringify(authState))

      apiClient.defaults.headers.common.Authorization = `Bearer ${newAccess}`
      processQueue(null, newAccess)
      originalRequest.headers.Authorization = `Bearer ${newAccess}`
      return apiClient(originalRequest)
    } catch (err) {
      processQueue(err, null)
      localStorage.removeItem('auth')
      window.location.href = '/login'
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  },
)

export default apiClient
