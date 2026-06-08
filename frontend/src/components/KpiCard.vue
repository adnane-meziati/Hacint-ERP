<template>
  <div
    class="rounded-xl border p-5 flex flex-col gap-2"
    :class="colorClass"
  >
    <p class="text-xs font-medium uppercase tracking-wide opacity-70">{{ label }}</p>
    <p class="text-3xl font-bold">{{ value }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  value: number | string
  color?: string
}>(), { color: 'blue' })

const colorClass = computed(() => {
  const map: Record<string, string> = {
    blue:   'bg-blue-50   dark:bg-blue-900/20  border-blue-200   dark:border-blue-800   text-blue-800   dark:text-blue-200',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200',
    green:  'bg-green-50  dark:bg-green-900/20  border-green-200  dark:border-green-800  text-green-800  dark:text-green-200',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
    red:    'bg-red-50    dark:bg-red-900/20    border-red-200    dark:border-red-800    text-red-800    dark:text-red-200',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200',
    gray:   'bg-gray-50   dark:bg-gray-900/40   border-gray-200   dark:border-gray-700   text-gray-700   dark:text-gray-300',
  }
  return map[props.color] ?? map.blue
})
</script>
