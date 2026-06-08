<template>
  <!-- TODO Phase 1: colored badge per stage code -->
  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
    {{ stage }}
  </span>
</template>
<script setup lang="ts">
  defineProps<{ stage: string }>()
</script>
