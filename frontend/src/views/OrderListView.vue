<template>
  <div class="p-6 space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ t('nav.orders') }}</h1>
      <div class="flex gap-3">
        <!-- Import button — admin only -->
        <template v-if="auth.user?.role === 'admin'">
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx,.xls"
            class="hidden"
            @change="onFileSelected"
          />
          <button
            class="btn-secondary"
            :disabled="importing"
            @click="fileInput?.click()"
          >
            <span v-if="importing">⏳ Import…</span>
            <span v-else>↑ Import Excel</span>
          </button>
        </template>

        <button
          class="btn-secondary"
          @click="exportXlsx"
        >
          ↓ Export Excel
        </button>
        <router-link to="/orders/new" class="btn-primary">
          + {{ t('orders.new') }}
        </router-link>
      </div>
    </div>

    <!-- Import result modal -->
    <div
      v-if="importLog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="importLog = ''"
    >
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <h2 class="text-lg font-bold text-slate-800 dark:text-white">✅ Import terminé</h2>
        <pre class="text-xs bg-slate-100 dark:bg-slate-900 rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap">{{ importLog }}</pre>
        <div class="flex justify-end">
          <button class="btn-primary" @click="importLog = ''; load()">OK</button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <FilterBar
      :show-search="true"
      :show-status="true"
      :show-priority="true"
      :show-client="true"
      :show-family="true"
      :show-dates="true"
      :families="articlesStore.families"
      @change="onFilterChange"
    />

    <!-- Table -->
    <DataTable
      :columns="columns"
      :rows="(store.orders as any[])"
      row-key="id"
      :total="store.total"
      :current-page="page"
      :page-size="pageSize"
      @row-click="(row: any) => router.push(`/orders/${row.id}`)"
      @page-change="onPageChange"
      @sort-change="onSortChange"
    >
      <template #cell-status="{ value }">
        <span
          class="px-2 py-0.5 rounded-full text-xs font-medium"
          :class="statusClass(value)"
        >{{ value }}</span>
      </template>
      <template #cell-priority_badge="{ row }">
        <PriorityBadge :priority="row.priority" />
      </template>
      <template #cell-delivery_date="{ value }">
        <span :class="isLate(value) ? 'text-red-500 font-semibold' : ''">{{ value }}</span>
      </template>
    </DataTable>

    <div v-if="store.error" class="text-red-500 text-sm">{{ store.error }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useOrdersStore } from '@/stores/orders'
import { useArticlesStore } from '@/stores/articles'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { exportsApi, importsApi } from '@/api/orders'
import DataTable from '@/components/DataTable.vue'
import FilterBar from '@/components/FilterBar.vue'
import PriorityBadge from '@/components/PriorityBadge.vue'
import type { Column } from '@/components/DataTable.vue'

const { t } = useI18n()
const router = useRouter()
const store = useOrdersStore()
const articlesStore = useArticlesStore()
const auth = useAuthStore()
const ui = useUiStore()

const fileInput = ref<HTMLInputElement | null>(null)
const importing = ref(false)
const importLog = ref('')

const page = ref(1)
const pageSize = 20
const filters = ref<Record<string, string>>({})
const ordering = ref('')

const columns: Column[] = [
  { key: 'n_ordre',       label: 'N° OP' },
  { key: 'client_code',   label: 'Client' },
  { key: 'delivery_date', label: 'Livraison' },
  { key: 'status',        label: 'Statut' },
  { key: 'priority_badge',label: 'Priorité', sortable: false },
  { key: 'line_count',    label: 'Lignes' },
]

function load() {
  store.fetchOrders({
    ...filters.value,
    page: page.value,
    page_size: pageSize,
    ordering: ordering.value || undefined,
  })
}

function onFilterChange(f: Record<string, string>) {
  filters.value = f
  page.value = 1
  load()
}

function onPageChange(p: number) {
  page.value = p
  load()
}

function onSortChange(key: string, dir: 'asc' | 'desc') {
  ordering.value = dir === 'desc' ? `-${key}` : key
  load()
}

function exportXlsx() {
  const url = exportsApi.opXlsxUrl(filters.value.from_date, filters.value.to_date)
  window.open(url, '_blank')
}

async function onFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  importing.value = true
  try {
    const result = await importsApi.uploadOp(file)
    importLog.value = result.log || result.detail || 'Import terminé.'
  } catch (err: any) {
    ui.addToast('error', err?.response?.data?.detail || 'Erreur lors de l\'import.')
  } finally {
    importing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function statusClass(status: string): string {
  if (status === 'en_cours') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
  if (status === 'livree')   return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
  return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
}

function isLate(dateStr: string): boolean {
  return dateStr ? new Date(dateStr) < new Date() : false
}

onMounted(() => {
  articlesStore.fetchFamilies()
  load()
})
</script>

<style scoped>
.btn-primary {
  @apply px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors;
}
.btn-secondary {
  @apply px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors;
}
</style>
