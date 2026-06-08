<template>
  <div class="p-6 space-y-5">
    <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ t('nav.articles') }}</h1>

    <FilterBar
      :show-search="true"
      :show-status="false"
      :show-priority="false"
      :show-family="true"
      :families="store.families"
      @change="onFilterChange"
    />

    <DataTable
      :columns="columns"
      :rows="(store.articles as any[])"
      row-key="id"
      :total="store.total"
      :current-page="page"
      :page-size="pageSize"
      @row-click="(row: any) => router.push(`/articles/${row.id}`)"
      @page-change="onPageChange"
      @sort-change="onSortChange"
    >
      <template #cell-family_code="{ value }">
        <span class="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs font-mono">
          {{ value }}
        </span>
      </template>
      <template #cell-revision_count="{ value }">
        <span class="text-gray-500 text-xs">{{ value }} rév.</span>
      </template>
    </DataTable>

    <div v-if="store.error" class="text-red-500 text-sm">{{ store.error }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useArticlesStore } from '@/stores/articles'
import DataTable from '@/components/DataTable.vue'
import FilterBar from '@/components/FilterBar.vue'
import type { Column } from '@/components/DataTable.vue'

const { t } = useI18n()
const router = useRouter()
const store = useArticlesStore()

const page = ref(1)
const pageSize = 20
const filters = ref<Record<string, string>>({})
const ordering = ref('')

const columns: Column[] = [
  { key: 'ref_client',     label: 'Référence' },
  { key: 'description',    label: 'Désignation' },
  { key: 'family_code',    label: 'Famille', sortable: false },
  { key: 'revision_count', label: 'Révisions', sortable: false },
]

function load() {
  store.fetchArticles({
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

function onPageChange(p: number) { page.value = p; load() }
function onSortChange(key: string, dir: string) {
  ordering.value = dir === 'desc' ? `-${key}` : key
  load()
}

onMounted(() => {
  store.fetchFamilies()
  load()
})
</script>
