<template>
  <div class="p-6 space-y-5">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ t('planning.ganttTitle') }}</h1>
      <RouterLink to="/planning" class="btn-secondary text-sm">← {{ t('nav.planning') }}</RouterLink>
    </div>

    <!-- Filters -->
    <div class="card flex flex-wrap gap-3 items-end">
      <div>
        <label class="form-label">{{ t('planning.filterStage') }}</label>
        <select v-model="filters.stage" class="form-input w-32" @change="load">
          <option value="">{{ t('common.all') }}</option>
          <option v-for="s in STAGES" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div>
        <label class="form-label">{{ t('common.from') }}</label>
        <input v-model="filters.from" class="form-input w-36" type="date" @change="load" />
      </div>
      <div>
        <label class="form-label">{{ t('common.to') }}</label>
        <input v-model="filters.to" class="form-input w-36" type="date" @change="load" />
      </div>
      <div>
        <label class="form-label">{{ t('planning.limit') }}</label>
        <select v-model.number="filters.limit" class="form-input w-24" @change="load">
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </div>
      <button class="btn-secondary" @click="reset">{{ t('common.reset') }}</button>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap gap-4 text-xs">
      <span v-for="s in LEGEND" :key="s.key" class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm" :class="s.bg" />
        {{ t(`stages.status.${s.key}`) }}
      </span>
    </div>

    <!-- Gantt table -->
    <div v-if="loading" class="card h-64 animate-pulse" />

    <div v-else-if="!lines.length" class="card text-center py-12 text-slate-400">
      {{ t('common.noData') }}
    </div>

    <div v-else class="card overflow-x-auto p-0">
      <table class="min-w-full text-sm border-collapse">
        <thead>
          <tr class="text-xs text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <th class="text-left py-2 px-4 w-56 sticky left-0 bg-slate-50 dark:bg-slate-800/80 z-10">{{ t('planning.line') }}</th>
            <th class="text-left py-2 px-3 w-28">{{ t('orders.deliveryDate') }}</th>
            <th
              v-for="s in STAGES"
              :key="s"
              class="text-center py-2 px-1 w-20"
            >
              {{ s }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="line in lines"
            :key="line.id"
            class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
          >
            <!-- Line identity -->
            <td class="py-2 px-4 sticky left-0 bg-white dark:bg-gray-900 z-10">
              <RouterLink
                :to="`/orders/${line.order_id}`"
                class="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline block"
              >
                OP{{ line.order_n_ordre }} / S{{ line.n_serie }}
              </RouterLink>
              <span class="text-xs text-slate-500 truncate block max-w-[12rem]">{{ line.article_ref }}</span>
              <span
                v-if="line.priority === 'urgent'"
                class="text-[10px] font-bold text-red-600 dark:text-red-400"
              >
                ⚡ URGENT
              </span>
            </td>

            <!-- Delivery date -->
            <td class="py-2 px-3">
              <span
                class="text-xs font-mono"
                :class="isLate(line.delivery_date) ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-600 dark:text-slate-300'"
              >
                {{ formatDate(line.delivery_date) }}
              </span>
            </td>

            <!-- Stage cells -->
            <td
              v-for="stageCode in STAGES"
              :key="stageCode"
              class="py-2 px-1 text-center"
            >
              <GanttCell :event="eventByStage(line, stageCode)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { planningApi, type GanttLine, type GanttEvent } from '@/api/planning'

const { t } = useI18n()

const STAGES = ['ECH', 'CAD', 'CAM', 'CNC', 'MTG', 'QF', 'AQC']

const LEGEND = [
  { key: 'done',        bg: 'bg-green-500' },
  { key: 'in_progress', bg: 'bg-blue-500' },
  { key: 'blocked',     bg: 'bg-red-500' },
  { key: 'pending',     bg: 'bg-slate-200 dark:bg-slate-600' },
]

const lines = ref<GanttLine[]>([])
const loading = ref(true)
const filters = reactive({ stage: '', from: '', to: '', limit: 50 })

function eventByStage(line: GanttLine, code: string): GanttEvent | null {
  return line.events.find(e => e.stage === code) ?? null
}

function isLate(dateStr: string): boolean {
  return new Date(dateStr) < new Date(new Date().toDateString())
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-MA', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(iso))
}

async function load(): Promise<void> {
  loading.value = true
  try {
    lines.value = await planningApi.gantt({
      stage: filters.stage || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      limit: filters.limit,
    })
  } finally {
    loading.value = false
  }
}

function reset(): void {
  filters.stage = ''
  filters.from = ''
  filters.to = ''
  filters.limit = 50
  load()
}

// ── Inline GanttCell component ────────────────────────────────────────────────
const GanttCell = defineComponent({
  props: { event: { type: Object as () => GanttEvent | null, default: null } },
  setup(props) {
    return () => {
      const ev = props.event
      if (!ev) {
        return h('div', {
          class: 'w-8 h-8 rounded mx-auto bg-slate-100 dark:bg-slate-700 flex items-center justify-center',
          title: 'Non applicable',
        }, h('span', { class: 'text-slate-300 text-xs' }, '—'))
      }

      const colorMap: Record<string, string> = {
        done:        'bg-green-500 text-white',
        in_progress: 'bg-blue-500 text-white animate-pulse',
        blocked:     'bg-red-500 text-white',
        pending:     'bg-slate-200 dark:bg-slate-600 text-slate-400',
      }
      const iconMap: Record<string, string> = {
        done: '✓', in_progress: '▶', blocked: '⚠', pending: '·',
      }

      return h('div', {
        class: `w-8 h-8 rounded mx-auto flex items-center justify-center text-xs font-bold cursor-default ${colorMap[ev.status] ?? 'bg-slate-200'}`,
        title: ev.comment ? `${ev.status} — ${ev.comment}` : ev.status,
      }, iconMap[ev.status] ?? '?')
    }
  },
})

onMounted(load)
</script>

<style scoped>
.card { @apply bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5; }
.form-label { @apply block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1; }
.form-input {
  @apply w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
         text-sm text-slate-800 dark:text-slate-100 px-3 py-2
         focus:outline-none focus:ring-2 focus:ring-primary/50;
}
.btn-secondary {
  @apply px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600
         text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700
         text-sm font-medium transition-colors;
}
</style>
