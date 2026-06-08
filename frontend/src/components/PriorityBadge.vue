<template>
  <!-- TODO Phase 1: colored badge per priority -->
  <span
    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
    :class="{
      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400': priority === 'urgent',
      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400': priority === 'normal',
      'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400': priority === 'faible',
    }"
  >
    {{ priority }}
  </span>
</template>
<script setup lang="ts">
  defineProps<{ priority: string }>()
</script>
