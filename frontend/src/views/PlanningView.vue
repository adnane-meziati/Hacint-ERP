<template>
  <div class="p-6 space-y-5">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ t('nav.planning') }}</h1>
      <RouterLink to="/gantt" class="btn-secondary text-sm flex items-center gap-1.5">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        {{ t('planning.ganttView') }}
      </RouterLink>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-slate-200 dark:border-slate-700">
      <button
        v-for="tab in tabs"
        :key="tab"
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === tab
          ? 'border-primary text-primary'
          : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'"
        @click="activeTab = tab"
      >
        {{ t(`planning.tab_${tab}`) }}
      </button>
    </div>

    <!-- TAB: current load -->
    <template v-if="activeTab === 'current'">
      <div v-if="loadLoading" class="card h-64 animate-pulse" />

      <div v-else-if="stageLoad.length" class="card">
        <h2 class="text-base font-semibold mb-4 text-gray-800 dark:text-gray-100">
          {{ t('planning.loadTitle') }}
        </h2>
        <div class="h-72">
          <Bar :data="currentChartData" :options="chartOptions" />
        </div>
      </div>

      <!-- Detail table -->
      <div v-if="stageLoad.length" class="card">
        <h2 class="text-base font-semibold mb-3 text-gray-800 dark:text-gray-100">{{ t('planning.detail') }}</h2>
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-2 px-3">{{ t('planning.stage') }}</th>
              <th class="text-right py-2 px-3">{{ t('planning.total') }}</th>
              <th class="text-right py-2 px-3">{{ t('planning.enCours') }}</th>
              <th class="text-right py-2 px-3">{{ t('planning.urgent') }}</th>
              <th class="py-2 px-3">{{ t('planning.load') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in stageLoad"
              :key="s.code"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td class="py-2 px-3 font-mono font-semibold text-blue-700 dark:text-blue-400">
                {{ s.code }}
                <span class="ml-2 text-xs font-normal text-gray-500">{{ s.name }}</span>
              </td>
              <td class="py-2 px-3 text-right">{{ s.total }}</td>
              <td class="py-2 px-3 text-right text-yellow-700 dark:text-yellow-400">{{ s.en_cours }}</td>
              <td class="py-2 px-3 text-right text-red-600 dark:text-red-400">{{ s.urgent }}</td>
              <td class="py-2 px-3 w-40">
                <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-blue-500 rounded-full transition-all"
                    :style="{ width: `${maxTotal > 0 ? Math.round((s.en_cours / maxTotal) * 100) : 0}%` }"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- TAB: weekly forecast -->
    <template v-if="activeTab === 'weekly'">
      <!-- Week count selector -->
      <div class="flex items-center gap-3">
        <span class="text-sm text-slate-600 dark:text-slate-400">{{ t('planning.showWeeks') }}</span>
        <div class="flex gap-1">
          <button
            v-for="w in [2, 4, 8, 12]"
            :key="w"
            class="px-2.5 py-1 text-xs rounded-lg border transition-colors"
            :class="weekCount === w
              ? 'bg-primary text-white border-primary'
              : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'"
            @click="setWeekCount(w)"
          >
            {{ w }}
          </button>
        </div>
      </div>

      <div v-if="weeklyLoading" class="card h-72 animate-pulse" />

      <div v-else-if="weekly" class="card">
        <h2 class="text-base font-semibold mb-4 text-gray-800 dark:text-gray-100">
          {{ t('planning.weeklyTitle') }}
        </h2>
        <div class="h-80">
          <Bar :data="weeklyChartData" :options="weeklyChartOptions" />
        </div>
      </div>

      <!-- Weekly table -->
      <div v-if="weekly" class="card overflow-x-auto p-0">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-xs text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th class="text-left py-2 px-4 font-semibold">{{ t('planning.week') }}</th>
              <th
                v-for="code in weekly.stages"
                :key="code"
                class="text-right py-2 px-3"
              >
                {{ code }}
              </th>
              <th class="text-right py-2 px-4 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in weekly.weeks"
              :key="row.week"
              class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <td class="py-2 px-4">
                <span class="font-mono text-xs font-medium text-slate-600 dark:text-slate-300">{{ row.week }}</span>
                <span class="ml-2 text-xs text-slate-400">{{ row.label }}</span>
              </td>
              <td
                v-for="code in weekly.stages"
                :key="code"
                class="py-2 px-3 text-right"
                :class="(row[code] as number) > 0 ? 'text-blue-700 dark:text-blue-400 font-medium' : 'text-slate-300 dark:text-slate-600'"
              >
                {{ row[code] ?? 0 }}
              </td>
              <td class="py-2 px-4 text-right font-semibold">{{ row.total }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { dashboardsApi, type LoadStage } from '@/api/dashboards'
import { planningApi, type WeeklyCapacity } from '@/api/planning'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const { t } = useI18n()

type Tab = 'current' | 'weekly'
const tabs: Tab[] = ['current', 'weekly']
const activeTab = ref<Tab>('current')

// ── Current load ──────────────────────────────────────────────────────────────
const stageLoad = ref<LoadStage[]>([])
const loadLoading = ref(true)
const error = ref('')

const maxTotal = computed(() => Math.max(1, ...stageLoad.value.map(s => s.en_cours)))

const currentChartData = computed(() => ({
  labels: stageLoad.value.map(s => s.code),
  datasets: [
    {
      label: t('planning.enCours'),
      data: stageLoad.value.map(s => s.en_cours),
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1,
      borderRadius: 4,
    },
    {
      label: t('planning.urgent'),
      data: stageLoad.value.map(s => s.urgent),
      backgroundColor: 'rgba(239, 68, 68, 0.7)',
      borderColor: 'rgba(239, 68, 68, 1)',
      borderWidth: 1,
      borderRadius: 4,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const },
    tooltip: { mode: 'index' as const, intersect: false },
  },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
}

// ── Weekly forecast ───────────────────────────────────────────────────────────
const weekly = ref<WeeklyCapacity | null>(null)
const weeklyLoading = ref(false)
const weekCount = ref(4)

const STAGE_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b',
  '#10b981', '#ef4444', '#ec4899', '#64748b',
]

const weeklyChartData = computed(() => {
  if (!weekly.value) return { labels: [], datasets: [] }
  const { weeks, stages } = weekly.value
  return {
    labels: weeks.map(w => w.label),
    datasets: stages.map((code, i) => ({
      label: code,
      data: weeks.map(w => (w[code] as number) ?? 0),
      backgroundColor: STAGE_COLORS[i % STAGE_COLORS.length],
      borderRadius: 3,
      stack: 'load',
    })),
  }
})

const weeklyChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const },
    tooltip: { mode: 'index' as const, intersect: false },
  },
  scales: {
    x: { stacked: true },
    y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
  },
}

async function loadWeekly(): Promise<void> {
  weeklyLoading.value = true
  try {
    weekly.value = await planningApi.weekly(weekCount.value)
  } catch {
    error.value = t('common.error')
  } finally {
    weeklyLoading.value = false
  }
}

async function setWeekCount(n: number): Promise<void> {
  weekCount.value = n
  await loadWeekly()
}

watch(activeTab, tab => {
  if (tab === 'weekly' && !weekly.value) loadWeekly()
})

onMounted(async () => {
  try {
    stageLoad.value = await dashboardsApi.load()
  } catch (e: any) {
    error.value = e?.response?.data?.detail ?? t('common.error')
  } finally {
    loadLoading.value = false
  }
})
</script>

<style scoped>
.card { @apply bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5; }
.btn-secondary {
  @apply px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600
         text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700
         text-sm font-medium transition-colors;
}
</style>
