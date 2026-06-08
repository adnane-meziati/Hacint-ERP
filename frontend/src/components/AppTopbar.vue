<template>
  <header
    class="flex items-center justify-between px-4 shrink-0 border-b"
    style="height: 64px; background-color: var(--bg-surface); border-color: var(--border)"
  >
    <!-- Left: hamburger -->
    <button
      class="p-1.5 rounded transition-colors"
      style="color: var(--text-lo)"
      @mouseenter="($event.target as HTMLElement).style.color = 'var(--text-hi)'"
      @mouseleave="($event.target as HTMLElement).style.color = 'var(--text-lo)'"
      @click="ui.toggleSidebar"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <!-- Right: lang + dark mode + notifications + user -->
    <div class="flex items-center gap-2">
      <!-- Language switch -->
      <div class="flex gap-1">
        <button
          v-for="l in (['fr', 'en'] as const)"
          :key="l"
          class="px-2 py-0.5 text-xs rounded font-medium transition-colors"
          :style="
            ui.lang === l
              ? 'background: var(--accent); color: #0B0F17;'
              : 'color: var(--text-lo);'
          "
          @click="switchLang(l)"
        >
          {{ l.toUpperCase() }}
        </button>
      </div>

      <!-- Dark mode toggle -->
      <button
        class="p-1.5 rounded transition-colors"
        style="color: var(--text-lo)"
        @click="ui.toggleDark"
        :title="ui.darkMode ? 'Switch to light' : 'Switch to dark'"
      >
        <svg v-if="!ui.darkMode" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </button>

      <!-- Notification bell -->
      <RouterLink
        to="/notifications"
        class="relative p-1.5 rounded transition-colors"
        style="color: var(--text-lo)"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span
          v-if="unreadCount > 0"
          class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full text-[10px] font-bold"
          style="background: var(--danger); color: white"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </RouterLink>

      <!-- User menu -->
      <div class="relative" ref="userMenuRef">
        <button
          class="flex items-center gap-2 px-2 py-1.5 rounded transition-colors"
          style="color: var(--text-md)"
          @click="menuOpen = !menuOpen"
        >
          <div
            class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden"
            style="background: rgba(0,212,255,0.15); border: 1px solid rgba(0,212,255,0.3); color: var(--accent)"
          >
            <img v-if="auth.user?.avatar" :src="auth.user.avatar" class="w-full h-full object-cover" alt="" />
            <span v-else>{{ initials }}</span>
          </div>
          <span class="hidden sm:block text-sm font-medium" style="color: var(--text-md)">
            {{ auth.user?.username }}
          </span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--text-lo)">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <Transition name="dropdown">
          <div
            v-if="menuOpen"
            class="absolute right-0 mt-1 w-48 rounded-lg shadow-xl py-1 z-50"
            style="background: var(--bg-elevated); border: 1px solid var(--border)"
          >
            <div class="px-4 py-2 border-b" style="border-color: var(--border)">
              <p class="text-sm font-semibold" style="color: var(--text-hi)">{{ auth.user?.username }}</p>
              <p class="text-xs capitalize" style="color: var(--text-lo)">{{ auth.user?.role }}</p>
            </div>
            <RouterLink
              to="/profile"
              class="flex items-center gap-2 px-4 py-2 text-sm transition-colors"
              style="color: var(--text-md)"
              @click="menuOpen = false"
            >
              {{ t('nav.profile') }}
            </RouterLink>
            <RouterLink
              v-if="auth.user?.role === 'admin'"
              to="/admin/users"
              class="flex items-center gap-2 px-4 py-2 text-sm transition-colors"
              style="color: var(--text-md)"
              @click="menuOpen = false"
            >
              {{ t('nav.users') }}
            </RouterLink>
            <button
              class="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors"
              style="color: var(--danger)"
              @click="handleLogout"
            >
              {{ t('nav.logout') }}
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { notificationsApi } from '@/api/notifications'

const { t, locale } = useI18n()
const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()

const menuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)
const unreadCount = ref(0)

const initials = computed(() => {
  const u = auth.user
  if (!u) return '?'
  if (u.first_name) return u.first_name[0].toUpperCase()
  return u.username[0].toUpperCase()
})

async function handleLogout(): Promise<void> {
  menuOpen.value = false
  await auth.logout()
  router.push('/login')
}

function switchLang(l: 'fr' | 'en'): void {
  locale.value = l
  ui.setLang(l)
}

function onClickOutside(e: MouseEvent): void {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
    menuOpen.value = false
  }
}

async function fetchUnread(): Promise<void> {
  try {
    const list = await notificationsApi.list()
    unreadCount.value = list.filter((n: { read_at: string | null }) => !n.read_at).length
  } catch { /* best-effort */ }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  if (auth.isAuthenticated) fetchUnread()
})
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
