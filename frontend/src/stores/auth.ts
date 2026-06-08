import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import type { User, LoginCredentials } from '@/api/auth'

export const useAuthStore = defineStore(
  'auth',
  () => {
    const user = ref<User | null>(null)
    const accessToken = ref<string | null>(null)
    const refreshToken = ref<string | null>(null)

    const isAuthenticated = computed(() => !!accessToken.value && !!user.value)

    async function login(credentials: LoginCredentials): Promise<void> {
      const tokens = await authApi.login(credentials)
      accessToken.value = tokens.access
      refreshToken.value = tokens.refresh
      await fetchMe()
    }

    async function fetchMe(): Promise<void> {
      user.value = await authApi.me()
    }

    async function refreshTokens(): Promise<string> {
      if (!refreshToken.value) throw new Error('No refresh token')
      const tokens = await authApi.refresh(refreshToken.value)
      accessToken.value = tokens.access
      if (tokens.refresh) refreshToken.value = tokens.refresh
      return tokens.access
    }

    async function logout(): Promise<void> {
      if (refreshToken.value) {
        try {
          await authApi.logout(refreshToken.value)
        } catch {
          // best-effort
        }
      }
      user.value = null
      accessToken.value = null
      refreshToken.value = null
    }

    return { user, accessToken, refreshToken, isAuthenticated, login, logout, fetchMe, refreshTokens }
  },
  {
    persist: {
      paths: ['accessToken', 'refreshToken', 'user'],
    },
  },
)
