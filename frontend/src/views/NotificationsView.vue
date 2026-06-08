<template>
  <div class="p-6 space-y-4 max-w-3xl">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ t('nav.notifications') }}</h1>
      <button
        v-if="unread > 0"
        class="btn-secondary text-sm"
        :disabled="marking"
        @click="markAll"
      >
        {{ t('notif.markAllRead') }}
      </button>
    </div>

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 5" :key="i" class="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
    </div>

    <div v-else-if="!items.length" class="card text-center py-12 text-slate-400">
      {{ t('notif.empty') }}
    </div>

    <TransitionGroup v-else name="list" tag="div" class="space-y-2">
      <div
        v-for="n in items"
        :key="n.id"
        class="card flex items-start gap-3 transition-all"
        :class="{ 'opacity-60': !!n.read_at }"
      >
        <!-- Level icon -->
        <div class="mt-0.5 shrink-0">
          <span
            class="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold"
            :class="levelClass(n.level)"
          >
            <svg v-if="n.level === 'info'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg v-else-if="n.level === 'warning'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <p class="text-sm text-slate-800 dark:text-slate-100 leading-snug">{{ n.message }}</p>
          <div class="flex items-center gap-3 mt-1">
            <span class="text-xs text-slate-400">{{ formatDate(n.created_at) }}</span>
            <RouterLink
              v-if="n.link"
              :to="n.link"
              class="text-xs text-primary hover:underline"
            >
              {{ t('notif.viewDetail') }}
            </RouterLink>
          </div>
        </div>

        <!-- Unread dot + mark read -->
        <div class="flex items-center gap-2 shrink-0">
          <span
            v-if="!n.read_at"
            class="w-2 h-2 rounded-full bg-primary"
          />
          <button
            v-if="!n.read_at"
            class="text-xs text-slate-400 hover:text-primary transition-colors px-1"
            @click="markOne(n.id)"
          >
            ✓
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { notificationsApi, type Notification } from '@/api/notifications'

const { t } = useI18n()

const items = ref<Notification[]>([])
const loading = ref(true)
const marking = ref(false)

const unread = computed(() => items.value.filter(n => !n.read_at).length)

function levelClass(level: Notification['level']): string {
  if (level === 'info') return 'bg-blue-500'
  if (level === 'warning') return 'bg-yellow-500'
  return 'bg-red-500'
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-MA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

async function markOne(id: string): Promise<void> {
  const updated = await notificationsApi.markRead(id)
  const idx = items.value.findIndex(n => n.id === id)
  if (idx !== -1) items.value[idx] = updated
}

async function markAll(): Promise<void> {
  marking.value = true
  try {
    await notificationsApi.markAllRead()
    const now = new Date().toISOString()
    items.value = items.value.map(n => ({ ...n, read_at: n.read_at ?? now }))
  } finally {
    marking.value = false
  }
}

onMounted(async () => {
  try {
    items.value = await notificationsApi.list()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.card { @apply bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4; }
.btn-secondary {
  @apply px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300
         hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors;
}
.list-move, .list-enter-active, .list-leave-active { transition: all 0.2s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateX(-12px); }
</style>
