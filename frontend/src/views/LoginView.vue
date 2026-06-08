<template>
  <div class="min-h-screen flex" style="background-color: var(--bg-base)">

    <!-- Left: Brand panel (hidden on small screens) -->
    <div
      class="hidden lg:flex flex-col justify-between w-2/5 px-12 py-10 relative overflow-hidden"
      style="background-color: var(--bg-surface); border-right: 1px solid var(--border)"
    >
      <!-- Background geometric decoration -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-5" style="background: var(--accent)"></div>
        <div class="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-5" style="background: var(--accent-2)"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-3/4 opacity-10" style="background: linear-gradient(to bottom, transparent, var(--accent), transparent)"></div>
      </div>

      <!-- Top logo -->
      <div class="relative">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center font-black text-base"
            style="background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.3); color: var(--accent)"
          >M</div>
          <span class="font-bold text-lg tracking-widest" style="color: var(--text-hi)">MEGAINDUS</span>
        </div>
        <div class="mt-1 ml-13 text-xs tracking-wider uppercase" style="color: var(--text-lo); margin-left: 52px">ERP Platform</div>
      </div>

      <!-- Center content -->
      <div class="relative space-y-8">
        <!-- Accent line -->
        <div class="w-12 h-0.5 rounded" style="background: var(--accent)"></div>

        <div>
          <h1 class="text-3xl font-bold leading-tight mb-3" style="color: var(--text-hi)">
            Industrial Operations<br />Management Platform
          </h1>
          <p class="text-sm leading-relaxed" style="color: var(--text-md)">
            Integrated ERP for wire-harness manufacturing — 9 modules covering sales,
            procurement, inventory, production, quality, PLM, HR, finance and reporting.
          </p>
        </div>

        <!-- Module pills -->
        <div class="flex flex-wrap gap-2">
          <span v-for="mod in modules" :key="mod" class="px-2.5 py-1 rounded text-xs font-medium" style="background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-md)">
            {{ mod }}
          </span>
        </div>
      </div>

      <!-- Bottom site info -->
      <div class="relative">
        <div class="text-xs" style="color: var(--text-lo)">
          <div class="font-semibold mb-0.5" style="color: var(--text-md)">MEGAINDUS SARL</div>
          <div>TAC2 — Tanger Automotive City</div>
          <div class="mt-2 opacity-60">v2.0 · {{ new Date().getFullYear() }}</div>
        </div>
      </div>
    </div>

    <!-- Right: Login form panel -->
    <div class="flex flex-col flex-1 items-center justify-center px-6 py-10 relative">
      <!-- Language switch (top-right) -->
      <div class="absolute top-4 right-4 flex gap-1">
        <button
          v-for="l in (['fr', 'en'] as const)"
          :key="l"
          class="px-2 py-0.5 text-xs rounded font-medium transition-colors"
          :style="ui.lang === l ? 'background: var(--accent); color: #0B0F17;' : 'color: var(--text-lo); border: 1px solid var(--border)'"
          @click="switchLang(l)"
        >{{ l.toUpperCase() }}</button>
      </div>

      <!-- Mobile logo -->
      <div class="lg:hidden flex items-center gap-3 mb-10">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center font-black text-base" style="background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.3); color: var(--accent)">M</div>
        <span class="font-bold text-lg tracking-widest" style="color: var(--text-hi)">MEGAINDUS ERP</span>
      </div>

      <div class="w-full max-w-sm">
        <h2 class="text-xl font-bold mb-1" style="color: var(--text-hi)">Sign in to your account</h2>
        <p class="text-sm mb-8" style="color: var(--text-lo)">{{ t('login.subtitle') }}</p>

        <!-- Microsoft SSO placeholder -->
        <button
          type="button"
          disabled
          class="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded text-sm font-medium mb-4 cursor-not-allowed opacity-60"
          style="background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-md)"
          title="Coming soon"
        >
          <svg class="w-4 h-4" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
            <rect x="11" y="0" width="10" height="10" fill="#7FBA00"/>
            <rect x="0" y="11" width="10" height="10" fill="#00A4EF"/>
            <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
          </svg>
          Continue with Microsoft 365
          <span class="ml-auto text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide" style="background: var(--border); color: var(--text-lo)">soon</span>
        </button>

        <!-- Divider -->
        <div class="flex items-center gap-3 mb-4">
          <div class="flex-1 h-px" style="background: var(--border)"></div>
          <span class="text-xs" style="color: var(--text-lo)">or</span>
          <div class="flex-1 h-px" style="background: var(--border)"></div>
        </div>

        <!-- Error -->
        <div
          v-if="error"
          class="mb-4 px-4 py-3 rounded text-sm"
          style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: var(--danger)"
        >
          {{ error }}
        </div>

        <!-- Form -->
        <form class="space-y-4" @submit.prevent="handleLogin">
          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-md)" for="username">
              {{ t('login.username') }}
            </label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              autocomplete="username"
              required
              :disabled="loading"
              class="erp-input disabled:opacity-50"
              :placeholder="t('login.usernamePlaceholder')"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-md)" for="password">
              {{ t('login.password') }}
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                :disabled="loading"
                class="erp-input pr-10 disabled:opacity-50"
                :placeholder="t('login.passwordPlaceholder')"
              />
              <button
                type="button"
                tabindex="-1"
                class="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style="color: var(--text-lo)"
                @click="showPassword = !showPassword"
              >
                <svg v-if="!showPassword" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
              </button>
            </div>
          </div>

          <button
            type="submit"
            :disabled="loading || !form.username || !form.password"
            class="btn-primary w-full justify-center py-2.5 mt-2"
          >
            <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ loading ? t('login.signingIn') : t('login.signIn') }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const ui = useUiStore()

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

const modules = ['Sales', 'Purchase', 'Inventory', 'Manufacturing', 'Quality', 'PLM', 'HR', 'Finance', 'Reporting']

async function handleLogin(): Promise<void> {
  error.value = ''
  loading.value = true
  try {
    await auth.login({ username: form.username, password: form.password })
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (err: unknown) {
    const e = err as { response?: { status: number } }
    if (e.response?.status === 401) {
      error.value = t('login.invalidCredentials')
    } else {
      error.value = t('login.serverError')
    }
  } finally {
    loading.value = false
  }
}

function switchLang(l: 'fr' | 'en'): void {
  locale.value = l
  ui.setLang(l)
}
</script>
