import apiClient from './client'

export interface User {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  role: string
  phone: string
  avatar: string | null
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface TokenPair {
  access: string
  refresh?: string
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<{ access: string; refresh: string }> {
    const { data } = await apiClient.post('/auth/login', credentials)
    return data
  },

  async refresh(refreshToken: string): Promise<TokenPair> {
    const { data } = await apiClient.post('/auth/refresh', { refresh: refreshToken })
    return data
  },

  async logout(refreshToken: string): Promise<void> {
    await apiClient.post('/auth/logout', { refresh: refreshToken })
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get('/users/me')
    return data
  },
}
