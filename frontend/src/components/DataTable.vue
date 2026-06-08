<template>
  <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead class="bg-gray-50 dark:bg-gray-800">
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none"
            @click="col.sortable !== false && toggleSort(col.key)"
          >
            <span class="flex items-center gap-1">
              {{ col.label }}
              <span v-if="col.sortable !== false" class="text-gray-400">
                <span v-if="sortKey === col.key">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                <span v-else class="opacity-30">↕</span>
              </span>
            </span>
          </th>
          <th v-if="$slots.actions" class="px-4 py-3" />
        </tr>
      </thead>
      <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
        <tr
          v-for="(row, idx) in rows"
          :key="rowKey ? (row as any)[rowKey] : idx"
          class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          @click="$emit('row-click', row)"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100"
          >
            <slot :name="`cell-${col.key}`" :row="row" :value="(row as any)[col.key]">
              {{ (row as any)[col.key] ?? '—' }}
            </slot>
          </td>
          <td v-if="$slots.actions" class="px-4 py-3 text-right">
            <slot name="actions" :row="row" />
          </td>
        </tr>
        <tr v-if="rows.length === 0">
          <td
            :colspan="columns.length + ($slots.actions ? 1 : 0)"
            class="px-4 py-8 text-center text-sm text-gray-400"
          >
            {{ emptyText }}
          </td>
        </tr>
      </tbody>
    </table>

    <div
      v-if="totalPages > 1"
      class="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
    >
      <span class="text-sm text-gray-500 dark:text-gray-400">
        Page {{ currentPage }} / {{ totalPages }} ({{ total }} résultats)
      </span>
      <div class="flex gap-2">
        <button
          :disabled="currentPage <= 1"
          class="px-3 py-1 rounded text-sm border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800"
          @click="$emit('page-change', currentPage - 1)"
        >Préc</button>
        <button
          :disabled="currentPage >= totalPages"
          class="px-3 py-1 rounded text-sm border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800"
          @click="$emit('page-change', currentPage + 1)"
        >Suiv</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, unknown>">
import { ref } from 'vue'

export interface Column {
  key: string
  label: string
  sortable?: boolean
}

const props = withDefaults(defineProps<{
  columns: Column[]
  rows: T[]
  rowKey?: string
  total?: number
  currentPage?: number
  pageSize?: number
  emptyText?: string
}>(), {
  total: 0,
  currentPage: 1,
  pageSize: 20,
  emptyText: 'Aucun résultat',
})

const emit = defineEmits<{
  (e: 'row-click', row: T): void
  (e: 'page-change', page: number): void
  (e: 'sort-change', key: string, dir: 'asc' | 'desc'): void
}>()

const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')

const totalPages = ref(Math.ceil((props.total || props.rows.length) / props.pageSize))

function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
  emit('sort-change', sortKey.value, sortDir.value)
}
</script>
