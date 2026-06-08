<template>
  <aside
    class="flex flex-col shrink-0 border-r overflow-hidden transition-[width] duration-200"
    :class="ui.sidebarOpen ? 'w-60' : 'w-0'"
    style="background-color: var(--bg-surface); border-color: var(--border)"
  >
    <!-- Brand -->
    <div class="flex items-center h-16 px-4 border-b shrink-0" style="border-color: var(--border)">
      <div
        class="w-8 h-8 rounded flex items-center justify-center mr-3 shrink-0 font-black text-xs"
        style="background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.3); color: var(--accent)"
      >H</div>
      <div class="min-w-0">
        <div class="font-bold text-sm tracking-widest truncate leading-tight" style="color: var(--text-hi)">HACINT</div>
        <div class="text-[10px] tracking-wider uppercase truncate" style="color: var(--text-lo)">ERP · TAC2</div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-2 px-2">

      <!-- Dashboard -->
      <RouterLink to="/" exact-active-class="nav-link-active" active-class="" class="nav-link">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
        <span>{{ t('nav.dashboard') }}</span>
      </RouterLink>

      <!-- COMMERCIAL -->
      <div class="nav-section-label">Commercial</div>
      <RouterLink to="/sales" active-class="nav-link-active" class="nav-link">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
        <span>{{ t('nav.sales') }}</span>
      </RouterLink>
      <RouterLink to="/purchase" active-class="nav-link-active" class="nav-link">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
        <span>{{ t('nav.purchase') }}</span>
      </RouterLink>

      <!-- SUPPLY CHAIN -->
      <div class="nav-section-label">Supply Chain</div>
      <RouterLink to="/inventory" active-class="nav-link-active" class="nav-link">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
        <span>{{ t('nav.inventory') }}</span>
      </RouterLink>

      <!-- MANUFACTURING -->
      <div class="nav-section-label">Manufacturing</div>
      <RouterLink to="/manufacturing" active-class="nav-link-active" class="nav-link">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        <span>{{ t('nav.manufacturing') }}</span>
      </RouterLink>
      <RouterLink to="/plm" active-class="nav-link-active" class="nav-link">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
        <span>{{ t('nav.plm') }}</span>
      </RouterLink>
      <RouterLink to="/quality" active-class="nav-link-active" class="nav-link">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span>{{ t('nav.quality') }}</span>
      </RouterLink>

      <!-- BUSINESS -->
      <div class="nav-section-label">Business</div>
      <RouterLink to="/hr" active-class="nav-link-active" class="nav-link">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
        <span>{{ t('nav.hr') }}</span>
      </RouterLink>
      <RouterLink to="/finance" active-class="nav-link-active" class="nav-link">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span>{{ t('nav.finance') }}</span>
      </RouterLink>
      <RouterLink to="/reporting" active-class="nav-link-active" class="nav-link">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        <span>{{ t('nav.reporting') }}</span>
      </RouterLink>

      <!-- CNC OPERATIONS -->
      <div class="nav-section-label">CNC Ops</div>
      <RouterLink to="/orders" active-class="nav-link-active" class="nav-link">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        <span>{{ t('nav.orders') }}</span>
      </RouterLink>
      <RouterLink to="/articles" active-class="nav-link-active" class="nav-link">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
        <span>{{ t('nav.articles') }}</span>
      </RouterLink>
      <RouterLink to="/workflow" active-class="nav-link-active" class="nav-link">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 010 2H5a1 1 0 01-1-1zm0 7a1 1 0 011-1h4a1 1 0 010 2H5a1 1 0 01-1-1zm10-7a1 1 0 011-1h4a1 1 0 010 2h-4a1 1 0 01-1-1zm0 7a1 1 0 011-1h4a1 1 0 010 2h-4a1 1 0 01-1-1zm-10 5a1 1 0 011-1h4a1 1 0 010 2H5a1 1 0 01-1-1zm10 0a1 1 0 011-1h4a1 1 0 010 2h-4a1 1 0 01-1-1z"/></svg>
        <span>{{ t('nav.workflow') }}</span>
      </RouterLink>
      <RouterLink to="/jimide-4030" active-class="nav-link-active" class="nav-link">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        <span>JIMIDE-4030</span>
      </RouterLink>
      <RouterLink to="/planning" active-class="nav-link-active" class="nav-link">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
        <span>{{ t('nav.planning') }}</span>
      </RouterLink>
    </nav>

    <!-- Footer: notifications + role queue + admin links -->
    <div class="px-2 pb-3 pt-2 border-t" style="border-color: var(--border)">
      <RouterLink to="/notifications" active-class="nav-link-active" class="nav-link">
        <span class="relative w-4 h-4 shrink-0 flex items-center justify-center">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          <span v-if="hasUnread" class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full" style="background: var(--danger)"></span>
        </span>
        <span>{{ t('nav.notifications') }}</span>
      </RouterLink>

      <template v-if="auth.user?.role === 'admin'">
        <RouterLink to="/admin/users" active-class="nav-link-active" class="nav-link">
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
          <span>{{ t('nav.users') }}</span>
        </RouterLink>
        <RouterLink to="/admin/settings" active-class="nav-link-active" class="nav-link">
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span>{{ t('nav.settings') }}</span>
        </RouterLink>
      </template>

      <!-- Role stage shortcut -->
      <RouterLink
        v-if="userStageCode"
        :to="`/queue/${userStageCode}`"
        active-class="nav-link-active"
        class="nav-link mt-1"
      >
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        <span>{{ userStageLabel }}</span>
      </RouterLink>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { notificationsApi } from '@/api/notifications'

const { t } = useI18n()
const ui = useUiStore()
const auth = useAuthStore()

const hasUnread = ref(false)

const ROLE_STAGE: Record<string, { code: string; label: string }> = {
  designer:   { code: 'CAD', label: 'Dessin' },
  programmer: { code: 'CAM', label: 'CAM' },
  operator:   { code: 'CNC', label: 'CNC' },
  assembly:   { code: 'MTG', label: 'Montage' },
  qc:         { code: 'QF',  label: 'Qualité' },
}

const userStageCode = computed(() => ROLE_STAGE[auth.user?.role ?? '']?.code)
const userStageLabel = computed(() => ROLE_STAGE[auth.user?.role ?? '']?.label || t('nav.queue'))

onMounted(async () => {
  if (auth.isAuthenticated) {
    try {
      const list = await notificationsApi.list()
      hasUnread.value = list.some((n: { read_at: string | null }) => !n.read_at)
    } catch { /* best-effort */ }
  }
})
</script>
