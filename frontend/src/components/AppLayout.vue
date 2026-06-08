<template>
  <div class="flex h-screen overflow-hidden" style="background-color: var(--bg-base)">
    <AppSidebar />
    <div class="flex flex-col flex-1 overflow-hidden">
      <AppTopbar />
      <main class="flex-1 overflow-y-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { RouterView } from 'vue-router'
  import AppSidebar from './AppSidebar.vue'
  import AppTopbar from './AppTopbar.vue'
</script>
